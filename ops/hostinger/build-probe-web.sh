#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json
work=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
assert (work/'URLS-REWRITTEN.json').is_file()
env=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
source=Path('/opt/kws/probe-web/source')
updates={'VITE_SUPABASE_URL':'http://127.0.0.1:9090','VITE_SUPABASE_PUBLISHABLE_KEY':env['ANON_KEY'],
 'VITE_VIDEO_API_URL':'http://127.0.0.1:9090/video-api','VITE_NATIVE_VIDEO_API_URL':'http://127.0.0.1:9090/video-api',
 'VITE_ALLINKL_API_URL':'http://127.0.0.1:9090/video-api','VITE_USE_ALLINKL_STORAGE':'false',
 'VITE_AUTH_SITE_URL':'https://beta.kletterwelt-sauerland.de','VITE_TELEMETRY_ENABLED':'false','VITE_SENTRY_DSN':''}
p=source/'.env.production';p.write_text('\n'.join(k+'='+v for k,v in updates.items())+'\n');p.chmod(0o600)
PY
docker run --rm --memory=2g --cpus=2 -v /opt/kws/probe-web/source:/app -w /app node:22-alpine sh -c 'npm ci --no-audit --no-fund && ./node_modules/.bin/vite build --mode production' > /var/log/kws-probe-web-build.log 2>&1 || { echo 'Probe web build failed; inspect protected diagnostics'; exit 1; }
python3 - <<'PY'
from pathlib import Path
import json
env=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
dist=Path('/opt/kws/probe-web/source/dist')
assert (dist/'index.html').is_file()
for file in dist.rglob('*'):
 if file.is_file():
  content=file.read_bytes();assert env['SERVICE_ROLE_KEY'].encode() not in content
  assert env['POSTGRES_PASSWORD'].encode() not in content
print(json.dumps({'probe_frontend_built':True,'service_secret_in_bundle':False,'source_changed':False}))
PY
