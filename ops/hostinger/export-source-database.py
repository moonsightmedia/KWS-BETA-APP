"""Read source password from stdin; emit only stage/count metadata.

Database records, password hashes, SQL definitions and diagnostics stay in the
root-only migration area on the new VPS. No source writes are performed.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys

assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
os.umask(0o077)
secret = json.loads(sys.stdin.readline())['password']
assert isinstance(secret, str) and secret and '\n' not in secret
env = os.environ.copy()
env.update(PGHOST='aws-1-eu-north-1.pooler.supabase.com', PGPORT='5432',
           PGUSER='postgres.pkzzxtsyxwxoraytyjau', PGDATABASE='postgres',
           PGPASSWORD=secret, PGSSLMODE='verify-full',
           PGSSLROOTCERT='/source-ca.crt', PGCONNECT_TIMEOUT='15')
image = 'supabase/postgres:17.6.1.136'
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
stage = Path('/var/backups/kws/migration') / ('database-precopy-' + stamp)
stage.mkdir(mode=0o700)
log = (stage / 'diagnostics.log').open('wb')
base = ['docker', 'run', '--rm', '--network', 'host', '--read-only',
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=256m', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges', '--memory', '2g', '--cpus', '1',
        '-v', '/opt/kws/tools/source-supabase-ca.crt:/source-ca.crt:ro']
for name in ['PGHOST','PGPORT','PGUSER','PGDATABASE','PGPASSWORD','PGSSLMODE','PGSSLROOTCERT','PGCONNECT_TIMEOUT']:
    base += ['-e', name]

def run_client(tool, args, dest, input_text=None):
    with dest.open('wb') as output:
        subprocess.run(base + (['-i'] if input_text else []) + ['--entrypoint', tool, image] + args,
                       input=input_text.encode() if input_text else None,
                       stdout=output, stderr=log, env=env, check=True, timeout=900)

controller = None
try:
    # This exporter holds one read-only snapshot for schema, data and archive.
    controller = subprocess.Popen(base + ['-i','--entrypoint','psql',image,
         '-X','-qAt','-w','-v','ON_ERROR_STOP=1'], stdin=subprocess.PIPE,
         stdout=subprocess.PIPE, stderr=log, env=env, text=True, bufsize=1)
    controller.stdin.write("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSELECT pg_export_snapshot();\n")
    controller.stdin.flush()
    snapshot = controller.stdout.readline().strip()
    if not re.fullmatch(r'[0-9A-F]+-[0-9A-F]+-\d+', snapshot):
        raise RuntimeError('Source authentication or snapshot failed; protected diagnostics retained')
    print('SOURCE_DB_AUTHENTICATED_VERIFY_FULL_READ_ONLY_SNAPSHOT_OPEN', flush=True)

    inventory_sql = """
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET TRANSACTION SNAPSHOT '%s';
SELECT json_build_object('version',current_setting('server_version'),'role',current_user,
 'ssl',(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),
 'tables',(SELECT json_agg(row_to_json(t)) FROM
  (SELECT n.nspname AS schema,c.relname AS name,
   ((xpath('/row/n/text()',query_to_xml(format('SELECT count(*) AS n FROM %%I.%%I',n.nspname,c.relname),false,true,'')))[1]::text)::bigint AS rows
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname NOT LIKE 'pg_%%' AND n.nspname<>'information_schema'
     AND c.relkind IN ('r','p') AND NOT c.relispartition
   ORDER BY n.nspname,c.relname) t),
 'columns',(SELECT json_agg(row_to_json(t)) FROM
  (SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,is_nullable,is_generated
   FROM information_schema.columns WHERE table_schema IN ('auth','storage','public')
   ORDER BY table_schema,table_name,ordinal_position) t));
ROLLBACK;
""" % snapshot
    run_client('psql',['-X','-qAt','-w','-v','ON_ERROR_STOP=1'],stage/'inventory.json',inventory_sql)
    inventory=json.loads((stage/'inventory.json').read_text())
    # pg_stat_ssl reports the pooler-to-Postgres hop, not this client-to-pooler
    # connection. libpq verify-full above enforces our certificate/hostname check.
    assert env['PGSSLMODE']=='verify-full'
    print(json.dumps({'source_version':inventory['version'], 'snapshot_tables':len(inventory['tables']),
                      'auth_users':next(t['rows'] for t in inventory['tables'] if (t['schema'],t['name'])==('auth','users'))}),flush=True)

    uri='postgresql://postgres.pkzzxtsyxwxoraytyjau@aws-1-eu-north-1.pooler.supabase.com:5432/postgres'
    for name,flags in [('roles',['--role-only']),('schema',[]),('data',['--data-only','--use-copy'])]:
        # Official CLI transformations, generated without the real password.
        dry_env=os.environ.copy(); dry_env['PGPASSWORD']='NONSECRET_PLACEHOLDER'
        script=subprocess.run(['/opt/kws/tools/supabase','db','dump','--db-url',uri,'--dry-run','--keep-comments']+flags,
             cwd='/opt/kws/migration-work',env=dry_env,stdout=subprocess.PIPE,stderr=log,check=True).stdout.decode()
        script=re.sub(r'^export PG(?:HOST|PORT|USER|PASSWORD|DATABASE)=.*\n','',script,flags=re.M)
        assert 'NONSECRET_PLACEHOLDER' not in script
        if name!='roles':
            script=re.sub(r'(?m)^pg_dump \\\n', lambda _: 'pg_dump --snapshot '+snapshot+' \\\n',script)
            assert '--snapshot '+snapshot in script
        (stage/(name+'-export.sh')).write_text(script)
        run_client('bash',['-c',script],stage/(name+'.sql'))
        assert (stage/(name+'.sql')).stat().st_size>0
        print('SOURCE_'+name.upper()+'_DUMP_COMPLETE',flush=True)
    # Complete archival complement includes internal schema definitions and data.
    # Restore the managed stack using the filtered files, not this archive blindly.
    run_client('pg_dump',['--format=custom','--snapshot',snapshot,'--no-password'],stage/'source-full.dump')
    run_client('pg_dump',['--schema-only','--schema=auth','--schema=storage','--no-password','--snapshot',snapshot],stage/'internal-schema.sql')
    controller.stdin.write('ROLLBACK;\n\\q\n');controller.stdin.flush()
    controller.communicate(timeout=30)
    assert controller.returncode==0
    controller=None
    manifest={'source_project':'pkzzxtsyxwxoraytyjau','stage':'precopy',
              'consistent_database_snapshot':True,'writers_frozen':False,
              'storage_and_video_snapshot_aligned':False,'created_at':stamp,
              'postgres_version':inventory['version'],'files':{}}
    for path in stage.iterdir():
        if path.suffix in ('.sql','.dump','.json'):
            manifest['files'][path.name]={'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    (stage/'manifest.json').write_text(json.dumps(manifest,indent=2))
    agefile=stage.with_suffix('.tar.age')
    recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],text=True).strip()
    tar=subprocess.Popen(['tar','-C',str(stage.parent),'-cf','-',stage.name],stdout=subprocess.PIPE,stderr=log)
    subprocess.run(['age','-r',recipient,'-o',str(agefile)],stdin=tar.stdout,stderr=log,check=True)
    tar.stdout.close();assert tar.wait()==0
    digest=hashlib.sha256(agefile.read_bytes()).hexdigest()
    agefile.with_suffix(agefile.suffix+'.sha256').write_text(digest+'  '+agefile.name+'\n')
    print(json.dumps({'database_encrypted_backup':str(agefile),'bytes':agefile.stat().st_size,
                     'consistent_database_snapshot':True,'final_cutover_backup':False}),flush=True)
except Exception as error:
    # Exception payloads/SQL stderr can contain credentials or records.
    print('DATABASE_EXPORT_FAILED_'+type(error).__name__+'_PROTECTED_DIAGNOSTICS_ONLY',flush=True)
    sys.exit(1)
finally:
    if controller is not None:
        try:
            controller.stdin.write('ROLLBACK;\n\\q\n');controller.stdin.flush()
            controller.communicate(timeout=10)
        except Exception:
            controller.kill();controller.wait()
    log.close()
    env.pop('PGPASSWORD',None);secret=None
