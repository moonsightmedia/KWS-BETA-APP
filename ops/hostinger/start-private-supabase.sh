#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
cd /opt/kws/supabase/runtime
cat > docker-compose.local.yml <<'EOF'
services:
  api-gw:
    ports: !override
      - "127.0.0.1:8000:8000"
      - "127.0.0.1:8443:8443"
  supavisor:
    ports: !override
      - "127.0.0.1:5432:5432"
      - "127.0.0.1:6543:6543"
EOF
export COMPOSE_FILE=docker-compose.yml:docker-compose.local.yml
docker compose config --format json | python3 -c 'import json,sys; d=json.load(sys.stdin); ports=[p for s in d["services"].values() for p in s.get("ports",[])]; assert all(p.get("host_ip")=="127.0.0.1" for p in ports), "Non-private port binding"; print("ALL_SUPABASE_PORTS_LOOPBACK_ONLY")'
docker compose pull > /var/log/kws-supabase-pull.log 2>&1 || { echo 'Image pull failed; inspect protected server log'; exit 1; }
docker compose up -d --wait --wait-timeout 300 > /var/log/kws-supabase-start.log 2>&1 || {
  docker compose ps --format json | python3 -c 'import json,sys; lines=sys.stdin.read().strip(); rows=json.loads(lines) if lines.startswith("[") else [json.loads(x) for x in lines.splitlines()]; print(json.dumps([{k:r.get(k) for k in ("Service","State","Health")} for r in rows]))'
  echo 'Private startup failed; inspect protected server log without printing secrets'
  exit 1
}
docker compose ps --format json | python3 -c 'import json,sys; lines=sys.stdin.read().strip(); rows=json.loads(lines) if lines.startswith("[") else [json.loads(x) for x in lines.splitlines()]; print(json.dumps([{k:r.get(k) for k in ("Service","State","Health")} for r in rows]))'
echo 'PRIVATE_SUPABASE_STARTED_WITH_EMPTY_DATABASE'
