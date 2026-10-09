#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess,time,urllib.request,urllib.error
db='kws_restore_probe_20261009_092807';work=Path('/var/backups/kws/migration')/db
assert json.loads((work/'DATA-VERIFIED.json').read_text())['database']==db
comparison=json.loads((work/'SCHEMA-COMPARISON.json').read_text())
assert comparison and not any(v['missing'] or v['extra'] or v['different'] for v in comparison.values()), 'Full schema evidence required'
integrations=json.loads(Path('/opt/kws/integrations/runtime.json').read_text())
runtime=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
log=(work/'candidate-services.log').open('ab');services=[]
for original,name,port,container_port in [('supabase-rest','kws-rest-candidate',9992,3000),('supabase-auth','kws-auth-candidate',9994,9999),('supabase-storage','kws-storage-candidate',9993,5000)]:
 original_config=json.loads(subprocess.check_output(['docker','inspect',original]))[0]
 env=dict(line.split('=',1) for line in original_config['Config']['Env'])
 dbkey={'supabase-rest':'PGRST_DB_URI','supabase-auth':'GOTRUE_DB_DATABASE_URL','supabase-storage':'DATABASE_URL'}[original]
 env[dbkey]=env[dbkey].rsplit('/',1)[0]+'/'+db
 mounts=[]
 if original=='supabase-auth':
  smtp=integrations
  env.update(GOTRUE_DISABLE_SIGNUP='true',GOTRUE_EXTERNAL_EMAIL_ENABLED='true',GOTRUE_API_PORT='9999',
   API_EXTERNAL_URL='https://beta-api.kletterwelt-sauerland.de',GOTRUE_SITE_URL='https://beta.kletterwelt-sauerland.de',
   GOTRUE_URI_ALLOW_LIST='https://beta.kletterwelt-sauerland.de/auth/callback,https://beta.kletterwelt-sauerland.de/reset-password',
   GOTRUE_SMTP_HOST=smtp['smtp_host'],GOTRUE_SMTP_PORT=str(smtp['smtp_port']),GOTRUE_SMTP_USER=smtp['smtp_user'],GOTRUE_SMTP_PASS=smtp['smtp_password'],
   GOTRUE_SMTP_ADMIN_EMAIL=smtp['sender'],GOTRUE_SMTP_SENDER_NAME='Kletterwelt Sauerland',GOTRUE_SMTP_HEADERS=json.dumps({'Reply-To':'marketing@kletterwelt-sauerland.de'}))
 elif original=='supabase-storage':
  env.update(POSTGREST_URL='http://kws-rest-candidate:3000',STORAGE_BACKEND='file',FILE_STORAGE_BACKEND_PATH='/var/lib/storage',PORT='5000')
  data=work/'storage-files';data.mkdir(mode=0o700,exist_ok=True)
  uid=subprocess.check_output(['docker','exec',original,'id','-u'],text=True).strip();gid=subprocess.check_output(['docker','exec',original,'id','-g'],text=True).strip()
  subprocess.run(['chown',uid+':'+gid,str(data)],check=True);mounts=['-v',str(data)+':/var/lib/storage']
 existing=subprocess.run(['docker','inspect',name],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 if existing.returncode==0:
  actual=json.loads(existing.stdout)[0]
  assert dict(line.split('=',1) for line in actual['Config']['Env'])[dbkey]==env[dbkey]
  assert actual['State']['Running'], 'Existing candidate must be inspected rather than silently recreated'
 else:
  envfile=work/(name+'.env');envfile.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n');envfile.chmod(0o600)
  subprocess.run(['docker','run','-d','--name',name,'--network','supabase_default','--env-file',str(envfile),
   '-p','127.0.0.1:'+str(port)+':'+str(container_port),'--cap-drop','ALL','--security-opt','no-new-privileges',
   '--memory','1g','--cpus','1','--log-driver','local','--log-opt','max-size=10m','--log-opt','max-file=3']+mounts+[original_config['Config']['Image']],stdout=log,stderr=log,check=True)
 services.append({'name':name,'port':port,'image':original_config['Config']['Image']})
for attempt in range(30):
 try:
  assert urllib.request.urlopen('http://127.0.0.1:9994/health',timeout=5).status==200
  assert urllib.request.urlopen('http://127.0.0.1:9993/status',timeout=5).status==200
  req=urllib.request.Request('http://127.0.0.1:9994/admin/users?page=1&per_page=100',headers={'Authorization':'Bearer '+runtime['SERVICE_ROLE_KEY']})
  with urllib.request.urlopen(req,timeout=5) as r:users=json.load(r)['users'];assert len(users)==44
  break
 except (urllib.error.URLError,AssertionError,ConnectionError):
  if attempt==29:raise
  time.sleep(2)
report={'database':db,'services':services,'auth_admin_users':len(users),'signup_disabled':True,'publicly_accessible':False,'normal_password_login_verified':False,'smtp_configured':True,'test_users_present':False}
(work/'services.json').write_text(json.dumps(report)+'\n')
print(json.dumps({'clean_candidate_services_ready':True,'database':db,'users':len(users),'loopback_only':True,'public_cutover':False}))
PY
