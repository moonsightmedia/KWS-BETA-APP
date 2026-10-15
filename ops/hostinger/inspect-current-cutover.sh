#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess
def sql(query):
 result=subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 assert result.returncode==0;return result.stdout.decode().strip()
def tls(host,path='/'):
 result=subprocess.run(['curl','--silent','--show-error','--connect-timeout','10','--max-time','20','--resolve',host+':443:187.7.70.230','-o','/dev/null','-w','%{http_code}','https://'+host+path],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 return {'verified_tls':result.returncode==0,'http_status':result.stdout.decode().strip()}
print(json.dumps({'main_users':int(sql('SELECT count(*) FROM auth.users;')),
 'main_public_tables':int(sql("SELECT count(*) FROM pg_tables WHERE schemaname='public';")),
 'slots':json.loads(sql("SELECT coalesce(json_agg(t),'[]') FROM (SELECT slot_name,database,active FROM pg_replication_slots) t;")),
 'tenant_names':json.loads(sql("SELECT coalesce(json_agg(external_id),'[]') FROM _realtime.tenants;"))}))
proof={'hosts':{host:tls(host,'/health' if host.startswith('video.') else '/') for host in ('beta.kletterwelt-sauerland.de','video.kletterwelt-sauerland.de','beta-api.kletterwelt-sauerland.de')}}
print(json.dumps(proof));Path('/opt/kws/production/BRIDGE-TLS-CHECK.json').write_text(json.dumps(proof)+'\n')
print(subprocess.check_output(['docker','ps','--format','{{.Names}} {{.Status}}'],text=True).strip())
print(json.dumps({'source_gate_record_exists':Path('/var/backups/kws/migration/SOURCE-MAINTENANCE-GATE.json').exists(),
 'target_ready_record_exists':Path('/var/backups/kws/migration/CUTOVER-TARGET-READY.json').exists()}))
PY
