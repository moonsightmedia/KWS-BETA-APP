#!/usr/bin/env bash
# Public HTTPS Studio: every route requires existing dashboard credentials.
# Hash the password through stdin; never emit credentials or adapted config.
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import base64,datetime,json,os,re,socket,subprocess,tarfile,io

domain='supabase.kletterwelt-sauerland.de'
assert '187.7.70.230' in {r[4][0] for r in socket.getaddrinfo(domain,443,type=socket.SOCK_STREAM)}, 'DNS not ready'
gateway=Path('/opt/kws/public-gateway'); production=Path('/opt/kws/production')
assert (production/'CUTOVER-COMPLETE.json').is_file()
config=gateway/'Caddyfile'; compose=gateway/'docker-compose.yml'; envfile=gateway/'studio-auth.env'
assert not envfile.exists(), 'Studio already prepared; inspect rather than overwrite'
old_config=config.read_bytes(); old_compose=compose.read_bytes(); old_template=(production/'PUBLIC.Caddyfile').read_bytes()
assert domain.encode() not in old_config
assert old_config.count(b'reverse_proxy')==3
runtime={}
for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines():
 if line and not line.startswith('#') and '=' in line:
  k,v=line.split('=',1); runtime[k]=v
username=runtime['DASHBOARD_USERNAME']; password=runtime['DASHBOARD_PASSWORD']
assert re.fullmatch(r'[A-Za-z0-9_-]+',username) and len(password)>=24
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
archive=io.BytesIO()
with tarfile.open(fileobj=archive,mode='w') as tar:
 for name,content in [('Caddyfile',old_config),('docker-compose.yml',old_compose),('PUBLIC.Caddyfile',old_template)]:
  item=tarfile.TarInfo(name);item.size=len(content);item.mode=0o600;tar.addfile(item,io.BytesIO(content))
recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],stderr=subprocess.DEVNULL).decode().strip()
backup=production/('studio-before-'+stamp+'.tar.age')
subprocess.run(['age','-r',recipient,'-o',str(backup)],input=archive.getvalue(),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
password_hash=subprocess.check_output(['docker','exec','-i','kws-public-gateway-caddy-1','caddy','hash-password','--algorithm','argon2id'],input=(password+'\n').encode(),stderr=subprocess.DEVNULL).decode().strip()
assert password_hash.startswith('$argon2id$') and '\n' not in password_hash
envfile.write_text('KWS_STUDIO_USERNAME='+username+'\nKWS_STUDIO_PASSWORD_HASH='+password_hash+'\n');envfile.chmod(0o600)
site='''
supabase.kletterwelt-sauerland.de {
 header {
  X-Content-Type-Options nosniff
  X-Frame-Options DENY
  Referrer-Policy no-referrer
  Cache-Control "private, no-store"
 }
 basic_auth argon2id {
  {env.KWS_STUDIO_USERNAME} {env.KWS_STUDIO_PASSWORD_HASH}
 }
 reverse_proxy supabase-envoy:8000
}
'''
new_config=old_config.decode()+site
new_compose=old_compose.decode().replace('    restart:', '    env_file:\n      - path: /opt/kws/public-gateway/studio-auth.env\n        format: raw\n    restart:',1)
assert new_compose!=old_compose.decode()
image='caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f'
candidate=gateway/'Studio.Caddyfile.candidate';candidate.write_text(new_config);candidate.chmod(0o600)
container_env=os.environ.copy();container_env.update(KWS_STUDIO_USERNAME=username,KWS_STUDIO_PASSWORD_HASH=password_hash)
log=production/'studio-publish.log'
with log.open('wb') as output:
 subprocess.run(['docker','run','--rm','--network','supabase_default','--read-only','--cap-drop','ALL',
  '--cap-add','NET_BIND_SERVICE','--security-opt','no-new-privileges','-e','KWS_STUDIO_USERNAME','-e','KWS_STUDIO_PASSWORD_HASH',
  '-v',str(candidate)+':/etc/caddy/Caddyfile:ro','--tmpfs','/data','--tmpfs','/config',image,
  'caddy','validate','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'],env=container_env,stdout=output,stderr=output,check=True)
 try:
  config.write_text(new_config);compose.write_text(new_compose);(production/'PUBLIC.Caddyfile').write_text(new_config)
  subprocess.run(['docker','compose','-f',str(compose),'up','-d','--no-deps','caddy'],stdout=output,stderr=output,check=True)
 except Exception:
  config.write_bytes(old_config);compose.write_bytes(old_compose);(production/'PUBLIC.Caddyfile').write_bytes(old_template)
  subprocess.run(['docker','compose','-f',str(compose),'up','-d','--no-deps','caddy'],stdout=output,stderr=output)
  raise
candidate.unlink()
marker={'prepared_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':'https://'+domain,
 'all_routes_require_basic_auth':True,'credential_reference':'KWS_HOSTINGER_SUPABASE_CONFIG',
 'backup':backup.name,'verification_pending':True}
(production/'PUBLIC-STUDIO-PREPARED.json').write_text(json.dumps(marker,indent=2)+'\n')
print(json.dumps(marker))
PY
