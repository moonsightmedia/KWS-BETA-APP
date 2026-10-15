"""Explicit, reversible statement-trigger gate. Default is read-only inspection."""
import datetime,json,os,socket,subprocess,sys
from pathlib import Path
assert os.geteuid()==0 and socket.gethostname().split('.')[0]=='srv2044594'
os.umask(0o077)
request=json.loads(sys.stdin.readline());action=request.get('action','inspect')
assert action in ('inspect','install','remove')
root=Path('/var/backups/kws/migration');record=root/'SOURCE-MAINTENANCE-GATE.json'
env=os.environ.copy();env.update(PGHOST='aws-1-eu-north-1.pooler.supabase.com',PGPORT='5432',PGUSER='postgres.pkzzxtsyxwxoraytyjau',PGDATABASE='postgres',PGPASSWORD=request['password'],PGSSLMODE='verify-full',PGSSLROOTCERT='/source-ca.crt',PGCONNECT_TIMEOUT='15')
command=['docker','run','--rm','-i','--network','host','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','-v','/opt/kws/tools/source-supabase-ca.crt:/source-ca.crt:ro']
for key in ('PGHOST','PGPORT','PGUSER','PGDATABASE','PGPASSWORD','PGSSLMODE','PGSSLROOTCERT','PGCONNECT_TIMEOUT'):command+=['-e',key]
command+=['--entrypoint','psql','supabase/postgres:17.6.1.136','-X','-qAt','-w','-v','ON_ERROR_STOP=1']
def sql(query):
 result=subprocess.run(command,input=query.encode(),env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if result.returncode:
  # SQL contains no password, but keep raw provider errors out of public logs.
  (root/'source-maintenance-gate-error.log').write_bytes(result.stderr)
  raise RuntimeError('Source maintenance SQL failed; protected diagnostics only')
 return result.stdout.decode().strip()
try:
 tables=json.loads(sql("SELECT json_agg(json_build_object('schema',n.nspname,'table',c.relname,'can_trigger',has_table_privilege(c.oid,'TRIGGER'))) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','storage') AND c.relkind IN ('r','p') AND NOT c.relispartition;"))
 excluded={(t['schema'],t['table']) for t in tables if not t['can_trigger']}
 expected={('storage','buckets_vectors'),('storage','vector_indexes'),('auth','schema_migrations'),('storage','migrations')}
 assert excluded==expected and len(tables)==70, 'Source coverage changed; inspect before proceeding'
 assert sql('SELECT (SELECT count(*) FROM storage.buckets_vectors)+(SELECT count(*) FROM storage.vector_indexes);')=='0', 'Vector data needs its own verified gate'
 covered=[t for t in tables if t['can_trigger']]
 identifiers=[]
 for t in covered:
  assert all(v.replace('_','').isalnum() for v in (t['schema'],t['table']))
  identifiers.append('"'+t['schema']+'"."'+t['table']+'"')
 active=int(sql("SELECT count(*) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='kws_migration_write_gate';"))
 if action=='inspect':
  print(json.dumps({'covered_tables':len(covered),'excluded_managed_tables':sorted('.'.join(v) for v in excluded),'excluded_vector_tables_empty':True,'active_gate_triggers':active,'source_changed':False}));sys.exit(0)
 if action=='install':
  ready=json.loads((root/'CUTOVER-TARGET-READY.json').read_text())
  assert ready.get('ready') is True and ready.get('public_routes_disabled') is True and ready.get('rollback_prepared') is True
  assert (root/'WRITE-GATE-PROBE-VERIFIED.json').exists() and active==0 and not record.exists()
  assert sql("SELECT to_regprocedure('public.kws_migration_write_gate()') IS NULL;")=='t'
  statements=["BEGIN; SET LOCAL lock_timeout='30s';", "CREATE FUNCTION public.kws_migration_write_gate() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $gate$ BEGIN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='App migration maintenance: writes are temporarily disabled'; END; $gate$;", 'REVOKE ALL ON FUNCTION public.kws_migration_write_gate() FROM PUBLIC;']
  statements += ['CREATE TRIGGER kws_migration_write_gate BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON '+name+' FOR EACH STATEMENT EXECUTE FUNCTION public.kws_migration_write_gate();' for name in identifiers]
  statements+=['COMMIT;']
  sql('\n'.join(statements))
  current=int(sql("SELECT count(*) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='kws_migration_write_gate';"));assert current==len(covered)
  report={'source_project':'pkzzxtsyxwxoraytyjau','installed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'covered_tables':len(covered),'relations':identifiers,'excluded_empty_vectors_and_managed_migrations':True,'api_rejection_verified':False,'active':True}
  record.write_text(json.dumps(report)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='relations'}))
 else:
  saved=json.loads(record.read_text());assert saved['active'] and active==saved['covered_tables']
  assert set(saved['relations'])==set(identifiers)
  statements=['BEGIN; SET LOCAL lock_timeout=\'30s\';']+['DROP TRIGGER kws_migration_write_gate ON '+name+';' for name in saved['relations']]+['DROP FUNCTION public.kws_migration_write_gate();','COMMIT;']
  sql('\n'.join(statements));saved.update(active=False,removed_at=datetime.datetime.now(datetime.timezone.utc).isoformat());record.write_text(json.dumps(saved)+'\n')
  print(json.dumps({'source_gate_removed':True,'original_permissions_unchanged':True}))
except Exception as e:
 print(json.dumps({'maintenance_gate_failed':True,'action':action,'error_class':type(e).__name__}));sys.exit(1)
