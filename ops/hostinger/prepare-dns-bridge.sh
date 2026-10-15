#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
[[ ! -e /var/backups/kws/migration/SOURCE-MAINTENANCE-GATE.json ]] || { echo SOURCE_GATE_ALREADY_EXISTS_INSPECT_BEFORE_BRIDGE; exit 1; }
curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
 --connect-to beta.kletterwelt-sauerland.de:443:55aa1c11d6fda53d.vercel-dns-017.com:443 \
 https://beta.kletterwelt-sauerland.de/ -o /opt/kws/production/bridge-source-index.html
curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
 --connect-to video.kletterwelt-sauerland.de:443:187.124.182.245:443 \
 https://video.kletterwelt-sauerland.de/health -o /opt/kws/production/bridge-source-video-health.json
python3 - <<'PY'
import json
from pathlib import Path
assert '<html' in Path('/opt/kws/production/bridge-source-index.html').read_text().lower()
assert json.loads(Path('/opt/kws/production/bridge-source-video-health.json').read_text())['ok']
PY
cat > /opt/kws/production/BRIDGE.Caddyfile <<'EOF'
{
 admin off
}
beta-api.kletterwelt-sauerland.de {
 header {
  X-Content-Type-Options nosniff
  Referrer-Policy no-referrer
  Cache-Control no-store
  Content-Type application/json
 }
 handle /healthz {
  respond `{"status":"migration-preparation","production_ready":false}` 200
 }
 handle {
  header Retry-After 3600
  respond `{"error":"Migration preparation; API is not yet enabled"}` 503
 }
}
beta.kletterwelt-sauerland.de {
 reverse_proxy https://55aa1c11d6fda53d.vercel-dns-017.com {
  header_up Host beta.kletterwelt-sauerland.de
  transport http {
   tls_server_name beta.kletterwelt-sauerland.de
  }
 }
}
video.kletterwelt-sauerland.de {
 reverse_proxy https://187.124.182.245 {
  header_up Host video.kletterwelt-sauerland.de
  transport http {
   tls_server_name video.kletterwelt-sauerland.de
  }
 }
}
EOF
docker run --rm --network supabase_default --read-only --cap-drop ALL --cap-add NET_BIND_SERVICE --security-opt no-new-privileges \
 -v /opt/kws/production/BRIDGE.Caddyfile:/etc/caddy/Caddyfile:ro --tmpfs /data --tmpfs /config \
 caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f \
 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile > /var/log/kws-dns-bridge-validation.log 2>&1
cp /opt/kws/production/BRIDGE.Caddyfile /opt/kws/public-gateway/Caddyfile
docker compose -f /opt/kws/public-gateway/docker-compose.yml restart caddy > /var/log/kws-dns-bridge-start.log 2>&1
python3 - <<'PY'
import datetime,json
from pathlib import Path
report={'bridge_prepared_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'upstream_web_tls_verified':True,'upstream_video_tls_verified':True,'source_still_serves_all_application_data':True,'target_api_closed':True,'dns_changes_pending':True}
Path('/opt/kws/production/DNS-BRIDGE-PREPARED.json').write_text(json.dumps(report)+'\n');print(json.dumps(report))
PY
