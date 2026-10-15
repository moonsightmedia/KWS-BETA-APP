#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,json,os,re,subprocess
base=Path('/var/backups/kws/migration');runtime=Path('/opt/kws/supabase/runtime')
work=sorted(p for p in base.glob('kws_restore_probe_*') if (p/'PRODUCTION-CONFIGURED.json').exists())[-1]
production=json.loads((work/'PRODUCTION-CONFIGURED.json').read_text());db=production['database']
assert re.fullmatch(r'kws_restore_probe_[0-9_]+',db)
assert production['promotable'] and not production['rehearsal']
assert not (work/'BACKUP-RESTORE-WITNESS.json').exists() and not (work/'PROBE-TESTS-STARTED.json').exists()
assert not Path('/opt/kws/production/PUBLIC-WRITES-ENABLED.json').exists()
gate=json.loads((base/'SOURCE-MAINTENANCE-GATE.json').read_text())
assert gate['active'] and gate['api_rejection_verified']
assert json.loads(Path('/opt/kws/video-production/FILES-FINAL-VERIFIED.json').read_text())['all_source_sha256_match']
source=Path(json.loads((work/'RESTORE-COMMITTED.json').read_text())['source'])
manifest=json.loads((source/'manifest.json').read_text());assert manifest['stage']=='final' and manifest['writers_frozen']
inventory=json.loads((source/'inventory.json').read_text())
expected_users=next(t['rows'] for t in inventory['tables'] if t['schema']=='auth' and t['name']=='users')
storage=json.loads((work/'STORAGE-VERIFIED.json').read_text());assert storage['all_sha256_match']
log=(work/'promotion.log').open('wb')
def sql(query,database='template1'):
 result=subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',database,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stdout=subprocess.PIPE,stderr=log)
 assert result.returncode==0,'Protected promotion SQL failed'
 return result.stdout.decode().strip()
assert int(sql('SELECT count(*) FROM auth.users;',db))==expected_users
assert sql('SELECT count(*) FROM auth.users;','postgres')=='0'
assert sql("SELECT count(*) FROM pg_tables WHERE schemaname='public';",'postgres')=='0'
assert sql("SELECT count(*) FROM vault.secrets WHERE name='kws_backup_restore_witness';",db)=='0'
assert sql("SELECT count(*) FROM vault.secrets WHERE name='kws_internal_push_service_key';",db)=='1'
if os.environ.get('KWS_PROMOTE_ACTION','inspect')!='execute':
 print(json.dumps({'promotion_guards_passed':True,'database':db,'users':expected_users,'executed':False}));raise SystemExit(0)
assert not Path('/opt/kws/production/DATABASE-PROMOTED.json').exists()
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d_%H%M%S')
old='kws_bootstrap_before_cutover_'+stamp
compose=['docker','compose','-f','docker-compose.yml','-f','docker-compose.local.yml','-f','docker-compose.production.json']
services=[s for s in subprocess.check_output(compose+['config','--services'],cwd=runtime,text=True).split() if s!='db']
recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],text=True).strip()
# The pristine source archive, exact restore proof, URL originals and this full
# post-configuration dump are retained. Do not drop any old database.
dump=subprocess.Popen(['docker','exec','supabase-db','pg_dump','-U','supabase_admin','-d',db,'-Fc'],stdout=subprocess.PIPE,stderr=log)
subprocess.run(['age','-r',recipient,'-o',str(work/'production-candidate-before-promote.dump.age')],stdin=dump.stdout,stdout=log,stderr=log,check=True)
dump.stdout.close();assert dump.wait()==0
subprocess.run(compose+['stop']+services,cwd=runtime,stdout=log,stderr=log,check=True)
for name in ('kws-auth-candidate','kws-rest-candidate','kws-storage-candidate'):
 subprocess.run(['docker','stop',name],stdout=log,stderr=log,check=True)
sql("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('postgres','"+db+"') AND pid<>pg_backend_pid();")
# Logical slots are cluster-wide and remain attached to the old database OID.
# Remove only inactive, known rehearsal/empty-bootstrap slots, after stopping RT.
slots=json.loads(sql("SELECT coalesce(json_agg(t),'[]') FROM (SELECT slot_name,database,active FROM pg_replication_slots) t;"))
for slot in slots:
 known=(slot['database']=='postgres' and slot['slot_name']=='supabase_realtime_messages_replication_slot') or slot['slot_name'].startswith('kws_probe_realtime') or slot['slot_name'].startswith('supabase_realtime_messages_replication_slot_')
 if known:
  assert not slot['active'] and re.fullmatch(r'[a-z0-9_]+',slot['slot_name'])
  assert slot['database']=='postgres' or slot['database'].startswith('kws_restore_probe_')
  sql("SELECT pg_drop_replication_slot('"+slot['slot_name']+"');")
sql('BEGIN;ALTER DATABASE postgres RENAME TO '+old+';ALTER DATABASE '+db+' RENAME TO postgres;COMMIT;')
# Preserve the original tenant configuration in the encrypted full dump. The
# temporary probe tenant must not reconnect to a rehearsal once production runs.
sql("DELETE FROM _realtime.tenants WHERE external_id='realtime-probe';",'postgres')
override=runtime/'docker-compose.production.json';settings=json.loads(override.read_text())
subprocess.run(['age','-r',recipient,'-o',str(work/'compose-before-promotion.json.age'),str(override)],stdout=log,stderr=log,check=True)
settings['services']['storage']={'volumes':[{'type':'bind','source':str(work/'storage-files'),'target':'/var/lib/storage','bind':{'selinux':'z'}}]}
override.write_text(json.dumps(settings)+'\n');override.chmod(0o600)
subprocess.run(compose+['up','-d','--wait','--wait-timeout','180'],cwd=runtime,stdout=log,stderr=log,check=True)
assert int(sql('SELECT count(*) FROM auth.users;','postgres'))==expected_users
report={'database':'postgres','original_candidate':db,'previous_empty_bootstrap_preserved_as':old,'users':expected_users,
 'storage_files':str(work/'storage-files'),'source_gate_kept':True,'public_routes_still_disabled':True,'promoted_at':stamp}
Path('/opt/kws/production/DATABASE-PROMOTED.json').write_text(json.dumps(report)+'\n');print(json.dumps(report));log.close()
PY
