#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
install -d -m 700 /opt/kws/edge
cat > /opt/kws/edge/Caddyfile <<'EOF'
http://:80 {
  root * /opt/kws/web/current
  encode zstd gzip
  header {
    X-Content-Type-Options nosniff
    X-Frame-Options DENY
    Referrer-Policy strict-origin-when-cross-origin
    Permissions-Policy "camera=(), microphone=(), geolocation=()"
  }
  handle /assets/* {
    header Cache-Control "public, max-age=31536000, immutable"
    file_server
  }
  handle {
    header Cache-Control "no-store"
    try_files {path} /index.html
    file_server
  }
}
EOF
chmod 644 /opt/kws/edge/Caddyfile
cat > /opt/kws/edge/docker-compose.yml <<'EOF'
name: kws-edge
services:
  caddy:
    image: caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f
    restart: unless-stopped
    read_only: true
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]
    security_opt: [no-new-privileges:true]
    tmpfs: [/tmp]
    ports: ["127.0.0.1:9080:80"]
    volumes:
      - /opt/kws/edge/Caddyfile:/etc/caddy/Caddyfile:ro
      - /opt/kws/web:/opt/kws/web:ro
      - caddy_data:/data
      - caddy_config:/config
volumes:
  caddy_data:
  caddy_config:
EOF
cd /opt/kws/edge
docker compose up -d > /var/log/kws-private-web-start.log 2>&1
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
python3 - <<'PY'
import json,urllib.request,urllib.error
from pathlib import Path
import re
root='http://127.0.0.1:9080'
html=urllib.request.urlopen(root+'/').read().decode()
assert '<html' in html
deep=urllib.request.urlopen(root+'/tv/schedule')
assert deep.status==200 and '<html' in deep.read().decode()
asset=re.search(r'<script[^>]+src="([^"]+)"',html).group(1)
response=urllib.request.urlopen(root+asset)
assert 'javascript' in response.headers.get('Content-Type','')
assert 'immutable' in response.headers.get('Cache-Control','')
bundle=response.read().decode()
assert 'http://127.0.0.1:8000' in bundle
assert 'https://pkzzxtsyxwxoraytyjau.supabase.co/rest/' not in bundle
try:
    urllib.request.urlopen(root+'/assets/__missing__.js')
    raise AssertionError('Missing asset should not return HTML')
except urllib.error.HTTPError as e:
    assert e.code==404
print(json.dumps({'web_root':200,'spa_deep_link':200,'javascript_mime':True,'asset_cache':True,'missing_asset':404,'private_api_build':True,'production_dns_changed':False}))
PY
docker inspect kws-edge-caddy-1 --format '{{index .RepoDigests 0}}' 2>/dev/null || docker image inspect caddy:2-alpine --format '{{index .RepoDigests 0}}'
