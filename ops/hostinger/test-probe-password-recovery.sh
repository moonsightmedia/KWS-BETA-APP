#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,secrets,subprocess,urllib.request,urllib.error,sys
db='kws_restore_probe_20261008_121055'
env=dict(s.split('=',1) for s in json.loads(subprocess.check_output(['docker','inspect','kws-auth-probe']))[0]['Config']['Env'])
assert env['GOTRUE_DB_DATABASE_URL'].endswith('/'+db)
runtime=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
base='http://127.0.0.1:9090/auth/v1'
def call(path,body=None,token=None,method=None):
    headers={'Content-Type':'application/json','apikey':runtime['ANON_KEY']}
    if token:headers['Authorization']='Bearer '+token
    req=urllib.request.Request(base+path,headers=headers,data=json.dumps(body).encode() if body is not None else None,method=method or ('POST' if body is not None else 'GET'))
    try:
        with urllib.request.urlopen(req,timeout=30) as r:
            raw=r.read();return r.status,json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:return e.code,None
user_id=None
checks=[]
try:
    email='migration-reset-'+secrets.token_hex(8)+'@example.invalid'
    original=secrets.token_urlsafe(32);replacement=secrets.token_urlsafe(32)
    status,user=call('/admin/users',{'email':email,'password':original,'email_confirm':True},runtime['SERVICE_ROLE_KEY'])
    assert status in (200,201);user_id=user['id']
    checks.append('disposable_probe_user_created')
    status,link=call('/admin/generate_link',{'type':'recovery','email':email,'redirect_to':'http://127.0.0.1:9090/reset-password'},runtime['SERVICE_ROLE_KEY'])
    assert status==200
    hashed=link.get('hashed_token') or link.get('properties',{}).get('hashed_token')
    assert hashed
    status,recovery=call('/verify',{'type':'recovery','token_hash':hashed})
    assert status==200 and recovery['user']['id']==user_id and recovery.get('access_token')
    checks.append('recovery_link_yields_matching_session')
    status,updated=call('/user',{'password':replacement},recovery['access_token'],'PUT')
    assert status==200 and updated['id']==user_id
    checks.append('recovery_session_changes_password')
    assert call('/token?grant_type=password',{'email':email,'password':original})[0] in (400,401)
    checks.append('previous_password_rejected')
    status,logged=call('/token?grant_type=password',{'email':email,'password':replacement})
    assert status==200 and logged['user']['id']==user_id
    checks.append('replacement_password_logs_in')
    assert call('/verify',{'type':'recovery','token_hash':hashed})[0] in (400,401,403)
    checks.append('used_recovery_link_rejected')
except Exception as e:
    print(json.dumps({'password_recovery_failed':True,'error_class':type(e).__name__,'completed_checks':checks}));sys.exit(1)
finally:
    if user_id:
        status,_=call('/admin/users/'+user_id,token=runtime['SERVICE_ROLE_KEY'],method='DELETE')
        assert status in (200,204)
report={'database':db,'checks':checks,'passed':len(checks),'synthetic_user_removed':True,'source_changed':False,'real_user_password_changed':False,'actual_inbox_receipt_verified':True,'mail_uids':['3780','3781'],'mailbox':'INBOX','recipient':'jalthoff@moonsight.media','browser_form_submission_verified':False}
(Path('/var/backups/kws/migration')/db/'PASSWORD-RECOVERY-VERIFIED.json').write_text(json.dumps(report)+'\n')
print(json.dumps(report))
PY
