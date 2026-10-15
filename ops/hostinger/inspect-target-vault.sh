#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess
db='kws_restore_probe_20261009_092807'
query="""SELECT json_build_object('vault_functions',(SELECT json_agg(json_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='vault' AND p.proname IN ('create_secret','update_secret')),'decrypted_view',to_regclass('vault.decrypted_secrets') IS NOT NULL,'authenticated_select',has_table_privilege('authenticated','vault.decrypted_secrets','SELECT'),'anon_select',has_table_privilege('anon','vault.decrypted_secrets','SELECT'),'secrets_count',(SELECT count(*) FROM vault.secrets),'postgres_select',has_table_privilege('postgres','vault.decrypted_secrets','SELECT'));"""
result=subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
assert result.returncode==0,'Protected Vault metadata inspection failed'
print(result.stdout.decode().strip())
config=Path('/opt/kws/production/API.Caddyfile');before=config.read_text()
old='''    rewrite @socket /socket/websocket
    reverse_proxy realtime-dev.supabase-realtime:4000 {
      header_up Host realtime-dev.localhost
    }'''
new='''    handle @socket {
      rewrite /socket/websocket
      reverse_proxy realtime-dev.supabase-realtime:4000 {
        header_up Host realtime-dev.localhost
      }
    }
    @broadcast path /api/broadcast
    handle @broadcast {
      reverse_proxy realtime-dev.supabase-realtime:4000 {
        header_up Host realtime-dev.localhost
      }
    }
    handle {
      respond "Unknown Realtime route" 404
    }'''
assert before.count(old)==1
config.write_text(before.replace(old,new))
with Path('/var/log/kws-production-api-validation.log').open('wb') as log:
 subprocess.run(['docker','compose','run','--rm','--no-deps','api','caddy','validate','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'],cwd=config.parent,stdout=log,stderr=log,check=True)
print(json.dumps({'production_api_valid':True,'realtime_admin_routes_not_proxied':True,'public_routes_disabled':True}))
PY
