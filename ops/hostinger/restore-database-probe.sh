#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,json,os,re,subprocess
base=Path('/var/backups/kws/migration')
stage=sorted(p for p in base.glob('database-precopy-*.tar.age.restore-test') if (p/'RESTORE-VERIFIED.json').is_file())[-1]
source=next(stage.glob('*/inventory.json')).parent
probe='kws_restore_probe_'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d_%H%M%S')
work=base/probe;work.mkdir(mode=0o700)
log=(work/'restore.log').open('wb')
runtime='/opt/kws/supabase/runtime'
compose=['docker','compose','-f','docker-compose.yml','-f','docker-compose.local.yml']
def sql(query,db='postgres',capture=False):
    result=subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,
       '-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stdout=subprocess.PIPE,stderr=log,check=True)
    return result.stdout.decode().strip() if capture else None
assert sql('SELECT count(*) FROM auth.users;',capture=True)=='0'
assert sql("SELECT count(*) FROM pg_tables WHERE schemaname='public';",capture=True)=='0'
# Encrypted rollback copy before any target change, even though source is private.
with (work/'target-before.dump').open('wb') as output:
    subprocess.run(['docker','exec','supabase-db','pg_dump','-U','postgres','-d','postgres','-Fc'],stdout=output,stderr=log,check=True)
recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],text=True).strip()
subprocess.run(['age','-r',recipient,'-o',str(work/'target-before.dump.age'),str(work/'target-before.dump')],stderr=log,check=True)
services=subprocess.check_output(compose+['config','--services'],cwd=runtime,text=True).split()
services=[s for s in services if s!='db']
try:
    subprocess.run(compose+['stop']+services,cwd=runtime,stdout=log,stderr=log,check=True)
    sql("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='postgres' AND pid<>pg_backend_pid();")
    sql('CREATE DATABASE '+probe+' WITH TEMPLATE postgres;')
finally:
    subprocess.run(compose+['up','-d','--wait','--wait-timeout','180'],cwd=runtime,stdout=log,stderr=log,check=True)
(work/'probe.json').write_text(json.dumps({'database':probe,'source':str(source),'application_connected':False}))
print('ISOLATED_PROBE_DATABASE_CREATED_SOURCE_AND_MAIN_TARGET_UNCHANGED',flush=True)

# The empty main target must first run stable Auth 2.197.0 migrations. The clone
# receives the supported schema, rather than ad-hoc DDL or removed COPY columns.
assert sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='auth' AND table_name='one_time_tokens' AND column_name='expires_at';",probe,True)=='1'

# One transaction: on any restore error no partial application data is committed.
payload='BEGIN;\n'+(source/'roles.sql').read_text()+'\n'+(source/'schema.sql').read_text()+\
 '\nSET session_replication_role=replica;\n'+(source/'data.sql').read_text()+\
 '\nSET session_replication_role=origin;\nCOMMIT;\n'
try:
    sql(payload,probe)
except subprocess.CalledProcessError:
    print('PROBE_RESTORE_FAILED_TRANSACTION_ROLLED_BACK_PROTECTED_LOG',flush=True)
    # Only relation/SQLSTATE-style classifications; never raw SQL or data values.
    log.flush()
    for line in (work/'restore.log').read_text(errors='replace').splitlines():
        if 'ERROR:' in line:
            safe=re.search(r'ERROR:\s+(type|relation|column|function|schema|role|constraint|index) "([A-Za-z0-9_.]+)" (already exists|does not exist)',line)
            print(safe.group(0) if safe else 'UNCLASSIFIED_RESTORE_ERROR_PROTECTED_LOG_ONLY')
    raise SystemExit(1)
sql("NOTIFY pgrst, 'reload schema';",probe)
(work/'RESTORE-COMMITTED.json').write_text(json.dumps({'database':probe,'source':str(source),'main_target_users':0,
 'source_writes':False,'isolated_restore_committed':True,'auth_runtime_compatibility_verified':False}))
print(json.dumps({'probe_database':probe,'restore_transaction_committed':True,'production_cutover':False}),flush=True)
log.close()
PY
