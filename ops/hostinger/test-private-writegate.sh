#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess
db='kws_restore_probe_20261008_121055'
command=['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1']
def sql(query):return subprocess.run(command,input=query.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
assert sql("SELECT to_regclass('public.kws_gate_test') IS NULL;").stdout.strip()==b't'
setup="""BEGIN;
CREATE TABLE public.kws_gate_test(id integer PRIMARY KEY);
INSERT INTO public.kws_gate_test VALUES(1);
GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE ON public.kws_gate_test TO authenticated,service_role;
CREATE FUNCTION public.kws_gate_test_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $gate$ BEGIN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='App migration maintenance: writes are temporarily disabled'; END; $gate$;
REVOKE ALL ON FUNCTION public.kws_gate_test_trigger() FROM PUBLIC;
CREATE TRIGGER kws_migration_write_gate BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.kws_gate_test FOR EACH STATEMENT EXECUTE FUNCTION public.kws_gate_test_trigger();
CREATE FUNCTION public.kws_gate_test_definer() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $gate$ INSERT INTO public.kws_gate_test VALUES(2); $gate$;
GRANT EXECUTE ON FUNCTION public.kws_gate_test_definer() TO authenticated,service_role;
COMMIT;"""
assert sql(setup).returncode==0
checks=[]
try:
 for role in ('authenticated','service_role'):
  assert sql('SET ROLE '+role+';SELECT count(*) FROM public.kws_gate_test;').stdout.strip()==b'1'
  checks.append(role+'_reads_remain_available')
  for label,statement in [('insert','INSERT INTO public.kws_gate_test VALUES(2);'),('update','UPDATE public.kws_gate_test SET id=id;'),('delete','DELETE FROM public.kws_gate_test;'),('truncate','TRUNCATE public.kws_gate_test;'),('security_definer','SELECT public.kws_gate_test_definer();')]:
   result=sql('BEGIN READ WRITE;SET LOCAL ROLE '+role+';'+statement+'COMMIT;')
   assert result.returncode!=0 and b'App migration maintenance' in result.stderr
   checks.append(role+'_'+label+'_blocked')
 assert sql('SELECT count(*) FROM public.kws_gate_test;').stdout.strip()==b'1'
finally:
 assert sql('BEGIN;DROP FUNCTION public.kws_gate_test_definer();DROP TABLE public.kws_gate_test;DROP FUNCTION public.kws_gate_test_trigger();COMMIT;').returncode==0
report={'database':db,'passed':len(checks),'checks':checks,'test_objects_removed':True,'source_changed':False,'explicit_read_write_transactions_blocked':True}
Path('/var/backups/kws/migration/WRITE-GATE-PROBE-VERIFIED.json').write_text(json.dumps(report)+'\n');print(json.dumps(report))
PY
