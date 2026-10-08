#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
cd /opt/kws/supabase/runtime
[[ $(docker exec supabase-db psql -U postgres -d postgres -X -qAt -c 'SELECT count(*) FROM auth.users;') == 0 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
p=Path('docker-compose.local.yml')
text=p.read_text()
if '  auth:\n' not in text:
    text+='  auth:\n    image: supabase/gotrue:v2.197.0\n'
    p.write_text(text)
else:
    assert '    image: supabase/gotrue:v2.197.0\n' in text
PY
export COMPOSE_FILE=docker-compose.yml:docker-compose.local.yml
docker compose pull auth > /var/log/kws-auth-compatibility-upgrade.log 2>&1
docker compose up -d --no-deps --wait --wait-timeout 120 auth >> /var/log/kws-auth-compatibility-upgrade.log 2>&1
docker image inspect supabase/gotrue:v2.197.0 --format '{{index .RepoDigests 0}}'
echo 'PRIVATE_AUTH_STABLE_2_197_0_UPGRADED_EMPTY_MAIN_TARGET_NO_SOURCE_CHANGE'
