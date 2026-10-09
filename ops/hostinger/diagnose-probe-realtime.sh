#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re,subprocess
work=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
log=subprocess.check_output(['docker','logs','--since','15m','realtime-dev.supabase-realtime'],stderr=subprocess.STDOUT).decode(errors='replace')
(work/'realtime-probe.log').write_text(log)
for phrase in ('permission denied','does not exist','already exists','password authentication failed','Connection refused','UnableToConnect','ErrorConnecting','TenantNotFound','FailedToConnect','ReplicationSlot','Subscription','migration','PostgresCdc','Initializing','decrypt','InvalidJWT','invalid JWT','RealtimeDisabledForTenant','RlsPolicyError','FailedToStart','ConnectionError','SubscriptionTimeOut','UnableToSubscribe','FailedToCreate','wal_level'):
    count=sum(phrase in line for line in log.splitlines() if 'realtime-probe' in line)
    if count:print(json.dumps({'diagnostic_class':phrase,'count':count}))
def sql(query):
    p=subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d','kws_restore_probe_20261008_121055','-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    assert p.returncode==0;return p.stdout.decode().strip()
print(json.dumps({'wal_level':sql('SHOW wal_level;'),'replication_slots':sql('SELECT coalesce(json_agg(t),\'[]\') FROM (SELECT slot_name,database,active FROM pg_replication_slots) t;'),'realtime_tables':sql("SELECT coalesce(json_agg(tablename),'[]') FROM pg_tables WHERE schemaname='realtime';"),'notification_select_policies':sql("SELECT json_agg(t) FROM (SELECT policyname,cmd,qual FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND cmd IN ('ALL','SELECT')) t;"),'realtime_subscription_count':sql('SELECT count(*) FROM realtime.subscription;')}))
# Emit only named error atoms, not connection credentials or row values.
atoms=set(re.findall(r'\b(?:[A-Z][A-Za-z]+(?:Error|Failed|Failure|Timeout)|[A-Z][A-Za-z]*To[A-Z][A-Za-z]+|[A-Z][A-Za-z]*NotFound)\b',log))
print(json.dumps({'error_atoms':sorted(atoms)}))
PY
