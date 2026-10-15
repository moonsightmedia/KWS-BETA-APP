"""Inspect maintenance feasibility without changing source state or printing records."""
import json,os,socket,subprocess,sys
from pathlib import Path
assert os.geteuid()==0 and socket.gethostname().split('.')[0]=='srv2044594'
os.umask(0o077)
password=json.loads(sys.stdin.readline())['password']
env=os.environ.copy()
env.update(PGHOST='aws-1-eu-north-1.pooler.supabase.com',PGPORT='5432',PGUSER='postgres.pkzzxtsyxwxoraytyjau',PGDATABASE='postgres',PGPASSWORD=password,
           PGSSLMODE='verify-full',PGSSLROOTCERT='/source-ca.crt',PGCONNECT_TIMEOUT='15')
cmd=['docker','run','--rm','-i','--network','host','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
     '-v','/opt/kws/tools/source-supabase-ca.crt:/source-ca.crt:ro']
for name in ('PGHOST','PGPORT','PGUSER','PGDATABASE','PGPASSWORD','PGSSLMODE','PGSSLROOTCERT','PGCONNECT_TIMEOUT'):cmd+=['-e',name]
cmd+=['--entrypoint','psql','supabase/postgres:17.6.1.136','-X','-qAt','-w','-v','ON_ERROR_STOP=1']
sql="""
BEGIN READ ONLY;
SELECT json_build_object(
 'database_owner',pg_get_userbyid(d.datdba),
 'current_role',current_user,
 'database_setting',current_setting('default_transaction_read_only'),
 'protected_table_counts',(SELECT json_build_object('total',count(*),'trigger_privilege',count(*) FILTER (WHERE has_table_privilege(c.oid,'TRIGGER')),'without_trigger_privilege',coalesce(json_agg(n.nspname||'.'||c.relname) FILTER (WHERE NOT has_table_privilege(c.oid,'TRIGGER')),'[]')) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','storage') AND c.relkind IN ('r','p')),
 'can_signal_backends',pg_has_role(current_user,'pg_signal_backend','MEMBER'),
 'database_readonly_config',(SELECT coalesce(json_agg(x),'[]') FROM (SELECT coalesce(r.rolname,'database-default') role,s.setdatabase,setting FROM pg_db_role_setting s LEFT JOIN pg_roles r ON r.oid=s.setrole,LATERAL unnest(s.setconfig) setting WHERE s.setdatabase IN (0,d.oid) AND setting LIKE 'default_transaction_read_only=%%') x),
 'functions_with_readonly_override',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND (p.prosrc ILIKE '%%transaction_read_only%%' OR p.prosrc ILIKE '%%SET TRANSACTION%%')),
 'active_writer_roles',(SELECT coalesce(json_agg(x),'[]') FROM (SELECT usename,count(*) connections FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() GROUP BY usename ORDER BY usename) x),
 'scheduled_jobs_extension',(SELECT exists(SELECT 1 FROM pg_extension WHERE extname='pg_cron'))
) FROM pg_database d WHERE d.datname=current_database();
ROLLBACK;
""".replace('%%','%')
result=subprocess.run(cmd,input=sql.encode(),env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
if result.returncode:
    print(json.dumps({'writegate_inspection_failed':True}));sys.exit(1)
report=json.loads(result.stdout)
Path('/var/backups/kws/migration/SOURCE-WRITEGATE-INSPECTION.json').write_text(json.dumps(report)+'\n')
print(json.dumps(report))
