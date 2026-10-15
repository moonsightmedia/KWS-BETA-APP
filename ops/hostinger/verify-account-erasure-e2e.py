"""Real production Auth/Storage/SQL erasure of generated disposable accounts.

No existing account is selected. Mail goes only to a loopback TLS capture
server configured for this operator invocation; production SMTP is unchanged.
The production video API is briefly stopped only if there are no active jobs.
"""
import ast, base64, contextlib, datetime, email.parser, hashlib, importlib.util
import io, json, os, pathlib, socket, socketserver, ssl, subprocess, sys, email.policy
import threading, urllib.error, urllib.request, uuid
from unittest.mock import patch

ROOT = pathlib.Path('/var/lib/kws-account-deletion')
API = 'http://127.0.0.1:9082'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNAAAAABJRU5ErkJggg==')

def main():
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    assert sys.argv[1:] == ['--execute'], 'Explicit disposable-test execution required'
    os.umask(0o077)
    tag = 'kws-erasure-qa-' + uuid.uuid4().hex
    work = ROOT / tag
    work.mkdir(mode=0o700)
    log = (work / 'private.log').open('ab')
    runtime = dict(line.split('=', 1) for line in pathlib.Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
    created = []
    paths = {}
    stopped = False
    stage = 'preflight'
    real_check_output = subprocess.check_output
    real_context = ssl.create_default_context
    server = None

    def sql(query):
        return real_check_output(['docker', 'exec', '-i', 'supabase-db', 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], input=query.encode(), stderr=log).decode().strip()

    def call(route, method='GET', data=None, token=None, content_type='application/json'):
        body = data if isinstance(data, bytes) else json.dumps(data).encode() if data is not None else None
        request = urllib.request.Request(API + route, data=body, method=method, headers={
            'apikey': runtime['ANON_KEY'], 'Authorization': 'Bearer ' + (token or runtime['SERVICE_ROLE_KEY']), 'Content-Type': content_type})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                result = response.read()
                return response.status, result
        except urllib.error.HTTPError as error:
            return error.code, error.read()

    def json_call(route, method='GET', data=None, token=None):
        status, body = call(route, method, data, token)
        assert 200 <= status < 300, 'Unexpected API status at ' + stage + ': ' + str(status)
        return json.loads(body or b'{}')

    def identities():
        return json.loads(sql("SELECT json_build_object('users',(SELECT coalesce(json_agg(id::text),'[]') FROM auth.users),'objects',(SELECT coalesce(json_agg(id::text),'[]') FROM storage.objects),'ticks',(SELECT coalesce(json_agg(id::text),'[]') FROM public.boulder_ticks));"))

    class Capture(socketserver.StreamRequestHandler):
        def handle(self):
            self.wfile.write(b'220 local-acceptance ESMTP\r\n'); self.wfile.flush()
            while True:
                line = self.rfile.readline()
                if not line: return
                verb = line.decode(errors='replace').split()[0].upper()
                if verb in ('EHLO', 'HELO'):
                    self.wfile.write(b'250-local-acceptance\r\n250-STARTTLS\r\n250 AUTH PLAIN\r\n')
                elif verb == 'STARTTLS':
                    self.wfile.write(b'220 Ready for TLS\r\n'); self.wfile.flush()
                    self.connection = tls.wrap_socket(self.connection, server_side=True)
                    self.rfile = self.connection.makefile('rb'); self.wfile = self.connection.makefile('wb')
                elif verb == 'AUTH': self.wfile.write(b'235 Authenticated test sender\r\n')
                elif verb in ('MAIL', 'RCPT', 'RSET', 'NOOP'): self.wfile.write(b'250 OK\r\n')
                elif verb == 'DATA':
                    self.wfile.write(b'354 End with dot\r\n'); self.wfile.flush()
                    data = []
                    while True:
                        part = self.rfile.readline()
                        if part in (b'.\r\n', b'.\n', b''): break
                        data.append(part[1:] if part.startswith(b'..') else part)
                    assert not (work / 'confirmation.eml').exists(), 'Duplicate notice'
                    (work / 'confirmation.eml').write_bytes(b''.join(data))
                    self.wfile.write(b'250 Captured only locally\r\n')
                elif verb == 'QUIT':
                    self.wfile.write(b'221 Bye\r\n'); self.wfile.flush(); return
                else: self.wfile.write(b'502 Unsupported\r\n')
                self.wfile.flush()

    try:
        operator_path = pathlib.Path('/opt/kws/release-readiness/account-deletion.py')
        assert hashlib.sha256(operator_path.read_bytes()).hexdigest() == '911347222c035f327cb801dc525ba8803f0d517df768870e1ad92131d94881f9'
        ast.parse(operator_path.read_bytes())
        assert call('/auth/v1/health')[0] == 200
        baseline = identities()
        active = sum(json.loads(p.read_text()).get('status') in ('reserved', 'queued', 'processing') for p in pathlib.Path('/opt/kws/video-production/data/jobs').glob('*.json'))
        assert active == 0, 'Do not interrupt active uploads'
        subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-keyout', str(work/'smtp.key'), '-out', str(work/'smtp.pem'), '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], check=True, stdout=log, stderr=log)
        tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        tls.load_cert_chain(work/'smtp.pem', work/'smtp.key')
        server = socketserver.TCPServer(('127.0.0.1', 0), Capture)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        stage = 'create-generated-accounts'
        for suffix in ('owner', 'foreign-control'):
            address = tag + '-' + suffix + '@example.invalid'
            password = uuid.uuid4().hex + uuid.uuid4().hex
            account = json_call('/auth/v1/admin/users', 'POST', {'email': address, 'password': password, 'email_confirm': True,
                'user_metadata': {'first_name': 'Synthetic', 'last_name': 'Erasure QA', 'full_name': 'Synthetic Erasure QA', 'birth_date': '1990-01-01', 'qa_purpose': tag}})
            uid = account['id']; assert str(uuid.UUID(uid)) == uid
            created.append({'id': uid, 'email': address, 'password': password})
            assert sql("SELECT count(*) FROM public.user_roles WHERE user_id='"+uid+"' AND role::text IN ('admin','setter');") == '0'
            session = json_call('/auth/v1/token?grant_type=password', 'POST', {'email': address, 'password': password}, runtime['ANON_KEY'])
            assert session['user']['id'] == uid
            created[-1]['token'] = session['access_token']
            name = uid + '/' + tag + '.png'; paths[uid] = name
            assert call('/storage/v1/object/profile-avatars/'+name, 'POST', PNG, session['access_token'], 'image/png')[0] in (200, 201)
        owner, foreign = created
        boulder = sql('SELECT id::text FROM public.boulders ORDER BY id LIMIT 1;')
        assert str(uuid.UUID(boulder)) == boulder
        for account in created:
            json_call('/rest/v1/boulder_ticks', 'POST', {'user_id':account['id'],'boulder_id':boulder,
                'status':'attempted','attempt_count':1,'is_favorite':True,'is_project':True,'note':tag}, account['token'])
        leaked = json_call('/rest/v1/boulder_ticks?user_id=eq.'+owner['id']+'&select=id',token=foreign['token'])
        assert leaked == [], 'Personal notes must remain private'
        stage = 'request-as-own-authenticated-user'
        request = json_call('/rest/v1/rpc/kws_request_account_deletion', 'POST', {}, owner['token'])
        again = json_call('/rest/v1/rpc/kws_request_account_deletion', 'POST', {}, owner['token'])
        assert request == again and request['status'] == 'pending'
        request_id = request['id']; assert str(uuid.UUID(request_id)) == request_id
        assert sql("SELECT user_id::text FROM public.account_deletion_requests WHERE id='"+request_id+"';") == owner['id']
        assert (datetime.datetime.fromisoformat(request['due_at'])-datetime.datetime.fromisoformat(request['requested_at'])).total_seconds() == 7*86400
        spec = importlib.util.spec_from_file_location('kws_real_operator', operator_path)
        operator = importlib.util.module_from_spec(spec); spec.loader.exec_module(operator)
        stage = 'private-plan'
        with patch.object(sys, 'argv', ['account-deletion.py', '--request', request_id]), contextlib.redirect_stdout(io.StringIO()): operator.main()
        plan = json.loads((ROOT/(request_id+'.plan.json')).read_text())
        assert plan['user_id'] == owner['id'] and not any(plan['blockers'].values())
        assert len(plan['storage']) == 1 and plan['storage'][0]['name'] == paths[owner['id']]
        assert not plan['video_files'] and not plan['video_dirs']
        stage = 'erase-generated-owner'
        # Stop the actual service, never bypass the operator's running-job guard.
        subprocess.run(['docker', 'stop', 'kws-video-production'], check=True, stdout=log, stderr=log)
        stopped = True
        with patch.object(sys, 'argv', ['account-deletion.py', '--request', request_id]), contextlib.redirect_stdout(io.StringIO()): operator.main()
        plan = json.loads((ROOT/(request_id+'.plan.json')).read_text())
        sha = operator.digest(plan)

        def inspect_for_test(command, *args, **kwargs):
            result = real_check_output(command, *args, **kwargs)
            if command == ['docker', 'inspect', 'supabase-auth']:
                config = json.loads(result)
                env = dict(item.split('=',1) for item in config[0]['Config']['Env'])
                env.update(GOTRUE_SMTP_HOST='127.0.0.1', GOTRUE_SMTP_PORT=str(server.server_address[1]), GOTRUE_SMTP_USER='acceptance-only', GOTRUE_SMTP_PASS='acceptance-only')
                config[0]['Config']['Env'] = [key+'='+value for key,value in env.items()]
                return json.dumps(config).encode()
            return result

        # Only this test process trusts its own loopback TLS certificate.
        with patch.object(operator.subprocess, 'check_output', inspect_for_test), \
             patch.object(operator.ssl, 'create_default_context', lambda **kw: real_context(cafile=str(work/'smtp.pem'))), \
             patch.object(sys, 'argv', ['account-deletion.py', '--request', request_id, '--execute', '--confirmed-plan-sha256', sha]), \
             contextlib.redirect_stdout(io.StringIO()) as output:
            operator.main()
        assert 'ACCOUNT_ERASED_AND_CONFIRMATION_ACCEPTED_BY_SMTP' in output.getvalue()
        subprocess.run(['docker', 'start', 'kws-video-production'], check=True, stdout=log, stderr=log)
        stopped = False
        stage = 'verify-erasure-and-mail'
        assert sql("SELECT count(*) FROM auth.users WHERE id='"+owner['id']+"';") == '0'
        for table, column in [('profiles','id'),('user_roles','user_id'),('boulder_ticks','user_id')]:
            assert sql("SELECT count(*) FROM public."+table+" WHERE "+column+"='"+owner['id']+"';") == '0'
        assert sql("SELECT count(*) FROM public.account_deletion_requests WHERE id='"+request_id+"' AND status='completed' AND user_id IS NULL;") == '1'
        assert call('/auth/v1/token?grant_type=password','POST',{'email':owner['email'],'password':owner['password']},runtime['ANON_KEY'])[0] in (400,401)
        assert call('/storage/v1/object/profile-avatars/'+paths[owner['id']],token=runtime['SERVICE_ROLE_KEY'])[0] in (400,404)
        forbidden = call('/storage/v1/object/profile-avatars/'+owner['id']+'/'+tag+'-after-delete.png','POST',PNG,owner['token'],'image/png')[0]
        assert forbidden in (400,401,403), 'Deleted JWT must not recreate media'
        assert call('/storage/v1/object/profile-avatars/'+paths[foreign['id']],token=foreign['token'])[1] == PNG
        current = identities()
        assert set(baseline['users']) <= set(current['users'])
        assert set(baseline['objects']) <= set(current['objects'])
        assert set(baseline['ticks']) <= set(current['ticks'])
        assert sql("SELECT count(*) FROM public.boulder_ticks WHERE user_id='"+foreign['id']+"';") == '1'
        notice = email.parser.BytesParser(policy=email.policy.default).parsebytes((work/'confirmation.eml').read_bytes())
        assert notice['To'] == owner['email'] and notice['Reply-To'] == 'marketing@kletterwelt-sauerland.de'
        assert 'Konto wurde gelöscht' in str(notice['Subject'])
        assert not (ROOT/(request_id+'.notice.json')).exists()
        stage = 'clean-foreign-control'
        json_call('/storage/v1/object/profile-avatars','DELETE',{'prefixes':[paths[foreign['id']]]})
        json_call('/auth/v1/admin/users/'+foreign['id'],'DELETE')
        final = identities()
        assert set(baseline['users']) <= set(final['users']) and set(baseline['objects']) <= set(final['objects']) and set(baseline['ticks']) <= set(final['ticks'])
        report = {'passed':True,'generated_test_accounts':2,'existing_accounts_preserved':len(baseline['users']),
                  'existing_storage_objects_preserved':len(baseline['objects']),'request_idempotent':True,
                  'production_auth_storage_sql_verified':True,'private_activity_removed':True,'foreign_private_activity_preserved':True,'private_notes_isolated':True,'deleted_login_rejected':True,'deleted_jwt_storage_rejected':True,
                  'foreign_test_media_preserved':True,'confirmation_captured_via_loopback_tls_smtp':True,
                  'external_mail_delivery_verified':False,'production_smtp_changed':False,'video_service_restarted':True,
                  'report_directory':str(work)}
        (work/'REPORT.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report))
    except BaseException as error:
        import traceback
        log.write(traceback.format_exc().encode()); log.flush()
        print(json.dumps({'passed':False,'stage':stage,'error_type':type(error).__name__,'protected_diagnostics':str(work),'generated_accounts_remaining_may_need_cleanup':True}))
        raise SystemExit(1)
    finally:
        if stopped:
            subprocess.run(['docker','start','kws-video-production'],check=True,stdout=log,stderr=log)
        if server: server.shutdown(); server.server_close()
        log.close()

if __name__ == '__main__': main()
