// Transfer only this dashboard and the reviewed backup engine, over verified SSH.
import {readFileSync,readdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {spawnSync} from 'node:child_process';
const root = dirname(fileURLToPath(import.meta.url));
const assetsOnly = process.argv.includes('--assets-only');
const files = {};
for (const name of ['collect-status.py','kws-operations-status.service','kws-operations-status.timer','public/index.html']) files[name] = readFileSync(join(root,name)).toString('base64');
for (const name of readdirSync(join(root,'public/ops'))) {
  if (/\.(js|css|woff2)$/.test(name)) files['public/ops/'+name] = readFileSync(join(root,'public/ops',name)).toString('base64');
}
files['backup-production.py'] = readFileSync(join(root,'../backup-production.py')).toString('base64');
const script = `set -Eeuo pipefail
umask 077
python3 - <<'PY'
from pathlib import Path
import base64,datetime,io,json,os,socket,subprocess,tarfile
assert os.geteuid()==0 and socket.gethostname().split('.')[0]=='srv2044594'
files=json.loads('${JSON.stringify(files)}')
base=Path('/opt/kws/operations-dashboard')
if ${assetsOnly ? 'True' : 'False'}:
 assert base.is_dir() and (base/'collect-status.py').is_file()
 for name,content in files.items():
  if not name.startswith('public/'):continue
  path=base/name;assert path.resolve().is_relative_to((base/'public').resolve())
  temporary=path.with_suffix(path.suffix+'.new');temporary.write_bytes(base64.b64decode(content));temporary.chmod(0o644);temporary.replace(path)
 print(json.dumps({'dashboard_assets_updated':True,'production_services_unchanged':True}))
 raise SystemExit(0)
assert not base.exists(), 'Dashboard already deployed; inspect before updating'
gateway=Path('/opt/kws/public-gateway');prod=Path('/opt/kws/production')
config=gateway/'Caddyfile';compose=gateway/'docker-compose.yml';template=prod/'PUBLIC.Caddyfile'
old={str(p):p.read_bytes() for p in (config,compose,template,Path('/opt/kws/tools/backup-production.py'))}
site='supabase.kletterwelt-sauerland.de {\\n'
source=config.read_text();index=source.index(site)
assert source[index:].count('reverse_proxy supabase-envoy:8000')==1
assert 'basic_auth argon2id' in source[index:]
assert 'operations-dashboard' not in compose.read_text()
archive=io.BytesIO()
with tarfile.open(fileobj=archive,mode='w') as tar:
 for path,content in old.items():
  item=tarfile.TarInfo(path.lstrip('/'));item.size=len(content);item.mode=0o600;tar.addfile(item,io.BytesIO(content))
recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],stderr=subprocess.DEVNULL).decode().strip()
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
subprocess.run(['age','-r',recipient,'-o',str(prod/('dashboard-before-'+stamp+'.tar.age'))],input=archive.getvalue(),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
for name,content in files.items():
 if name=='backup-production.py':continue
 path=base/name;path.parent.mkdir(parents=True,exist_ok=True,mode=0o755)
 path.write_bytes(base64.b64decode(content));path.chmod(0o644)
base.chmod(0o755)
for name in ('kws-operations-status.service','kws-operations-status.timer'):
 Path('/etc/systemd/system',name).write_bytes((base/name).read_bytes())
new_site=source[index:].replace(' reverse_proxy supabase-envoy:8000', ''' @overview path /
 handle @overview {
  root * /srv/kws-operations
  header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
  file_server
 }
 handle /ops/* {
  root * /srv/kws-operations
  file_server
 }
 handle {
  reverse_proxy supabase-envoy:8000
 }''',1)
new_config=source[:index]+new_site
new_compose=compose.read_text().replace('      - caddy_data:/data','      - /opt/kws/operations-dashboard/public:/srv/kws-operations:ro\\n      - caddy_data:/data',1)
assert new_compose!=compose.read_text()
candidate=gateway/'Dashboard.Caddyfile.candidate';candidate.write_text(new_config);candidate.chmod(0o600)
env=os.environ.copy()
for line in (gateway/'studio-auth.env').read_text().splitlines():
 key,value=line.split('=',1);env[key]=value
image='caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f'
with (prod/'dashboard-deploy.log').open('wb') as log:
 subprocess.run(['docker','run','--rm','--read-only','--cap-drop','ALL','--cap-add','NET_BIND_SERVICE','--security-opt','no-new-privileges','-e','KWS_STUDIO_USERNAME','-e','KWS_STUDIO_PASSWORD_HASH','-v',str(candidate)+':/etc/caddy/Caddyfile:ro','--tmpfs','/data','--tmpfs','/config',image,'caddy','validate','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'],env=env,stdout=log,stderr=log,check=True)
 subprocess.run(['systemctl','daemon-reload'],stdout=log,stderr=log,check=True)
 subprocess.run(['systemctl','start','kws-operations-status.service'],stdout=log,stderr=log,check=True)
 snapshot=json.loads((base/'public/ops/status.json').read_text())
 assert not snapshot['errors'], 'A real-data collector section failed'
 try:
  config.write_text(new_config);compose.write_text(new_compose);template.write_text(new_config)
  subprocess.run(['docker','compose','-f',str(compose),'up','-d','--no-deps','caddy'],stdout=log,stderr=log,check=True)
 except Exception:
  for path,content in old.items():Path(path).write_bytes(content)
  subprocess.run(['docker','compose','-f',str(compose),'up','-d','--no-deps','caddy'],stdout=log,stderr=log)
  raise
 subprocess.run(['systemctl','enable','--now','kws-operations-status.timer'],stdout=log,stderr=log,check=True)
Path('/opt/kws/tools/backup-production.py').write_bytes(base64.b64decode(files['backup-production.py']))
candidate.unlink()
print(json.dumps({'deployed':True,'url':'https://supabase.kletterwelt-sauerland.de/','sections':list(snapshot.keys()),'database':snapshot['database'],'read_only_collector':True,'all_routes_keep_existing_basic_auth':True}))
PY
`;
const remote = `sudo -n bash -c 'set -Eeuo pipefail; umask 077; test ! -e /run/kws-dashboard-deploy.sh; cat > /run/kws-dashboard-deploy.sh; trap "rm -f /run/kws-dashboard-deploy.sh" EXIT; bash /run/kws-dashboard-deploy.sh'`;
const r = spawnSync('ssh.exe',['-T','-i',join(homedir(),'.ssh/id_ed25519_kws_vps_laptop'),'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',`UserKnownHostsFile=${join(homedir(),'.ssh/known_hosts_kws')}`,'-o','HostKeyAlgorithms=ssh-ed25519','-o','KexAlgorithms=curve25519-sha256','-o','ConnectTimeout=10','kws-admin@187.7.70.230',remote],{input:script,encoding:'utf8',maxBuffer:1024*1024});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');if(r.error)throw r.error;process.exitCode=r.status??1;
