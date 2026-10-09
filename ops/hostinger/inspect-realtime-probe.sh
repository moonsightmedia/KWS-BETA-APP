#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import base64,hashlib,hmac,json,subprocess,time,urllib.request,urllib.error
info=json.loads(subprocess.check_output(['docker','inspect','realtime-dev.supabase-realtime']))[0]
env=dict(line.split('=',1) for line in info['Config']['Env'])
print(json.dumps({'realtime_settings':{k:v for k,v in env.items() if k in ('PORT','DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_AFTER_CONNECT_QUERY','SEED_SELF_HOST','SELF_HOST_TENANT_NAME')},'env_keys':sorted(env)}))
ip=info['NetworkSettings']['Networks']['supabase_default']['IPAddress']
def enc(value):return base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=').decode()
token=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'role':'service_role','exp':int(time.time())+300,'iss':'supabase'})
token+='.'+base64.urlsafe_b64encode(hmac.new(env['API_JWT_SECRET'].encode(),token.encode(),hashlib.sha256).digest()).rstrip(b'=').decode()
req=urllib.request.Request('http://'+ip+':'+env.get('PORT','4000')+'/api/tenants/realtime-dev',headers={'Authorization':'Bearer '+token})
work=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
try:
    with urllib.request.urlopen(req,timeout=15) as r: data=json.load(r);status=r.status
    (work/'realtime-tenant-source.json').write_text(json.dumps(data))
    data=data.get('data',data)
    print(json.dumps({'tenant_api_status':status,'keys':sorted(data),'extensions':[{'type':x.get('type'),'setting_keys':sorted(x.get('settings',{}))} for x in data.get('extensions',[])]}))
except urllib.error.HTTPError as e:print(json.dumps({'tenant_api_status':e.code}))
PY
