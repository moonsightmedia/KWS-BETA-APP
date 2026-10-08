#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
test -f /opt/kws/probe-web/source/dist/index.html
cat > /opt/kws/probe-web/Caddyfile <<'EOF'
http://:80 {
  root * /app
  encode zstd gzip
  header {
    X-Content-Type-Options nosniff
    X-Frame-Options DENY
    Referrer-Policy strict-origin-when-cross-origin
  }
  handle_path /auth/v1/* {
    reverse_proxy kws-auth-probe:9999
  }
  handle_path /rest/v1/* {
    reverse_proxy kws-rest-probe:3000
  }
  handle_path /storage/v1/* {
    reverse_proxy kws-storage-probe:5000
  }
  handle_path /video-api/* {
    reverse_proxy kws-video-private-video-1:3000
  }
  handle_path /migrated-cdn/* {
    root * /media
    file_server
  }
  @unsupported path /realtime/* /functions/* /disabled-legacy-upload*
  handle @unsupported {
    respond "Service not enabled in migration probe" 503
  }
  handle /assets/* {
    header Cache-Control "public, max-age=31536000, immutable"
    file_server
  }
  handle {
    header Cache-Control no-store
    try_files {path} /index.html
    file_server
  }
}
EOF
cat > /opt/kws/probe-web/docker-compose.yml <<'EOF'
name: kws-probe-web
services:
  caddy:
    image: caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f
    restart: unless-stopped
    read_only: true
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]
    security_opt: [no-new-privileges:true]
    ports: ["127.0.0.1:9090:80"]
    volumes:
      - /opt/kws/probe-web/Caddyfile:/etc/caddy/Caddyfile:ro
      - /opt/kws/probe-web/source/dist:/app:ro
      - /opt/kws/probe-web/media:/media:ro
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
cd /opt/kws/probe-web
docker compose up -d > /var/log/kws-probe-web-start.log 2>&1
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
python3 - <<'PY'
import json,urllib.request,urllib.error
assert urllib.request.urlopen('http://127.0.0.1:9090/auth/v1/health').status==200
assert urllib.request.urlopen('http://127.0.0.1:9090/boulders').status==200
assert urllib.request.urlopen('http://127.0.0.1:9090/video-api/health').status==200
print(json.dumps({'probe_web_port':9090,'loopback_only':True,'auth_route':200,'video_health':200,'realtime_and_functions_enabled':False,'production_cutover':False}))
PY
