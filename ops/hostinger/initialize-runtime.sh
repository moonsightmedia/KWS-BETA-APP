#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
cd /opt/kws/supabase/runtime
if [[ ! -f .env ]]; then
  cp .env.example .env
  sh utils/generate-keys.sh --update-env > /dev/null
  chmod 600 .env
  python3 - <<'PY'
from pathlib import Path
import secrets
p=Path('.env')
updates={
    'SUPABASE_PUBLIC_URL':'http://127.0.0.1:8000',
    'API_EXTERNAL_URL':'http://127.0.0.1:8000',
    'SITE_URL':'https://beta.kletterwelt-sauerland.de',
    'ADDITIONAL_REDIRECT_URLS':'',
    'DASHBOARD_USERNAME':'kws-admin',
    'POOLER_TENANT_ID':'kws',
    'SMTP_HOST':'',
    'SMTP_USER':'',
    'SMTP_PASS':'',
    'ENABLE_EMAIL_AUTOCONFIRM':'false',
    'ENABLE_PHONE_SIGNUP':'false',
    'ENABLE_ANONYMOUS_USERS':'false',
}
lines=p.read_text().splitlines()
seen=set()
for i,line in enumerate(lines):
    key=line.split('=',1)[0]
    if key in updates:
        lines[i]=key+'='+updates[key]; seen.add(key)
lines += [k+'='+v for k,v in updates.items() if k not in seen]
p.write_text('\n'.join(lines)+'\n')
PY
fi
install -d -m 700 /root/.config/kws-migration
if [[ ! -f /root/.config/kws-migration/age-key.txt ]]; then
  age-keygen -o /root/.config/kws-migration/age-key.txt 2>/dev/null
  chmod 600 /root/.config/kws-migration/age-key.txt
fi
echo 'GENERATED_RUNTIME_SECRETS_NOT_DISPLAYED'
docker compose config --services
docker compose config --format json | python3 -c 'import json,sys; d=json.load(sys.stdin); print("DB_IMAGE="+d["services"]["db"]["image"]); print("PUBLISHED_SERVICES="+",".join(k for k,v in d["services"].items() if v.get("ports")))'
