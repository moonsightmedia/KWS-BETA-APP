#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import hashlib,json,shutil,subprocess
root=Path('/opt/kws/web-production');root.mkdir(mode=0o700,exist_ok=True)
assert not (root/'BUILD-VERIFIED.json').exists(), 'Inspect previous production build before replacing'
revision=Path('/opt/kws/probe-web/release-to-build').read_text().strip()
source=Path('/opt/kws/probe-web/releases')/revision/'source'
assert (source.parent/'BUILD-VERIFIED.json').exists()
target=root/'source'
assert not target.exists(), 'Existing production source requires inspection'
shutil.copytree(source,target,ignore=shutil.ignore_patterns('dist','node_modules','.env*'))
env=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
values={'VITE_SUPABASE_URL':'https://beta-api.kletterwelt-sauerland.de','VITE_SUPABASE_PUBLISHABLE_KEY':env['ANON_KEY'],
 'VITE_VIDEO_API_URL':'https://video.kletterwelt-sauerland.de','VITE_NATIVE_VIDEO_API_URL':'https://video.kletterwelt-sauerland.de',
 'VITE_ALLINKL_API_URL':'https://video.kletterwelt-sauerland.de','VITE_USE_ALLINKL_STORAGE':'false',
 'VITE_AUTH_SITE_URL':'https://beta.kletterwelt-sauerland.de','VITE_TELEMETRY_ENABLED':'false','VITE_SENTRY_DSN':''}
(target/'.env.production').write_text('\n'.join(k+'='+v for k,v in values.items())+'\n')
(root/'SOURCE.json').write_text(json.dumps({'revision':revision})+'\n')
with Path('/var/log/kws-production-web-build.log').open('wb') as log:
 subprocess.run(['docker','run','--rm','--memory=2g','--cpus=2','-v',str(target)+':/app','-v','/opt/kws/probe-web/source/node_modules:/app/node_modules:ro','-w','/app','node:22-alpine','sh','-c','./node_modules/.bin/vite build --mode production'],stdout=log,stderr=log,check=True)
dist=target/'dist';assert '/assets/' in (dist/'index.html').read_text()
for path in dist.rglob('*'):
 if path.is_file():
  content=path.read_bytes()
  for name in ('SERVICE_ROLE_KEY','POSTGRES_PASSWORD'):assert env[name].encode() not in content
  assert b'-----BEGIN PRIVATE KEY-----' not in content
  path.chmod(0o644)
 else:path.chmod(0o755)
old_media=Path('/opt/kws/probe-web/media');media=root/'media'
assert old_media.is_dir();shutil.copytree(old_media,media)
for path in media.rglob('*'):path.chmod(0o644 if path.is_file() else 0o755)
media.chmod(0o755);dist.chmod(0o755)
report={'revision':revision,'public_api_configured':True,'base':'/','secret_in_bundle':False,'cdn_files':sum(p.is_file() for p in media.iterdir()),'public_cutover':False}
(root/'BUILD-VERIFIED.json').write_text(json.dumps(report)+'\n');print(json.dumps(report))
PY
cat > /opt/kws/web-production/Caddyfile <<'EOF'
{
 admin off
}
http://:80 {
 header {
  X-Content-Type-Options nosniff
  X-Frame-Options DENY
  Referrer-Policy strict-origin-when-cross-origin
 }
 handle_path /migrated-cdn/* {
  root * /media
  header Cache-Control "public, max-age=31536000, immutable"
  file_server
 }
 handle /assets/* {
  root * /web
  header Cache-Control "public, max-age=31536000, immutable"
  file_server
 }
 handle {
  root * /web
  header Cache-Control no-store
  try_files {path} /index.html
  file_server
 }
}
EOF
cat > /opt/kws/web-production/docker-compose.yml <<'EOF'
name: kws-web-production
services:
 web:
  container_name: kws-web-production
  image: caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f
  restart: unless-stopped
  read_only: true
  cap_drop: [ALL]
  cap_add: [NET_BIND_SERVICE]
  security_opt: [no-new-privileges:true]
  ports: ["127.0.0.1:9091:80"]
  volumes:
   - /opt/kws/web-production/Caddyfile:/etc/caddy/Caddyfile:ro
   - /opt/kws/web-production/source/dist:/web:ro
   - /opt/kws/web-production/media:/media:ro
  tmpfs: ["/data:size=16m", "/config:size=16m"]
  networks: [supabase]
networks:
 supabase:
  external: true
  name: supabase_default
EOF
docker compose -f /opt/kws/web-production/docker-compose.yml up -d > /var/log/kws-production-web-start.log 2>&1
python3 - <<'PY'
import urllib.request
for route in ('/','/reset-password','/auth/callback'):
 assert urllib.request.urlopen('http://127.0.0.1:9091'+route).status==200
print('PRODUCTION_WEB_PRIVATE_ROUTES_VERIFIED')
PY
