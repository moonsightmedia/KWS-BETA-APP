"""Encrypted application restore set; fail closed when referenced media is absent.

Run as root after cutover. A DB snapshot defines required Storage versions and
public media. Concurrent deletion can fail a run; it never yields a verified set.
Extra pre-copied files are harmless. In-flight video jobs are recorded as such.
"""
from pathlib import Path
import argparse,datetime,fcntl,hashlib,json,os,re,shutil,socket,subprocess,tarfile,traceback,urllib.parse

assert os.geteuid()==0 and socket.gethostname().split('.')[0]=='srv2044594'
os.umask(0o077)
parser=argparse.ArgumentParser()
parser.add_argument('--rehearsal-database')
args=parser.parse_args()
database=args.rehearsal_database or 'postgres'
if args.rehearsal_database:
 assert re.fullmatch(r'kws_restore_probe_\d{8}_\d{6}',database)
 candidate=Path('/var/backups/kws/migration')/database
 assert json.loads((candidate/'DATA-VERIFIED.json').read_text())['database']==database
 assert json.loads((candidate/'STORAGE-VERIFIED.json').read_text())['all_sha256_match'] is True
else:
 assert Path('/opt/kws/production/CUTOVER-COMPLETE.json').exists(), 'Cutover not verified'
base=Path('/var/backups/kws/rehearsal' if args.rehearsal_database else '/var/backups/kws/production');base.mkdir(mode=0o700,exist_ok=True)
lock=(base/'backup.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
work=base/(stamp+'.work');work.mkdir(mode=0o700)
log=(work/'diagnostics.log').open('wb');controller=None
client=['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',database,'-X','-qAt','-v','ON_ERROR_STOP=1']
def sql(query):
 return subprocess.check_output(client,input=query.encode(),stderr=log).decode().strip()
def digest(path):
 with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()
def copy_tree(source,target):
 assert source.is_dir() and not source.is_symlink()
 assert not any(path.is_symlink() for path in source.rglob('*')), 'Symlink in backup tree'
 shutil.copytree(source,target,symlinks=False)
def copy_required(source,target):
 assert source.is_file() and not source.is_symlink(), 'Required media absent'
 target.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
 shutil.copyfile(source,target)
 assert source.stat().st_size==target.stat().st_size and digest(source)==digest(target), 'Media changed during backup'
try:
 # Copy large immutable media before opening the database snapshot.
 copy_tree(Path('/opt/kws/video-production/data'),work/'video')
 copy_tree(Path('/opt/kws/web-production/media'),work/'cdn')
 controller=subprocess.Popen(client,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=log,text=True,bufsize=1)
 controller.stdin.write('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSELECT pg_export_snapshot();\n');controller.stdin.flush()
 snapshot=controller.stdout.readline().strip();assert re.fullmatch(r'[0-9A-F]+-[0-9A-F]+-\d+',snapshot)
 def snap(query):return sql("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET TRANSACTION SNAPSHOT '"+snapshot+"'; "+query+' ROLLBACK;')
 assert int(snap('SELECT count(*) FROM auth.users;'))>0
 table_names=json.loads(snap("SELECT json_agg(json_build_object('schema',schemaname,'table',tablename)) FROM pg_tables WHERE schemaname IN ('public','auth','storage','vault');"))
 database_rows={}
 for item in table_names:
  assert all(v.replace('_','').isalnum() for v in item.values())
  relation='"'+item['schema']+'"."'+item['table']+'"'
  canonical=snap("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb)::text FROM "+relation+' t;')
  database_rows[item['schema']+'.'+item['table']]={'rows':len(json.loads(canonical)),'sha256':hashlib.sha256(canonical.encode()).hexdigest()}
 sequence_names=json.loads(snap("SELECT coalesce(json_agg(json_build_object('schema',n.nspname,'name',c.relname)),'[]') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' AND n.nspname IN ('public','auth','storage','vault');"))
 sequences={}
 for item in sequence_names:
  assert all(v.replace('_','').isalnum() for v in item.values())
  sequences[item['schema']+'.'+item['name']]=json.loads(snap('SELECT json_build_object(\'last_value\',last_value,\'is_called\',is_called) FROM "'+item['schema']+'"."'+item['name']+'";'))
 with (work/'database.dump').open('wb') as output:
  subprocess.run(['docker','exec','supabase-db','pg_dump','-U','supabase_admin','-d',database,'-Fc','--snapshot',snapshot],stdout=output,stderr=log,check=True)
 with (work/'roles.sql').open('wb') as output:
  subprocess.run(['docker','exec','supabase-db','pg_dumpall','-U','supabase_admin','--roles-only'],stdout=output,stderr=log,check=True)
 storage=json.loads(snap("SELECT coalesce(json_agg(json_build_object('bucket',bucket_id,'name',name,'version',version,'size',(metadata->>'size')::bigint)),'[]') FROM storage.objects;"))
 service=json.loads(subprocess.check_output(['docker','inspect','kws-storage-candidate' if args.rehearsal_database else 'supabase-storage'],stderr=log))[0]
 environment=dict(line.split('=',1) for line in service['Config']['Env'])
 assert urllib.parse.urlsplit(environment['DATABASE_URL']).path=='/'+database
 mount=next(m for m in service['Mounts'] if m['Destination']=='/var/lib/storage')
 storage_root=Path(mount['Source']).resolve()
 for row in storage:
  assert row['version'] and row['size'] is not None
  relative=Path(environment['TENANT_ID'])/environment['GLOBAL_S3_BUCKET']/row['bucket']/row['name']/row['version']
  source=(storage_root/relative).resolve();assert source.is_relative_to(storage_root)
  copy_required(source,work/'storage'/relative)
  assert (work/'storage'/relative).stat().st_size==row['size']
 tables=json.loads(snap("SELECT json_agg(tablename) FROM pg_tables WHERE schemaname='public';"))
 media_refs=set()
 def visit(value):
  if isinstance(value,dict):
   for v in value.values():visit(v)
  elif isinstance(value,list):
   for v in value:visit(v)
  elif isinstance(value,str) and value.startswith(('https://video.kletterwelt-sauerland.de/','https://beta.kletterwelt-sauerland.de/migrated-cdn/')):media_refs.add(value)
 for table in tables:
  assert table.replace('_','').isalnum()
  visit(json.loads(snap('SELECT coalesce(json_agg(t),\'[]\') FROM public."'+table+'" t;')))
 for url in media_refs:
  parsed=urllib.parse.urlsplit(url);assert not parsed.username and not parsed.password
  if parsed.hostname=='video.kletterwelt-sauerland.de':
   assert parsed.path.startswith('/videos/')
   relative=Path(urllib.parse.unquote(parsed.path[len('/videos/'):]))
   live_root=Path('/opt/kws/video-production/data/final').resolve();saved_root=(work/'video/final').resolve()
  else:
   relative=Path(urllib.parse.unquote(parsed.path[len('/migrated-cdn/'):]))
   live_root=Path('/opt/kws/web-production/media').resolve();saved_root=(work/'cdn').resolve()
  source=(live_root/relative).resolve();target=(saved_root/relative).resolve()
  assert source.is_relative_to(live_root) and target.is_relative_to(saved_root)
  if not target.is_file():copy_required(source,target)
 controller.stdin.write('ROLLBACK;\n\\q\n');controller.stdin.flush();controller.communicate(timeout=30)
 assert controller.returncode==0;controller=None
 # Encryption keys/config are necessary to restore Vault, Auth and SMTP.
 config=work/'config';config.mkdir(mode=0o700)
 db_service=json.loads(subprocess.check_output(['docker','inspect','supabase-db'],stderr=log))[0]
 db_config_mount=next(m for m in db_service['Mounts'] if m['Destination']=='/etc/postgresql-custom')
 db_config_root=Path(db_config_mount['Source'])
 assert (db_config_root/'pgsodium_root.key').is_file(), 'Vault encryption root key absent'
 copy_tree(db_config_root,config/'postgres-custom')
 runtime=Path('/opt/kws/supabase/runtime')
 for name in ('.env','docker-compose.yml','docker-compose.local.yml','docker-compose.production.json'):
  shutil.copyfile(runtime/name,config/name)
 (config/'volumes').mkdir(mode=0o700)
 for name in ('db','pooler','functions','api'):
  source=runtime/'volumes'/name
  if source.is_dir():
   # pg_dump is authoritative; never copy a running PostgreSQL data directory.
   if name=='db':
    target=config/'volumes'/name;target.mkdir(mode=0o700)
    for path in source.iterdir():
     if path.name=='data':continue
     assert not path.is_symlink()
     if path.is_dir():copy_tree(path,target/path.name)
     else:shutil.copyfile(path,target/path.name)
   else:copy_tree(source,config/'volumes'/name)
 for name in ('integrations','production','public-gateway'):
  source=Path('/opt/kws')/name;destination=config/name;destination.mkdir(mode=0o700)
  for path in source.iterdir():
   if path.is_file():shutil.copyfile(path,destination/path.name)
 for name in ('video-production','web-production'):
  source=Path('/opt/kws')/name;destination=config/name;destination.mkdir(mode=0o700)
  for path in source.iterdir():
   if path.is_file():shutil.copyfile(path,destination/path.name)
 copy_tree(Path('/opt/kws/web-production/source/dist'),work/'web')
 gateway=json.loads(subprocess.check_output(['docker','inspect','kws-public-gateway-caddy-1'],stderr=log))[0]
 for mount in gateway['Mounts']:
  if mount['Destination']=='/data':copy_tree(Path(mount['Source']),config/'tls-data')
 # Store private evidence. Completed sets contain no unbounded console output.
 jobs=[]
 for path in (work/'video/jobs').glob('*.json'):
  value=json.loads(path.read_text());jobs.append(value.get('status','unknown'))
 files={str(path.relative_to(work)):{'bytes':path.stat().st_size,'sha256':digest(path)} for path in work.rglob('*') if path.is_file() and path.name!='diagnostics.log'}
 manifest={'created_at':stamp,'database':database,'rehearsal':bool(args.rehearsal_database),'consistent_database_snapshot':True,'database_rows':database_rows,'sequences':sequences,'vault_root_key_included':True,'storage_versions_verified':len(storage),'public_media_references_present':len(media_refs),'in_flight_video_jobs':sum(v in ('queued','processing') for v in jobs),'files':files}
 (work/'manifest.json').write_text(json.dumps(manifest)+'\n')
 recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],text=True).strip()
 archive=base/(stamp+'.tar.age');partial=Path(str(archive)+'.partial')
 with partial.open('xb') as output:
  encrypt=subprocess.Popen(['age','-r',recipient],stdin=subprocess.PIPE,stdout=output,stderr=log)
  with tarfile.open(fileobj=encrypt.stdin,mode='w|') as tar:
   for path in work.iterdir():
    if path.name!='diagnostics.log':tar.add(path,arcname=path.name)
  encrypt.stdin.close();assert encrypt.wait()==0
 # Prove every archived byte can be decrypted, before retaining this backup.
 decrypt=subprocess.Popen(['age','-d','-i','/root/.config/kws-migration/age-key.txt',str(partial)],stdout=subprocess.PIPE,stderr=log)
 verified=set();restored_manifest=None
 with tarfile.open(fileobj=decrypt.stdout,mode='r|') as tar:
  for member in tar:
   if not member.isfile():continue
   assert not Path(member.name).is_absolute() and '..' not in Path(member.name).parts
   content=tar.extractfile(member)
   if member.name=='manifest.json':restored_manifest=json.load(content);continue
   expected=files[member.name];assert member.size==expected['bytes']
   assert hashlib.file_digest(content,'sha256').hexdigest()==expected['sha256'];verified.add(member.name)
 assert decrypt.wait()==0 and verified==set(files) and restored_manifest==manifest
 partial.rename(archive);checksum=digest(archive)
 Path(str(archive)+'.sha256').write_text(checksum+'  '+archive.name+'\n')
 report={'archive':archive.name,'database':database,'rehearsal':bool(args.rehearsal_database),'decrypted_files_verified':len(verified),'vault_root_key_included':True,'storage_versions_verified':len(storage),'media_references_present':len(media_refs),'database_restore_tested':False,'independent_backup_location':False}
 Path(str(archive)+'.verified.json').write_text(json.dumps(report)+'\n')
 # Bounded retention: latest seven daily sets plus one per each of four weeks.
 backups=sorted(base.glob('*.tar.age'));keep=set(backups[-7:]);weeks={}
 for path in reversed(backups):
  date=datetime.datetime.strptime(path.name[:16],'%Y%m%dT%H%M%SZ').date();week=date.isocalendar()[:2]
  if week not in weeks and len(weeks)<4:weeks[week]=path
 keep.update(weeks.values())
 for path in backups:
  if path not in keep and Path(str(path)+'.verified.json').exists():
   for suffix in ('','.sha256','.verified.json'):Path(str(path)+suffix).unlink(missing_ok=True)
 log.close();shutil.rmtree(work)
 print(json.dumps(report))
except Exception as error:
 frames=traceback.extract_tb(error.__traceback__)
 failure_line=next((frame.lineno for frame in frames if frame.filename==__file__),None)
 print(json.dumps({'backup_failed':True,'error_class':type(error).__name__,'failure_line':failure_line,'last_verified_backups_retained':True}))
 raise SystemExit(1)
finally:
 if controller is not None:
  try:controller.stdin.write('ROLLBACK;\n\\q\n');controller.stdin.flush();controller.communicate(timeout=10)
  except Exception:controller.kill();controller.wait()
 # Plain dumps/config must not accumulate after an interrupted or failed run.
 # Encrypted .partial archives may remain for diagnosis; verified sets survive.
 if not log.closed:log.close()
 if work.exists():
  assert work.parent==base and re.fullmatch(r'\d{8}T\d{6}Z\.work',work.name)
  shutil.rmtree(work)
