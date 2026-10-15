#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
cd /opt/kws/supabase/runtime
[[ ! -e .source-restored ]] || { echo 'Refusing bootstrap repair after source restore'; exit 1; }
if compgen -G '/opt/kws/supabase/runtime/volumes/db/data-bootstrap-failed-*' > /dev/null; then
  echo 'One-time bootstrap repair already performed; refusing to move database again'
  exit 1
fi
chmod 644 volumes/db/*.sql volumes/pooler/pooler.exs
find volumes/api -type d -exec chmod 755 {} +
find volumes/api -type f -exec chmod 644 {} +
chmod 755 volumes/api/envoy/docker-entrypoint.sh
find volumes/functions -type d -exec chmod 755 {} +
find volumes/functions -type f -exec chmod 644 {} +
export COMPOSE_FILE=docker-compose.yml:docker-compose.local.yml
docker compose down > /var/log/kws-bootstrap-repair.log 2>&1
target=/opt/kws/supabase/runtime/volumes/db/data
[[ $(realpath "$target") == "$target" ]] || exit 1
preserved="${target}-bootstrap-failed-$(date -u +%Y%m%dT%H%M%SZ)"
mv -- "$target" "$preserved"
echo "PRESERVED_FAILED_EMPTY_BOOTSTRAP=$preserved"
docker compose up -d --wait --wait-timeout 300 > /var/log/kws-supabase-start.log 2>&1 || { echo 'Private startup failed; use sanitized diagnostic'; exit 1; }
docker compose ps --format json | python3 -c 'import json,sys; s=sys.stdin.read().strip(); rows=json.loads(s) if s.startswith("[") else [json.loads(x) for x in s.splitlines()]; print(json.dumps([{k:r.get(k) for k in ("Service","State","Health")} for r in rows]))'
echo 'PRIVATE_SUPABASE_STARTED_WITH_EMPTY_DATABASE'
