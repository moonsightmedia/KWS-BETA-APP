#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import base64,json,shutil,subprocess
root=Path('/opt/kws/probe-functions'); root.mkdir(mode=0o700,exist_ok=True)
functions=root/'functions'; functions.mkdir(mode=0o700,exist_ok=True)
upstream=Path('/opt/kws/supabase/runtime/volumes/functions')
shutil.copytree(upstream/'main',functions/'main',dirs_exist_ok=True)
shutil.copy2(upstream/'deno.jsonc',functions/'deno.jsonc')
own=functions/'send-push-notification'; own.mkdir(mode=0o700,exist_ok=True)
for name in ('index','handler'):
    shutil.copy2('/home/kws-admin/kws-push-'+name+'.ts',own/(name+'.ts'))
inspect=json.loads(subprocess.check_output(['docker','inspect','supabase-edge-functions']))[0]
env=dict(s.split('=',1) for s in inspect['Config']['Env'])
env['SUPABASE_URL']='http://kws-probe-web-caddy-1:80'
env['VERIFY_JWT']='true'
integrations=json.loads(Path('/opt/kws/integrations/runtime.json').read_text())
env['FCM_SERVICE_ACCOUNT_JSON']=base64.b64encode(json.dumps(integrations['fcm_service_account']).encode()).decode()
env['FCM_PROJECT_ID']='kws-beta-app'
envfile=root/'runtime.env';envfile.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n');envfile.chmod(0o600)
existing=subprocess.run(['docker','inspect','kws-functions-probe'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
log=(root/'start.log').open('wb')
if existing.returncode==0:
    subprocess.run(['docker','restart','kws-functions-probe'],stdout=log,stderr=log,check=True)
else:
    subprocess.run(['docker','run','-d','--name','kws-functions-probe','--network','supabase_default',
      '--env-file',str(envfile),'-p','127.0.0.1:9995:9000','--cap-drop','ALL','--security-opt','no-new-privileges',
      '--memory','512m','--cpus','1','--log-driver','local','--log-opt','max-size=10m','--log-opt','max-file=3',
      '-v',str(functions)+':/home/deno/functions:ro',inspect['Config']['Image']]+inspect['Config']['Cmd'],stdout=log,stderr=log,check=True)
caddy=Path('/opt/kws/probe-web/Caddyfile');before=caddy.read_text()
if 'kws-functions-probe:9000' not in before:
    (root/'Caddyfile.before-functions').write_text(before)
    route='''  handle_path /functions/v1/* {
    @push path /send-push-notification
    handle @push {
      reverse_proxy kws-functions-probe:9000
    }
    handle {
      respond "Unknown function" 404
    }
  }
'''
    assert '  @unsupported path ' in before
    after=before.replace('  @unsupported path ',route+'  @unsupported path ',1).replace(' /functions/*','')
    caddy.write_text(after)
    try:
        subprocess.run(['docker','exec','kws-probe-web-caddy-1','caddy','validate','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'],stdout=log,stderr=log,check=True)
        subprocess.run(['docker','exec','kws-probe-web-caddy-1','caddy','reload','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'],stdout=log,stderr=log,check=True)
    except subprocess.CalledProcessError:
        caddy.write_text(before);raise
print(json.dumps({'private_push_function_started':True,'jwt_verification':True,'ports_loopback_only':True,'production_cutover':False}))
PY
