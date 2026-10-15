#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
revision=$(cat /opt/kws/probe-web/release-to-build)
[[ $revision =~ ^[a-f0-9]{12}$ ]] || exit 1
source=/opt/kws/probe-web/releases/$revision/source
test -f "$source/src/pages/ResetPassword.tsx"
export KWS_PROBE_RELEASE_SOURCE="$source"
python3 - <<'PY'
from pathlib import Path
import os,hashlib
source=Path(os.environ['KWS_PROBE_RELEASE_SOURCE'])
assert hashlib.sha256((source/'package-lock.json').read_bytes()).digest()==hashlib.sha256(Path('/opt/kws/probe-web/source/package-lock.json').read_bytes()).digest()
env=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
updates={'VITE_SUPABASE_URL':'http://127.0.0.1:9090','VITE_SUPABASE_PUBLISHABLE_KEY':env['ANON_KEY'],
 'VITE_VIDEO_API_URL':'http://127.0.0.1:9090/video-api','VITE_NATIVE_VIDEO_API_URL':'http://127.0.0.1:9090/video-api',
 'VITE_ALLINKL_API_URL':'http://127.0.0.1:9090/video-api','VITE_USE_ALLINKL_STORAGE':'false',
 'VITE_AUTH_SITE_URL':'https://beta.kletterwelt-sauerland.de','VITE_TELEMETRY_ENABLED':'false','VITE_SENTRY_DSN':''}
p=source/'.env.production';p.write_text('\n'.join(k+'='+v for k,v in updates.items())+'\n');p.chmod(0o600)
PY
docker run --rm --memory=2g --cpus=2 -v "$source:/app" -v /opt/kws/probe-web/source/node_modules:/app/node_modules:ro -w /app node:22-alpine sh -c './node_modules/.bin/vite build --mode production' > /var/log/kws-probe-release-build.log 2>&1 || { echo 'Private release build failed; inspect protected diagnostics'; exit 1; }
python3 - <<'PY'
from pathlib import Path
import os,json,shutil,urllib.request
source=Path(os.environ['KWS_PROBE_RELEASE_SOURCE']);dist=source/'dist';live=Path('/opt/kws/probe-web/source/dist')
env=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
for path in dist.rglob('*'):
 if path.is_file():
  content=path.read_bytes()
  for name in ('SERVICE_ROLE_KEY','POSTGRES_PASSWORD'):assert env[name].encode() not in content
  assert b'-----BEGIN PRIVATE KEY-----' not in content
# Retain prior hashed assets for already-open private clients; publish index last.
for path in dist.rglob('*'):
 if path.is_file() and path!=dist/'index.html':
  target=live/path.relative_to(dist);target.parent.mkdir(exist_ok=True,parents=True);shutil.copyfile(path,target);target.chmod(0o644)
next_index=live/'index.next.html';shutil.copyfile(dist/'index.html',next_index);next_index.chmod(0o644);next_index.replace(live/'index.html')
assert urllib.request.urlopen('http://127.0.0.1:9090/reset-password').status==200
report={'source_revision':source.parent.name,'private_web_updated':True,'public_cutover':False,'secret_in_bundle':False}
(source.parent/'BUILD-VERIFIED.json').write_text(json.dumps(report)+'\n')
print(json.dumps(report))
PY
