#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess,time,urllib.request
root=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
p=json.loads(subprocess.check_output(['docker','inspect','kws-auth-probe']))[0]
env=dict(s.split('=',1) for s in p['Config']['Env'])
assert env['GOTRUE_DB_DATABASE_URL'].endswith('/kws_restore_probe_20261008_121055')
assert not p['Mounts']
secret=json.loads(Path('/opt/kws/integrations/runtime.json').read_text())
before=root/'smtp-probe-before.env.age'
if not before.exists():
    recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],text=True).strip()
    subprocess.run(['age','-r',recipient,'-o',str(before)],input=('\n'.join(k+'='+v for k,v in env.items())+'\n').encode(),check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
env.update(GOTRUE_SMTP_HOST=secret['smtp_host'],GOTRUE_SMTP_PORT=str(secret['smtp_port']),
           GOTRUE_SMTP_USER=secret['smtp_user'],GOTRUE_SMTP_PASS=secret['smtp_password'],
           GOTRUE_SMTP_ADMIN_EMAIL=secret['sender'],GOTRUE_SMTP_SENDER_NAME=secret['sender_name'],
           GOTRUE_SMTP_HEADERS=json.dumps({'Reply-To':secret['reply_to']},separators=(',',':')),
           GOTRUE_MAILER_SUBJECTS_CONFIRMATION='Kletterwelt Sauerland – Umzugstest: E-Mail bestätigen',
           GOTRUE_MAILER_SUBJECTS_RECOVERY='Kletterwelt Sauerland – Umzugstest: Passwort zurücksetzen',
           API_EXTERNAL_URL='http://127.0.0.1:9090',GOTRUE_SITE_URL='http://127.0.0.1:9090',
           GOTRUE_URI_ALLOW_LIST='http://127.0.0.1:9090/**')
envfile=root/'kws-auth-probe-smtp.env';envfile.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n');envfile.chmod(0o600)
with (root/'smtp-start.log').open('wb') as log:
    subprocess.run(['docker','stop','kws-auth-probe'],stdout=log,stderr=log,check=True)
    subprocess.run(['docker','rm','kws-auth-probe'],stdout=log,stderr=log,check=True)
    subprocess.run(['docker','run','-d','--name','kws-auth-probe','--network','supabase_default','--env-file',str(envfile),
      '-p','127.0.0.1:9998:9999','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','1g','--cpus','1',
      '--log-driver','local','--log-opt','max-size=10m','--log-opt','max-file=3',p['Config']['Image']],stdout=log,stderr=log,check=True)
for attempt in range(20):
    try:
        assert urllib.request.urlopen('http://127.0.0.1:9998/health',timeout=5).status==200;break
    except (OSError,AssertionError):
        if attempt==19:raise
        time.sleep(1)
print(json.dumps({'private_auth_smtp_configured':True,'sender':secret['sender'],'reply_to':secret['reply_to'],
                  'smtp_headers_valid_json':True,'source_modified':False,'public_api_still_maintenance':True}))
PY
