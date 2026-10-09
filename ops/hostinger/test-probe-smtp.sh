#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,secrets,subprocess,urllib.request,urllib.error,sys
db='kws_restore_probe_20261008_121055';recipient='jalthoff@moonsight.media'
work=Path('/var/backups/kws/migration')/db
env=dict(s.split('=',1) for s in json.loads(subprocess.check_output(['docker','inspect','kws-auth-probe']))[0]['Config']['Env'])
assert env['GOTRUE_DB_DATABASE_URL'].endswith('/'+db)
runtime=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
base='http://127.0.0.1:9090/auth/v1'
def call(path,body,admin=False):
    headers={'Content-Type':'application/json','apikey':runtime['ANON_KEY']}
    if admin:headers['Authorization']='Bearer '+runtime['SERVICE_ROLE_KEY']
    request=urllib.request.Request(base+path,headers=headers,data=json.dumps(body).encode() if body is not None else None,method='POST' if body is not None else 'GET')
    try:
        with urllib.request.urlopen(request,timeout=45) as r:
            raw=r.read();return r.status,json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:return e.code,None
try:
    status,data=call('/admin/users?page=1&per_page=1000',None,True);assert status==200
    user=next((u for u in data['users'] if u.get('email')==recipient),None)
    if not user:
        status,user=call('/admin/users',{'email':recipient,'password':secrets.token_urlsafe(32),'email_confirm':False,'user_metadata':{'full_name':'Private migration mail test'}},True)
        assert status in (200,201)
    # Only this disposable private probe changes. The clean candidate and source retain every original value.
    assert user and user['id']
    query="UPDATE auth.users SET email_confirmed_at=NULL WHERE id='"+user['id']+"'::uuid AND email='"+recipient+"';"
    with (work/'smtp-tests.log').open('ab') as log:
        subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stdout=log,stderr=log,check=True)
    confirmation=call('/resend',{'type':'signup','email':recipient,'options':{'email_redirect_to':'http://127.0.0.1:9090/auth/callback'}})[0]
    recovery=call('/recover?redirect_to=http%3A%2F%2F127.0.0.1%3A9090%2Freset-password',{'email':recipient})[0]
    report={'recipient':recipient,'confirmation_http_status':confirmation,'recovery_http_status':recovery,
            'source_changed':False,'clean_candidate_changed':False,'actual_inbox_receipt_verified':False,
            'test_links_use_private_local_tunnel':True}
    (work/'SMTP-SUBMISSION-VERIFIED.json').write_text(json.dumps(report)+'\n')
    print(json.dumps(report))
    assert confirmation==200 and recovery==200
except Exception as e:
    print(json.dumps({'smtp_test_failed':True,'error_class':type(e).__name__}));sys.exit(1)
PY
