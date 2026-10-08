"""Compare sensitive schema definitions privately; output mismatch names only."""
import json,os,re,socket,subprocess,sys
from pathlib import Path
assert os.geteuid()==0 and socket.gethostname().split('.')[0]=='srv2044594'
os.umask(0o077)
password=json.loads(sys.stdin.readline())['password']
work=sorted(p for p in Path('/var/backups/kws/migration').glob('kws_restore_probe_*') if (p/'DATA-VERIFIED.json').is_file())[-1]
db=json.loads((work/'DATA-VERIFIED.json').read_text())['database']
query="""
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = public, extensions;
SELECT json_build_object(
 'tables',(SELECT json_agg(row_to_json(t)) FROM (SELECT c.relname AS name,
 c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) AS owner,
 c.relacl::text AS acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') ORDER BY c.relname) t),
 'policies',(SELECT json_agg(row_to_json(t)) FROM (SELECT tablename||'.'||policyname AS name,
 permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY schemaname,tablename,policyname) t),
 'functions',(SELECT json_agg(row_to_json(t)) FROM (SELECT p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS name,
 pg_get_functiondef(p.oid) AS definition,p.prosecdef,pg_get_userbyid(p.proowner) AS owner,p.proacl::text AS acl,p.proconfig
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p') ORDER BY 1) t),
 'constraints',(SELECT json_agg(row_to_json(t)) FROM (SELECT c.conrelid::regclass::text||'.'||c.conname AS name,
 c.convalidated,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c
 WHERE c.connamespace='public'::regnamespace ORDER BY 1) t),
 'indexes',(SELECT json_agg(row_to_json(t)) FROM (SELECT indexname AS name,indexdef AS definition
 FROM pg_indexes WHERE schemaname='public' ORDER BY indexname) t),
 'triggers',(SELECT json_agg(row_to_json(t)) FROM (SELECT n.nspname||'.'||c.relname||'.'||t.tgname AS name,t.tgenabled,
 pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_proc f ON f.oid=t.tgfoid JOIN pg_namespace fn ON fn.oid=f.pronamespace
 WHERE (n.nspname='public' OR (n.nspname='auth' AND fn.nspname='public')) AND NOT t.tgisinternal ORDER BY 1) t),
 'realtime',(SELECT json_agg(row_to_json(t)) FROM (SELECT pubname||'.'||schemaname||'.'||tablename AS name
 FROM pg_publication_tables WHERE schemaname='public' ORDER BY 1) t));
ROLLBACK;
"""
env=os.environ.copy();env.update(PGHOST='aws-1-eu-north-1.pooler.supabase.com',PGPORT='5432',
 PGUSER='postgres.pkzzxtsyxwxoraytyjau',PGDATABASE='postgres',PGPASSWORD=password,
 PGSSLMODE='verify-full',PGSSLROOTCERT='/source-ca.crt',PGCONNECT_TIMEOUT='15')
command=['docker','run','--rm','-i','--network','host','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
 '-v','/opt/kws/tools/source-supabase-ca.crt:/source-ca.crt:ro']
for key in ['PGHOST','PGPORT','PGUSER','PGDATABASE','PGPASSWORD','PGSSLMODE','PGSSLROOTCERT','PGCONNECT_TIMEOUT']:command+=['-e',key]
command+=['--entrypoint','psql','supabase/postgres:17.6.1.136','-X','-qAt','-w','-v','ON_ERROR_STOP=1']
with (work/'metadata-comparison.log').open('wb') as log:
    source=json.loads(subprocess.check_output(command,input=query.encode(),env=env,stderr=log))
    target=json.loads(subprocess.check_output(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,
           '-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stderr=log))
(work/'source-schema-metadata.json').write_text(json.dumps(source))
(work/'target-schema-metadata.json').write_text(json.dumps(target))
result={}
for kind in source:
    src={r['name']:r for r in source[kind] or []};dst={r['name']:r for r in target[kind] or []}
    # ACL arrays represent sets; PostgreSQL can serialize grant order differently.
    def normalize(row):
        result=dict(row)
        if result.get('acl') is not None:result['acl']=sorted(result['acl'].strip('{}').split(','))
        if kind=='constraints' and result['name'] in ('clients.clients_type_check','projects.projects_status_check','tasks.tasks_priority_check','tasks.tasks_status_check'):
            # PG17's cloud build deparses varchar[] -> text[] differently from
            # upstream. Map only this exact cast of literal arrays, preserving
            # every literal, operator and surrounding expression.
            def array_cast(match):
                literals=match.group(1).split(', ')
                assert all(re.fullmatch(r"'[a-z-]+'::character varying",v) for v in literals)
                return 'ARRAY['+', '.join('('+v+')::text' for v in literals)+']'
            result['definition']=re.sub(r"\(ARRAY\[((?:'[a-z-]+'::character varying(?:, )?)+)\]\)::text\[\]",array_cast,result['definition'])
        return result
    result[kind]={'source_count':len(src),'target_count':len(dst),'missing':sorted(src.keys()-dst.keys()),
                 'extra':sorted(dst.keys()-src.keys()),
                 'different':sorted(name for name in src.keys()&dst.keys() if normalize(src[name])!=normalize(dst[name]))}
(work/'SCHEMA-COMPARISON.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result),flush=True)
assert not any(v['missing'] or v['extra'] or v['different'] for v in result.values()), 'Schema comparison requires review'
