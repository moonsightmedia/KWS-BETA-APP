#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,secrets,subprocess,urllib.request
db='kws_restore_probe_20261008_121055'
env=dict(s.split('=',1) for s in json.loads(subprocess.check_output(['docker','inspect','kws-auth-probe']))[0]['Config']['Env'])
assert env['GOTRUE_DB_DATABASE_URL'].endswith('/'+db)
runtime=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
record=Path('/var/backups/kws/migration')/db/'private-ui-account.json'
assert not record.exists(), 'UI account already created; do not generate another'
email='migration-ui-'+secrets.token_hex(8)+'@example.invalid';password=secrets.token_urlsafe(32)
req=urllib.request.Request('http://127.0.0.1:9090/auth/v1/admin/users',data=json.dumps({'email':email,'password':password,'email_confirm':True,'user_metadata':{'full_name':'Private Migration UI Test'}}).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+runtime['SERVICE_ROLE_KEY'],'apikey':runtime['ANON_KEY']})
with urllib.request.urlopen(req,timeout=30) as r:
 assert r.status in (200,201);user=json.load(r)
data={'database':db,'user_id':user['id'],'email':email,'password':password}
record.write_text(json.dumps(data)+'\n');record.chmod(0o600)
# Caller must capture this output to a protected file, never a tool log.
print(json.dumps(data))
PY
