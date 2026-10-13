"""Operator-only erasure. Default is a private plan, never a deletion.

Review the plan locally on the VPS. Shared hall records, business ownership,
unknown legacy media and active jobs stop execution; resolve them first. The
authenticated in-app request supplies consent, not an arbitrary user ID.
"""
from pathlib import Path
import argparse, datetime, email.message, hashlib, json, os, re, shutil, smtplib, socket, ssl, subprocess, urllib.parse, urllib.request

UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', re.I)
VIDEO = Path('/opt/kws/video-production/data')
CDN = Path('/opt/kws/web-production/media')
PRIVATE = Path('/var/lib/kws-account-deletion')

def safe_path(root, relative):
    root = Path(root)
    if root.is_symlink(): raise ValueError('Symlink in managed root')
    root = root.resolve()
    relative = Path(relative)
    if relative.is_absolute() or '..' in relative.parts or not relative.parts:
        raise ValueError('Unsafe media path')
    result = root / relative
    for ancestor in [result, *result.parents]:
        if ancestor == root: break
        if ancestor.is_symlink(): raise ValueError('Symlink in media path')
    if not result.resolve().is_relative_to(root): raise ValueError('Media outside managed root')
    return result

def strings(value):
    if isinstance(value, str): yield value
    elif isinstance(value, list):
        for item in value: yield from strings(item)
    elif isinstance(value, dict):
        for item in value.values(): yield from strings(item)

def digest(plan):
    return hashlib.sha256(json.dumps(plan, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def media_identity(url):
    parsed = urllib.parse.urlsplit(url)
    return (parsed.hostname, urllib.parse.unquote(parsed.path))

def main():
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594', 'Wrong host or operator'
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('--request', required=True)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--confirmed-plan-sha256')
    args = parser.parse_args()
    assert UUID.fullmatch(args.request), 'Invalid request ID'
    PRIVATE.mkdir(mode=0o700, exist_ok=True)
    diagnostic = PRIVATE / 'operator.log'
    client = ['docker', 'exec', '-i', 'supabase-db', 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
    def sql(query):
        with diagnostic.open('ab') as log:
            return subprocess.check_output(client, input=query.encode(), stderr=log).decode().strip()
    def rows(query): return json.loads(sql(query))
    request = rows("SELECT row_to_json(r) FROM public.account_deletion_requests r WHERE id='" + args.request + "';")
    assert request, 'Unknown deletion request'
    notice = PRIVATE / (args.request + '.notice.json')
    if request['status'] == 'completed':
        assert notice.exists(), 'Already complete; no pending confirmation email'
        plan = json.loads(notice.read_text())
        if not args.execute:
            print('ACCOUNT_COMPLETE_CONFIRMATION_PENDING; rerun with --execute to retry SMTP only')
            return
    else:
        owner = request['user_id']; assert UUID.fullmatch(owner or ''), 'Missing account'
        user = rows("SELECT row_to_json(u) FROM (SELECT id,email,raw_user_meta_data FROM auth.users WHERE id='" + owner + "') u;")
        assert user, 'Missing account'
        objects = rows("SELECT coalesce(json_agg(json_build_object('bucket',bucket_id,'name',name,'owner',owner_id,'uuid_owner',owner)), '[]') FROM storage.objects;")
        records = []
        tables = rows("SELECT json_agg(tablename) FROM pg_tables WHERE schemaname='public' AND tablename <> 'account_deletion_requests';")
        for table in tables:
            assert re.fullmatch('[a-zA-Z0-9_]+', table)
            records.extend((table, row) for row in rows('SELECT coalesce(json_agg(t),\'[]\') FROM public."' + table + '" t;'))
        owned = [(table, row) for table, row in records if row.get('user_id') == owner or (table in ('profiles', 'users') and row.get('id') == owner) or (table == 'feedback' and str(row.get('user_email', '')).lower() == user['email'].lower())]
        owned_urls = {value for _, row in owned for value in strings(row) if value.startswith('https://')}
        owned_urls.update(value for value in strings(user['raw_user_meta_data']) if value.startswith('https://'))
        selected = [obj for obj in objects if owner in (obj['owner'], obj['uuid_owner'])]
        unknown = []
        for obj in objects:
            suffix = '/storage/v1/object/public/' + obj['bucket'] + '/' + obj['name']
            if any(urllib.parse.unquote(urllib.parse.urlsplit(url).path) == suffix for url in owned_urls) and obj not in selected:
                unknown.append({'bucket': obj['bucket'], 'name': obj['name']})
        video_files, video_dirs, video_urls, active = set(), set(), set(), 0
        for name in ('jobs', 'temp'):
            for path in (VIDEO / name).rglob('*.json'):
                if path.is_symlink(): raise ValueError('Symlink in video metadata')
                item = json.loads(path.read_text())
                if item.get('owner_id') != owner: continue
                safe_path(VIDEO, path.relative_to(VIDEO))
                video_files.add(str(path.relative_to(VIDEO)))
                video_urls.update(value for value in strings(item.get('urls') or item.get('response') or {}) if value.startswith('https://'))
                if name == 'jobs':
                    if item.get('status') in ('reserved', 'queued', 'processing'): active += 1
                    if item.get('base_name') and item.get('sector'):
                        for family in ('_hd.mp4', '_sd.mp4', '_low.mp4', '.ready.json', '.claim.json'):
                            filename = ('.' if family.startswith('.') else '') + item['base_name'] + family
                            target = safe_path(VIDEO, Path('final') / item['sector'] / filename)
                            if target.exists(): video_files.add(str(target.relative_to(VIDEO)))
                    stage = safe_path(VIDEO, Path('staging') / item['job_id'])
                    if stage.exists(): video_dirs.add(str(stage.relative_to(VIDEO)))
                elif path.name == 'manifest.json': video_dirs.add(str(path.parent.relative_to(VIDEO)))
        for path in (VIDEO / 'final').rglob('.*.owner.json'):
            safe_path(VIDEO, path.relative_to(VIDEO))
            if json.loads(path.read_text()).get('owner_id') == owner:
                target = safe_path(VIDEO, path.parent.relative_to(VIDEO) / path.name[1:-len('.owner.json')])
                video_files.update(str(p.relative_to(VIDEO)) for p in (path, target) if p.exists())
                video_urls.add('https://video.kletterwelt-sauerland.de/videos/' + str(target.relative_to(VIDEO / 'final')).replace(os.sep, '/'))
        # Missing immutable metadata means ownership cannot be safely inferred
        # from a filename. An operator must resolve legacy uploads explicitly.
        known_sessions = set()
        for path in (VIDEO / 'jobs').glob('*.json'):
            item = json.loads(path.read_text())
            if item.get('owner_id') == owner: known_sessions.add(item.get('session_id'))
        legacy_uploads = sum(1 for table, row in owned if table == 'upload_logs' and row.get('status') == 'completed' and row.get('session_id') not in known_sessions)
        storage_urls = {'https://beta-api.kletterwelt-sauerland.de/storage/v1/object/public/' + obj['bucket'] + '/' + obj['name'] for obj in selected}
        media_urls = {media_identity(url) for url in video_urls | storage_urls}
        shared_refs = [(table, str(row.get('id', 'record'))) for table, row in records if (table, row) not in owned and any(media_identity(value) in media_urls for value in strings(row) if value.startswith('https://'))]
        business = sum(1 for table, row in records if table in ('clients', 'projects', 'tasks', 'task_comments') and row.get('created_by') == owner)
        cdn_refs = [url for url in owned_urls if url.startswith('https://beta.kletterwelt-sauerland.de/migrated-cdn/')]
        plan = {'request_id': args.request, 'user_id': owner, 'email': user['email'], 'storage': sorted(selected, key=lambda x: (x['bucket'], x['name'])), 'video_files': sorted(video_files), 'video_dirs': sorted(video_dirs),
                'blockers': {'active_jobs': active, 'business_records': business, 'shared_media_references': len(shared_refs), 'legacy_uploads': legacy_uploads, 'unverified_storage_references': len(unknown), 'legacy_cdn_references': len(cdn_refs)}, 'shared_records': shared_refs}
        sha = digest(plan)
        private_plan = PRIVATE / (args.request + '.plan.json')
        private_plan.write_text(json.dumps(plan, indent=2) + '\n')
        print(json.dumps({'request': args.request, 'storage_files': len(selected), 'video_files': len(video_files), 'blockers': plan['blockers'], 'plan_sha256': sha, 'private_plan': str(private_plan)}))
        if not args.execute: return
        assert args.confirmed_plan_sha256 == sha, 'Plan changed or not confirmed'
        assert not any(plan['blockers'].values()), 'Resolve all protected-plan blockers before erasure'
        # The video API caches authentication for 60 seconds. Quiescing it also
        # prevents a new job from recreating files after the ownership scan.
        with diagnostic.open('ab') as log:
            video_state = json.loads(subprocess.check_output(['docker', 'inspect', 'kws-video-production'], stderr=log))[0]
        assert video_state['State']['Running'] is False, 'Stop video uploads for this short maintenance operation first'

    runtime = dict(line.split('=', 1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
    with diagnostic.open('ab') as log:
        auth_config = json.loads(subprocess.check_output(['docker', 'inspect', 'supabase-auth'], stderr=log))[0]
    auth = dict(line.split('=', 1) for line in auth_config['Config']['Env'])
    def api(route, method, payload):
        # SQL above reads the production database. Auth and Storage must use
        # that same backend; 9090 belongs to the isolated migration probe.
        req = urllib.request.Request('http://127.0.0.1:9082' + route, data=json.dumps(payload).encode(), headers={'apikey': runtime['ANON_KEY'], 'Authorization': 'Bearer ' + runtime['SERVICE_ROLE_KEY'], 'Content-Type': 'application/json'}, method=method)
        with urllib.request.urlopen(req, timeout=30) as response: return response.read()
    if request['status'] != 'completed':
        # Persist the minimal restore tombstone and completion recipient before
        # any irreversible step, so crashes cannot lose erasure history.
        notice.write_text(json.dumps({'request_id': args.request, 'user_id': plan['user_id'], 'email': plan['email']}) + '\n')
        ledger = PRIVATE / (args.request + '.tombstone.json')
        ledger.write_text(json.dumps({'request_id': args.request, 'user_id': plan['user_id'], 'deletion_requested_at': request['requested_at']}) + '\n')
        # Ban new sign-ins before removing files; final DB erasure invalidates
        # live user lookups and the restrictive Storage policy blocks old JWTs.
        api('/auth/v1/admin/users/' + plan['user_id'], 'PUT', {'ban_duration': '876000h'})
        sql("UPDATE public.account_deletion_requests SET status='processing' WHERE id='" + args.request + "';")
        for obj in plan['storage']:
            api('/storage/v1/object/' + urllib.parse.quote(obj['bucket'], safe=''), 'DELETE', {'prefixes': [obj['name']]})
        for relative in plan['video_files']:
            path = safe_path(VIDEO, relative)
            if path.exists(): path.unlink()
        for relative in plan['video_dirs']:
            path = safe_path(VIDEO, relative)
            if path.exists(): shutil.rmtree(path)
        # A crash leaves processing pending; rerun a fresh plan. No fake success.
        result = rows("SELECT public.kws_finish_account_deletion('" + args.request + "');")
        assert result.get('completed') is True, 'Database erasure not confirmed'
        ledger.write_text(json.dumps({'request_id': args.request, 'user_id': plan['user_id'], 'deleted_at': datetime.datetime.now(datetime.timezone.utc).isoformat()}) + '\n')
        (PRIVATE / (args.request + '.plan.json')).unlink(missing_ok=True)
    message = email.message.EmailMessage()
    message['From'] = 'Kletterwelt Sauerland <' + auth['GOTRUE_SMTP_ADMIN_EMAIL'] + '>'
    message['To'] = plan['email']
    message['Reply-To'] = 'marketing@kletterwelt-sauerland.de'
    message['Subject'] = 'Dein Kletterwelt-App-Konto wurde gelöscht'
    message.set_content('Dein Konto in der Kletterwelt-App und die zugehörigen persönlichen Daten und Dateien wurden gelöscht.\n\nBei Fragen erreichst du uns unter marketing@kletterwelt-sauerland.de.\n\nKletterwelt Sauerland\n')
    port = int(auth.get('GOTRUE_SMTP_PORT', '587'))
    connection = smtplib.SMTP_SSL(auth['GOTRUE_SMTP_HOST'], port, context=ssl.create_default_context(), timeout=30) if port == 465 else smtplib.SMTP(auth['GOTRUE_SMTP_HOST'], port, timeout=30)
    with connection:
        if port != 465: connection.starttls(context=ssl.create_default_context())
        connection.login(auth['GOTRUE_SMTP_USER'], auth['GOTRUE_SMTP_PASS'])
        connection.send_message(message)
    notice.unlink()
    print('ACCOUNT_ERASED_AND_CONFIRMATION_ACCEPTED_BY_SMTP')

if __name__ == '__main__':
    try: main()
    except Exception as error:
        # Never print API responses, email addresses or credentials.
        print('ACCOUNT_DELETION_STOPPED: ' + type(error).__name__ + '. Inspect the private plan and operator diagnostics.')
        raise SystemExit(1)
