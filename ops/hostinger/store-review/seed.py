#!/usr/bin/env python3
"""Import schema only, then generate wholly synthetic store-review accounts/data."""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import urllib.request
import uuid

ROOT = Path('/opt/kws/store-review')
DB = 'kws-store-review-db'


def sql(query, container=DB):
    result = subprocess.run(['docker', 'exec', '-i', container, 'psql', '-U', 'supabase_admin',
                             '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'],
                            input=query, text=True, capture_output=True)
    if result.returncode:
        (ROOT / 'seed-error.log').write_text(result.stderr)
        raise RuntimeError('SQL failed; protected seed-error.log contains diagnostics')
    return result.stdout.strip()


def request(base, env, path, payload=None, token=None, method=None):
    req = urllib.request.Request(base + path,
        data=None if payload is None else json.dumps(payload).encode(),
        headers={'apikey': env['ANON_KEY'], 'Authorization': 'Bearer ' + (token or env['SERVICE_ROLE_KEY']),
                 'Content-Type': 'application/json'}, method=method)
    with urllib.request.urlopen(req, timeout=20) as response:
        data = response.read()
        return json.loads(data) if data else None


def bind_review_video_origin():
    definition = sql("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='sync_boulder_video_job';")
    if 'https://video' in definition:
        assert definition.count('https://video') == 3
        sql(definition.replace('https://video', 'https://review-video'))
        sql("NOTIFY pgrst, 'reload schema';")


def enable_review_realtime():
    tables = json.loads(sql("SELECT coalesce(json_agg(tablename),'[]') FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public';", 'supabase-db'))
    present = json.loads(sql("SELECT coalesce(json_agg(tablename),'[]') FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public';"))
    for table in tables:
        assert table.replace('_','').isalnum()
        if table not in present:
            sql('ALTER PUBLICATION supabase_realtime ADD TABLE public."'+table+'";')


def main():
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    os.umask(0o077)
    assert json.loads((ROOT / 'PREPARED.json').read_text())['network_isolated']
    config = json.loads((ROOT / 'compose.json').read_text())
    assert config['name'] == 'kws-store-review'
    done = ROOT / 'SEEDED.json'
    if done.exists():
        bind_review_video_origin()
        enable_review_realtime()
        print(done.read_text())
        return
    # Read-only metadata export; --schema-only is essential. No source data export.
    if not (ROOT / 'SCHEMA-IMPORTED.json').exists():
        assert sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public';") == '0'
        archive = ROOT / 'schema-only.dump'
        with archive.open('wb') as output:
            subprocess.run(['docker', 'exec', 'supabase-db', 'pg_dump', '-U', 'supabase_admin',
                '-d', 'postgres', '--schema-only', '--schema=public', '--format=custom'], stdout=output, check=True)
        # Keep schema privileges but omit the already existing public schema declaration.
        with archive.open('rb') as source:
            listing = subprocess.check_output(['docker', 'exec', '-i', DB, 'pg_restore', '--list'], stdin=source, text=True)
        selected = '\n'.join(line for line in listing.splitlines()
            if not (' SCHEMA - public ' in line or ' COMMENT - SCHEMA public ' in line)) + '\n'
        (ROOT / 'schema.list').write_text(selected)
        subprocess.run(['docker', 'cp', str(ROOT / 'schema.list'), DB + ':/tmp/review-schema.list'], check=True)
        with archive.open('rb') as source, (ROOT / 'schema-restore.log').open('w') as log:
            subprocess.run(['docker', 'exec', '-i', DB, 'pg_restore', '-U', 'supabase_admin', '-d', 'postgres',
                '--no-owner', '--single-transaction', '--exit-on-error', '--use-list=/tmp/review-schema.list'],
                stdin=source, stdout=log, stderr=log, check=True)
        # The app's Auth triggers are schema, not copied user records.
        trigger_sql = sql("SELECT pg_get_triggerdef(t.oid)||';' FROM pg_trigger t "
            "JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace "
            "WHERE n.nspname='auth' AND c.relname='users' AND NOT t.tgisinternal;", 'supabase-db')
        if trigger_sql:
            sql(trigger_sql)
        assert sql('SELECT count(*) FROM auth.users;') == '0'
        # Every application table must still be empty at this point.
        empty = sql("SELECT coalesce(sum(n_live_tup),0) FROM pg_stat_user_tables WHERE schemaname='public';")
        assert empty == '0'
        (ROOT / 'SCHEMA-IMPORTED.json').write_text(json.dumps({'schema_only': True, 'source_rows_copied': 0}) + '\n')
    env = dict(line.split('=', 1) for line in (ROOT / '.env').read_text().splitlines() if '=' in line)
    # Preserve the strict three-rendition check, bound to the demo video origin.
    bind_review_video_origin()
    enable_review_realtime()
    net = json.loads(subprocess.check_output(['docker', 'inspect', 'kws-store-review-api-gw']))[0]['NetworkSettings']['Networks']
    base = 'http://' + net['kws-store-review-private']['IPAddress'] + ':8000'
    credentials_file = ROOT / 'review-accounts.json'
    if credentials_file.exists():
        accounts = json.loads(credentials_file.read_text())
    else:
        accounts = [{'role': role, 'email': role + '@review.kws.invalid', 'password': secrets.token_urlsafe(24)}
                    for role in ['customer', 'setter', 'admin', 'other']]
        credentials_file.write_text(json.dumps(accounts) + '\n')
        credentials_file.chmod(0o600)
    # Reserved invalid domain; these are not real people or deliverable mailboxes.
    for account in accounts:
        if not account.get('id'):
            response = request(base, env, '/auth/v1/admin/users', {
                'email': account['email'], 'password': account['password'], 'email_confirm': True,
                'user_metadata': {'first_name': 'Demo', 'last_name': account['role'], 'birth_date': '1990-01-01'}})
            account['id'] = response['id']
            credentials_file.write_text(json.dumps(accounts) + '\n')
        role = 'user' if account['role'] in ['customer', 'other'] else account['role']
        user = str(uuid.UUID(account['id']))
        sql("INSERT INTO public.user_roles(user_id,role) VALUES ('" + user + "','" + role + "') ON CONFLICT DO NOTHING;")
    # Synthetic hall, colours, boulders and relationships; never copy live records.
    fixture = (ROOT / 'synthetic-data.sql').read_text()
    for account in accounts:
        fixture = fixture.replace('{{' + account['role'] + '}}', str(uuid.UUID(account['id'])))
    assert '{{' not in fixture
    sql('BEGIN;\n' + fixture + '\nCOMMIT;')
    sql("NOTIFY pgrst, 'reload schema';")
    for account in accounts:
        response = request(base, env, '/auth/v1/token?grant_type=password',
            {'email': account['email'], 'password': account['password']})
        assert response['user']['id'] == account['id']
    count = int(sql('SELECT count(*) FROM auth.users;'))
    assert count == len(accounts), 'Unexpected review users'
    proof = {'schema_only': True, 'source_rows_copied': 0, 'synthetic_users': count,
             'synthetic_boulders': int(sql('SELECT count(*) FROM public.boulders;')),
             'all_seed_logins_verified': True, 'public_routing_enabled': False,
             'production_roles_changed': False, 'production_data_changed': False}
    done.write_text(json.dumps(proof) + '\n')
    print(json.dumps(proof))


if __name__ == '__main__':
    main()
