#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess,urllib.request,urllib.error
p=Path('/opt/kws/supabase/runtime')
env=dict(line.split('=',1) for line in (p/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
def status(path,key=None):
    req=urllib.request.Request('http://127.0.0.1:8000'+path,headers={'apikey':key} if key else {})
    try:
        with urllib.request.urlopen(req,timeout=20) as r: return r.status
    except urllib.error.HTTPError as e:
        if path=='/rest/v1/' and key:
            try:
                error=json.load(e)
                print(json.dumps({'rest_error_code':error.get('code'),'rest_error_message':error.get('message')}))
            except (ValueError,TypeError): pass
        return e.code
checks={'rest_schema_with_service':status('/rest/v1/',env['SERVICE_ROLE_KEY']),
        'rest_schema_with_anon':status('/rest/v1/',env['ANON_KEY']),
        'rest_missing_table_with_anon':status('/rest/v1/__kws_migration_probe__',env['ANON_KEY']),
        'rest_without_key':status('/rest/v1/'),
        'auth_health':status('/auth/v1/health',env['ANON_KEY'])}
print(json.dumps(checks))
assert checks['rest_schema_with_service']==200 and checks['auth_health']==200
assert checks['rest_schema_with_anon']==403 and checks['rest_missing_table_with_anon']==404
assert checks['rest_without_key'] in (401,403)
config=json.loads(subprocess.check_output(['docker','compose','-f','docker-compose.yml','-f','docker-compose.local.yml','config','--format','json'],cwd=p))
assert all(x.get('host_ip')=='127.0.0.1' for s in config['services'].values() for x in s.get('ports',[]))
data=subprocess.check_output(['docker','compose','-f','docker-compose.yml','-f','docker-compose.local.yml','exec','-T','db','psql','-U','postgres','-d','postgres','-Atc',"SELECT version(); SELECT count(*) FROM auth.users;"],cwd=p,text=True)
lines=data.strip().splitlines()
checks['postgres_version']=lines[0]
checks['auth_users']=int(lines[1])
checks['public_port_bindings']=0
print(json.dumps(checks))
PY
ufw status
sshd -T | awk '/^(permitrootlogin|passwordauthentication|pubkeyauthentication|kbdinteractiveauthentication) /'
df -h /
