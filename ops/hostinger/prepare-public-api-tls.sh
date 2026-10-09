#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
install -d -m 700 /opt/kws/public-gateway
[[ ! -e /opt/kws/public-gateway/docker-compose.yml ]] || { echo PUBLIC_GATEWAY_ALREADY_EXISTS_INSPECT_BEFORE_CHANGING; exit 1; }
cat > /opt/kws/public-gateway/Caddyfile <<'EOF'
{
  admin off
}
beta-api.kletterwelt-sauerland.de {
  header {
    X-Content-Type-Options nosniff
    X-Frame-Options DENY
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
EOF
cat > /opt/kws/public-gateway/docker-compose.yml <<'EOF'
name: kws-public-gateway
services:
  caddy:
    image: caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f
    restart: unless-stopped
    read_only: true
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]
    security_opt: [no-new-privileges:true]
    ports: ["80:80", "443:443"]
    volumes:
      - /opt/kws/public-gateway/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks: [supabase]
networks:
  supabase:
    external: true
    name: supabase_default
volumes:
  caddy_data:
  caddy_config:
EOF
cd /opt/kws/public-gateway
docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile > /var/log/kws-public-gateway-validation.log 2>&1
docker compose up -d > /var/log/kws-public-gateway-start.log 2>&1
echo PUBLIC_API_TLS_STARTED_MAINTENANCE_ONLY_NO_DATA_OR_ADMIN_ROUTES
