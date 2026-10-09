#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,hashlib,json,os,re,shutil,subprocess,tarfile
kind=os.environ.get('KWS_RESTORE_BACKUP_KIND','rehearsal')
assert kind in ('rehearsal','production')
base=Path('/var/backups/kws')/kind
archive=max(p for p in base.glob('*.tar.age') if Path(str(p)+'.verified.json').exists())
assert re.fullmatch(r'\d{8}T\d{6}Z\.tar\.age',archive.name)
assert json.loads(Path(str(archive)+'.verified.json').read_text())['rehearsal']==(kind=='rehearsal')
work=base/(archive.name+'.restore-work');work.mkdir(mode=0o700)
decrypt=None;database='kws_backup_restore_'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d_%H%M%S')
client=['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',database,'-X','-qAt','-v','ON_ERROR_STOP=1']
def sql(query,initial=False):
 command=client.copy()
 if initial:command[command.index('-d')+1]='postgres'
 return subprocess.check_output(command,input=query.encode(),stderr=subprocess.DEVNULL).decode().strip()
try:
 hashes={};manifest=None
 decrypt=subprocess.Popen(['age','-d','-i','/root/.config/kws-migration/age-key.txt',str(archive)],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 with tarfile.open(fileobj=decrypt.stdout,mode='r|') as tar:
  for member in tar:
   assert not Path(member.name).is_absolute() and '..' not in Path(member.name).parts
   assert member.isdir() or member.isfile()
   if not member.isfile():continue
   content=tar.extractfile(member)
   if member.name=='manifest.json':manifest=json.load(content);continue
   if member.name in ('database.dump','config/postgres-custom/pgsodium_root.key'):
    path=work/Path(member.name).name
    with path.open('xb') as target:shutil.copyfileobj(content,target)
    with path.open('rb') as source:digest=hashlib.file_digest(source,'sha256').hexdigest()
   else:digest=hashlib.file_digest(content,'sha256').hexdigest()
   hashes[member.name]={'bytes':member.size,'sha256':digest}
 assert decrypt.wait()==0;decrypt=None
 assert hashes==manifest['files'] and manifest['database_rows']
 original=subprocess.check_output(['docker','exec','supabase-db','cat','/etc/postgresql-custom/pgsodium_root.key'],stderr=subprocess.DEVNULL)
 assert original==(work/'pgsodium_root.key').read_bytes()
 del original
 sql('CREATE DATABASE '+database+' WITH TEMPLATE template0;',initial=True)
 with (work/'database.dump').open('rb') as source:
  result=subprocess.run(['docker','exec','-i','supabase-db','pg_restore','-U','supabase_admin','-d',database,'--single-transaction','--exit-on-error','--disable-triggers'],stdin=source,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 if result.returncode:
  # Definitions can contain embedded old credentials: retain no raw restore log.
  raise RuntimeError('Isolated pg_restore failed; database retained')
 for relation,expected in manifest['database_rows'].items():
  schema,table=relation.split('.');assert all(v.replace('_','').isalnum() for v in (schema,table))
  canonical=sql("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb)::text FROM \""+schema+'"."'+table+'" t;')
  assert len(json.loads(canonical))==expected['rows']
  assert hashlib.sha256(canonical.encode()).hexdigest()==expected['sha256'], 'Restored rows differ'
 for relation,expected in manifest['sequences'].items():
  schema,name=relation.split('.');assert all(v.replace('_','').isalnum() for v in (schema,name))
  assert json.loads(sql('SELECT json_build_object(\'last_value\',last_value,\'is_called\',is_called) FROM "'+schema+'"."'+name+'";'))==expected
 if kind=='rehearsal':
  assert sql("SELECT decrypted_secret='KWS backup restore test witness' FROM vault.decrypted_secrets WHERE name='kws_backup_restore_witness';")=='t'
  assert sql('SELECT count(*) FROM auth.users;',initial=True)=='0'
 else:
  expected=sql("SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='kws_internal_push_service_key';",initial=True)
  restored=sql("SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='kws_internal_push_service_key';")
  assert expected and expected==restored
  del expected,restored
 report={'archive':archive.name,'isolated_restored_database':database,'database_restore_tested':True,'tables_with_exact_rows':len(manifest['database_rows']),'rows_verified':sum(v['rows'] for v in manifest['database_rows'].values()),'sequences_verified':len(manifest['sequences']),'decrypted_files_verified':len(hashes),'vault_decryption_verified':True,'main_target_unchanged':True,'source_unchanged':True}
 Path(str(archive)+'.restore-verified.json').write_text(json.dumps(report)+'\n')
 print(json.dumps(report))
except Exception as error:
 print(json.dumps({'restore_test_failed':True,'error_class':type(error).__name__,'candidate_database_retained':database,'source_unchanged':True}))
 raise SystemExit(1)
finally:
 if decrypt is not None:decrypt.kill();decrypt.wait()
 assert work.parent==base and work.name.endswith('.restore-work')
 shutil.rmtree(work)
PY
