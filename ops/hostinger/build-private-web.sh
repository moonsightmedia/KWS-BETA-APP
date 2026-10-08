#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
source=Path('/opt/kws/web/source')
env=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
p=source/'.env.production'
updates={'VITE_SUPABASE_URL':'http://127.0.0.1:8000',
         'VITE_SUPABASE_PUBLISHABLE_KEY':env['ANON_KEY'],
         'VITE_VIDEO_API_URL':'http://127.0.0.1:9000',
         'VITE_NATIVE_VIDEO_API_URL':'http://127.0.0.1:9000',
         'VITE_ALLINKL_API_URL':'http://127.0.0.1:9000',
         'VITE_TELEMETRY_ENABLED':'false'}
lines=p.read_text().splitlines() if p.exists() else []
seen=set()
for i,line in enumerate(lines):
    key=line.split('=',1)[0]
    if key in updates: lines[i]=key+'='+updates[key]; seen.add(key)
lines += [k+'='+v for k,v in updates.items() if k not in seen]
p.write_text('\n'.join(lines)+'\n'); p.chmod(0o600)
PY
docker run --rm --memory=2g --cpus=2 -v /opt/kws/web/source:/app -w /app node:22-alpine sh -c 'npm ci --no-audit --no-fund && ./node_modules/.bin/vite build --mode production' > /var/log/kws-private-web-build.log 2>&1 || { echo 'Private web build failed; inspect sanitized build diagnostics'; exit 1; }
release=/opt/kws/web/releases/52d0769-private
if [[ ! -d "$release" ]]; then
  install -d -m 755 "$release"
  cp -a /opt/kws/web/source/dist/. "$release/"
fi
ln -s "$release" /opt/kws/web/current-next
mv -Tf /opt/kws/web/current-next /opt/kws/web/current
echo 'PRIVATE_WEB_BUILD_COMPLETE_NOT_CONNECTED_TO_PRODUCTION'
