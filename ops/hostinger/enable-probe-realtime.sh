#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import base64,hashlib,hmac,json,re,subprocess,time,urllib.request,urllib.error
work=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
assert (work/'API-VERIFIED.json').is_file()
info=json.loads(subprocess.check_output(['docker','inspect','realtime-dev.supabase-realtime']))[0]
env=dict(line.split('=',1) for line in info['Config']['Env'])
config=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
ip=info['NetworkSettings']['Networks']['supabase_default']['IPAddress']
def enc(value):return base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=').decode()
token=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'role':'service_role','exp':int(time.time())+300,'iss':'supabase'})
token+='.'+base64.urlsafe_b64encode(hmac.new(env['API_JWT_SECRET'].encode(),token.encode(),hashlib.sha256).digest()).rstrip(b'=').decode()
origin='http://'+ip+':'+env.get('PORT','4000')
def api(path,body=None,method=None):
    req=urllib.request.Request(origin+path,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=json.dumps(body).encode() if body is not None else None,method=method)
    with urllib.request.urlopen(req,timeout=30) as r:return r.status,json.load(r)
db=json.loads((work/'DATA-VERIFIED.json').read_text())['database']
# GET returns encrypted connection fields. Never feed those ciphertexts back
# as cleartext connection settings; construct the private connection explicitly.
assert env['DB_PASSWORD']==config['POSTGRES_PASSWORD']
source=json.loads((work/'realtime-tenant-source.json').read_text());source=source.get('data',source)
extensions=source['extensions'];settings=extensions[0]['settings']
settings.update(db_host=env['DB_HOST'],db_name=db,db_port=env['DB_PORT'],db_user=env['DB_USER'],db_password=env['DB_PASSWORD'],slot_name='kws_probe_realtime',ssl_enforced=False)
payload={'tenant':{'external_id':'realtime-probe','name':'Private KWS migration probe','jwt_secret':config['JWT_SECRET'],'extensions':extensions}}
try:
    status,present=api('/api/tenants/realtime-probe',payload,'PUT')
except urllib.error.HTTPError as failure:
    body=failure.read();(work/'realtime-create-error.json').write_bytes(body)
    print(json.dumps({'realtime_create_status':failure.code,'diagnostic_bytes':len(body)}));raise SystemExit(1)
assert status in (200,201)
path=Path('/opt/kws/probe-web/Caddyfile')
text=path.read_text()
if 'header_up Host realtime-probe.localhost' not in text:
    before=work/'Caddyfile.before-realtime';assert not before.exists()
    before.write_text(text)
    anchor='  @unsupported path /realtime/* /functions/* /disabled-legacy-upload*'
    assert text.count(anchor)==1
    text=text.replace(anchor,'  handle_path /realtime/v1/* {\n    @websocket path /websocket\n    rewrite @websocket /socket/websocket\n    reverse_proxy realtime-dev.supabase-realtime:4000 {\n      header_up Host realtime-probe.localhost\n    }\n  }\n  @unsupported path /functions/* /disabled-legacy-upload*')
    path.write_text(text)
elif '@websocket path /websocket' not in text:
    text=text.replace('  handle_path /realtime/v1/* {','  handle_path /realtime/v1/* {\n    @websocket path /websocket\n    rewrite @websocket /socket/websocket')
    path.write_text(text)
with (work/'realtime-start.log').open('wb') as log:
    subprocess.run(['docker','exec','kws-probe-web-caddy-1','caddy','validate','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'],stdout=log,stderr=log,check=True)
    subprocess.run(['docker','exec','kws-probe-web-caddy-1','caddy','reload','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'],stdout=log,stderr=log,check=True)
(work/'REALTIME-PREPARED.json').write_text(json.dumps({'database':db,'tenant':'realtime-probe','public':False,'subscription_verified':False}))
print(json.dumps({'probe_realtime_tenant':True,'gateway_config_valid':True,'source_changed':False,'subscription_verified':False}))
PY
