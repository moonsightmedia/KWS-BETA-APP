#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import http.client,json,subprocess,time,urllib.request,urllib.error
base=Path('/var/backups/kws/migration')
work=sorted(p for p in base.glob('kws_restore_probe_*') if (p/'DATA-VERIFIED.json').is_file())[-1]
result=json.loads((work/'DATA-VERIFIED.json').read_text()); db=result['database']
if (work/'services.json').exists():
    assert json.loads((work/'services.json').read_text())['database']==db
config={}
for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines():
    if line and not line.startswith('#') and '=' in line:
        key,value=line.split('=',1);config[key]=value.strip('"\'')
log=(work/'services.log').open('wb')
services=[]
for original,name,port in [('supabase-auth','kws-auth-probe',9998),('supabase-storage','kws-storage-probe',9997)]:
    inspect=json.loads(subprocess.check_output(['docker','inspect',original]))[0]
    env=dict(line.split('=',1) for line in inspect['Config']['Env'])
    dbkey='GOTRUE_DB_DATABASE_URL' if 'auth' in name else 'DATABASE_URL'
    env[dbkey]=env[dbkey].rsplit('/',1)[0]+'/'+db
    existing=subprocess.run(['docker','inspect',name],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    if existing.returncode==0:
        present=json.loads(existing.stdout)[0]
        present_env=dict(line.split('=',1) for line in present['Config']['Env'])
        assert present_env[dbkey]==env[dbkey], 'Existing probe is bound to a different database'
        if 'storage' in name:
            data=work/'storage-files'
            assert any(m['Source']==str(data) and m['Destination']=='/var/lib/storage' for m in present['Mounts'])
            uid=subprocess.check_output(['docker','exec',original,'id','-u'],text=True).strip()
            gid=subprocess.check_output(['docker','exec',original,'id','-g'],text=True).strip()
            subprocess.run(['chown',uid+':'+gid,str(data)],check=True)
            if present['State']['Status']!='running':subprocess.run(['docker','start',name],stdout=log,stderr=log,check=True)
        if 'auth' in name and present_env.get('GOTRUE_EXTERNAL_EMAIL_ENABLED')!='true':
            subprocess.run(['docker','stop',name],stdout=log,stderr=log,check=True)
            subprocess.run(['docker','rm',name],stdout=log,stderr=log,check=True)
        else:
            services.append({'name':name,'port':port,'image':present['Config']['Image']})
            continue
    if 'auth' in name:
        env.update(GOTRUE_DISABLE_SIGNUP='true',GOTRUE_EXTERNAL_EMAIL_ENABLED='true',
                   GOTRUE_API_PORT='9999',API_EXTERNAL_URL='http://127.0.0.1:9998',
                   GOTRUE_SITE_URL='http://127.0.0.1:9080')
        for key in list(env):
            if key.startswith('GOTRUE_SMTP_') and key not in ('GOTRUE_SMTP_PORT',):env[key]=''
        containerport=9999
        mounts=[]
    else:
        env.update(POSTGREST_URL='http://kws-rest-probe:3000',STORAGE_BACKEND='file',
                   FILE_STORAGE_BACKEND_PATH='/var/lib/storage',PORT='5000')
        containerport=5000
        data=work/'storage-files';data.mkdir(mode=0o700)
        # Match the runtime's UID/GID without opening data to other users.
        uid=subprocess.check_output(['docker','exec',original,'id','-u'],text=True).strip()
        gid=subprocess.check_output(['docker','exec',original,'id','-g'],text=True).strip()
        os_path=str(data)
        subprocess.run(['chown',str(uid)+':'+str(gid),os_path],check=True)
        mounts=['-v',os_path+':/var/lib/storage']
    envfile=work/(name+'.env');envfile.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n')
    cmd=['docker','run','-d','--name',name,'--network','supabase_default','--env-file',str(envfile),
         '-p','127.0.0.1:'+str(port)+':'+str(containerport),'--cap-drop','ALL',
         '--security-opt','no-new-privileges','--memory','1g','--cpus','1',
         '--log-driver','local','--log-opt','max-size=10m','--log-opt','max-file=3']+mounts+[inspect['Config']['Image']]
    subprocess.run(cmd,stdout=log,stderr=log,check=True)
    services.append({'name':name,'port':port,'image':inspect['Config']['Image']})
# Storage requires a PostgREST instance connected to this same isolated database.
inspect=json.loads(subprocess.check_output(['docker','inspect','supabase-rest']))[0]
env=dict(line.split('=',1) for line in inspect['Config']['Env'])
env['PGRST_DB_URI']=env['PGRST_DB_URI'].rsplit('/',1)[0]+'/'+db
envfile=work/'kws-rest-probe.env'
existing=subprocess.run(['docker','inspect','kws-rest-probe'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
if existing.returncode==0:
    present=json.loads(existing.stdout)[0]
    assert dict(line.split('=',1) for line in present['Config']['Env'])['PGRST_DB_URI']==env['PGRST_DB_URI']
else:
    envfile.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n')
    subprocess.run(['docker','run','-d','--name','kws-rest-probe','--network','supabase_default','--env-file',str(envfile),
     '-p','127.0.0.1:9996:3000','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1',
     '--log-driver','local','--log-opt','max-size=10m','--log-opt','max-file=3',inspect['Config']['Image']],stdout=log,stderr=log,check=True)
services.append({'name':'kws-rest-probe','port':9996,'image':inspect['Config']['Image']})
def get(url,key=None):
    headers={'Authorization':'Bearer '+key} if key else {}
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=10) as r:return r.status,r.read()
for attempt in range(30):
    try:
        status,body=get('http://127.0.0.1:9998/health');assert status==200
        status,body=get('http://127.0.0.1:9998/admin/users?page=1&per_page=100',config['SERVICE_ROLE_KEY'])
        users=json.loads(body)['users'];assert len(users)==44
        status,body=get('http://127.0.0.1:9997/status');assert status==200
        break
    except (urllib.error.URLError,ConnectionError,http.client.HTTPException,AssertionError,KeyError):
        if attempt==29:raise
        time.sleep(2)
(work/'services.json').write_text(json.dumps({'database':db,'services':services,'auth_admin_users':len(users),
 'signup_disabled':True,'publicly_accessible':False,'normal_password_login_verified':False}))
print(json.dumps({'probe_database':db,'auth_health':200,'restored_auth_admin_users':len(users),
 'storage_health':200,'ports_loopback_only':True,'password_login_verified':False}))
log.close()
PY
