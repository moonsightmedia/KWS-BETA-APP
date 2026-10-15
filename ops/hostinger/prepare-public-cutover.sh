#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
cat > /opt/kws/production/PUBLIC.Caddyfile <<'EOF'
{
 admin off
}
beta-api.kletterwelt-sauerland.de {
 header {
  X-Content-Type-Options nosniff
  X-Frame-Options DENY
  Referrer-Policy no-referrer
 }
 reverse_proxy kws-api-internal:80
}
beta.kletterwelt-sauerland.de {
 header {
  X-Content-Type-Options nosniff
  X-Frame-Options DENY
  Referrer-Policy strict-origin-when-cross-origin
 }
 reverse_proxy kws-web-production:80
}
video.kletterwelt-sauerland.de {
 header {
  X-Content-Type-Options nosniff
  X-Frame-Options DENY
  Referrer-Policy no-referrer
 }
 reverse_proxy kws-video-production:3000
}
EOF
docker run --rm --network supabase_default --read-only --cap-drop ALL --cap-add NET_BIND_SERVICE --security-opt no-new-privileges \
 -v /opt/kws/production/PUBLIC.Caddyfile:/etc/caddy/Caddyfile:ro \
 --tmpfs /data --tmpfs /config \
 caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f \
 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile > /var/log/kws-public-production-validation.log 2>&1
echo PUBLIC_CUTOVER_CONFIGURATION_VALID_NOT_APPLIED
