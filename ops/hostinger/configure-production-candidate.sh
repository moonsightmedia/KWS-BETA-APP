#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import collections,hashlib,json,mimetypes,os,re,shutil,subprocess,urllib.parse
base=Path('/var/backups/kws/migration')
work=sorted(p for p in base.glob('kws_restore_probe_*') if (p/'DATA-VERIFIED.json').exists())[-1]
db=json.loads((work/'DATA-VERIFIED.json').read_text())['database']
assert re.fullmatch(r'kws_restore_probe_[0-9_]+',db)
rehearsal=os.environ.get('KWS_PRODUCTION_REHEARSAL')=='true'
assert (work/'STORAGE-VERIFIED.json').exists() and not (work/'PRODUCTION-CONFIGURED.json').exists()
if not rehearsal:
 manifest=json.loads((Path(json.loads((work/'RESTORE-COMMITTED.json').read_text())['source'])/'manifest.json').read_text())
 assert manifest['stage']=='final' and manifest['writers_frozen']
 assert (work/'TARGET-GATE-REMOVED.json').exists() and not (work/'BACKUP-RESTORE-WITNESS.json').exists()
 assert json.loads(Path('/opt/kws/video-production/FILES-FINAL-VERIFIED.json').read_text())['all_source_sha256_match']
log=(work/'production-configure.log').open('wb')
def sql(query):
 result=subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stdout=subprocess.PIPE,stderr=log)
 assert result.returncode==0,'Protected production configuration SQL failed'
 return result.stdout.decode().strip()
schema=json.loads((work/'SCHEMA-COMPARISON.json').read_text())
assert all(not p['missing'] and not p['extra'] and not p['different'] for p in schema.values())
# Read all references before any edits. Original values stay root-only for rollback.
tables=json.loads(sql("SELECT json_agg(tablename) FROM pg_tables WHERE schemaname='public';"))
rows={}
for table in tables:
 assert table.replace('_','').isalnum()
 rows[table]=json.loads(sql('SELECT coalesce(json_agg(t),\'[]\'::json) FROM public."'+table+'" t;'))
cdn_proof=json.loads((work/'CDN-PRECOPY.json').read_text()) if (work/'CDN-PRECOPY.json').exists() else json.loads((base/'kws_restore_probe_20261008_121055/CDN-PRECOPY.json').read_text())
cdnroot=base/cdn_proof['archive'].removesuffix('.tar.gz.age')
cdn=json.loads((cdnroot/'manifest.json').read_text());media=Path('/opt/kws/web-production/media')
assert rehearsal or cdn['writers_frozen']
mapping={};failed=set()
for item in cdn['objects']:
 if item['status']!=200:failed.add(item['url']);continue
 path=cdnroot/item['local']
 with path.open('rb') as stream:assert hashlib.file_digest(stream,'sha256').hexdigest()==item['sha256']
 name=Path(item['local']).name+(mimetypes.guess_extension(item['content_type']) or '.bin')
 destination=media/name
 if destination.exists():
  with destination.open('rb') as stream:assert hashlib.file_digest(stream,'sha256').hexdigest()==item['sha256']
 else:shutil.copyfile(path,destination);destination.chmod(0o644)
 mapping[item['url']]='https://beta.kletterwelt-sauerland.de/migrated-cdn/'+name
assert len(failed)<=11,'New missing CDN references need review'
storage=set(tuple(v) for v in json.loads(sql('SELECT json_agg(json_build_array(bucket_id,name)) FROM storage.objects;')))
videoroot=Path('/opt/kws/video-production/data/final').resolve()
counts=collections.Counter();missing=collections.Counter()
def convert(value,location):
 if isinstance(value,dict):return {k:convert(v,location) for k,v in value.items()}
 if isinstance(value,list):return [convert(v,location) for v in value]
 if not isinstance(value,str):return value
 if value in mapping:counts['cdn']+=1;return mapping[value]
 if value in failed:missing[location]+=1;return value
 parsed=urllib.parse.urlsplit(value)
 if parsed.scheme not in ('http','https') or parsed.username or parsed.password:return value
 if parsed.hostname=='pkzzxtsyxwxoraytyjau.supabase.co':
  prefix='/storage/v1/object/public/'
  assert parsed.path.startswith(prefix)
  parts=urllib.parse.unquote(parsed.path[len(prefix):]).split('/',1)
  assert len(parts)==2 and tuple(parts) in storage
  counts['storage']+=1
  return urllib.parse.urlunsplit(('https','beta-api.kletterwelt-sauerland.de',parsed.path,parsed.query,parsed.fragment))
 if parsed.hostname=='video.kletterwelt-sauerland.de':
  assert parsed.path.startswith('/videos/') and not parsed.query
  path=(videoroot/urllib.parse.unquote(parsed.path[len('/videos/'):])).resolve()
  assert path.is_relative_to(videoroot) and path.is_file()
  counts['video']+=1;return value
 if parsed.hostname=='cdn.kletterwelt-sauerland.de':raise RuntimeError('CDN reference absent from final inventory')
 return value
def literal(value):return "'"+str(value).replace("'","''")+"'"
originals=[];updates=[]
for table,data in rows.items():
 for row in data:
  for column,old in row.items():
   new=convert(old,table+'.'+column)
   if new==old:continue
   assert column.replace('_','').isalnum() and 'id' in row
   kind=sql("SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name="+literal(table)+" AND column_name="+literal(column)+';')
   assert kind in ('text','character varying','json','jsonb')
   cast=literal(json.dumps(new,ensure_ascii=False))+'::'+kind if kind in ('json','jsonb') else literal(new)
   originals.append({'table':table,'column':column,'id':row['id'],'value':old})
   updates.append('UPDATE public."'+table+'" SET "'+column+'"='+cast+' WHERE id::text='+literal(row['id'])+';')
(work/'PRODUCTION-URL-ORIGINALS.json').write_text(json.dumps(originals,ensure_ascii=False))
security=Path('/opt/kws/tools/probe-access-migration.sql').read_text()
push=Path('/opt/kws/tools/configure-production-push.sql').read_text()
assert 'kws_internal_push_service_key' in push
sql('BEGIN;SET LOCAL session_replication_role=replica;\n'+'\n'.join(updates)+'\n'+security+'\n'+push+'\nREVOKE ALL ON FUNCTION public.send_push_notification_for_notification() FROM PUBLIC,anon,authenticated;\nCOMMIT;')
# COPY avoids putting a secret literal in a SQL statement or command argument.
env=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
key=env['SERVICE_ROLE_KEY'];assert re.fullmatch(r'[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',key)
assert sql("SELECT count(*) FROM vault.secrets WHERE name='kws_internal_push_service_key';")=='0'
payload="BEGIN;CREATE TEMP TABLE kws_runtime_secret(value text);COPY kws_runtime_secret FROM STDIN;\n"+key+"\n\\.\nSELECT vault.create_secret(value,'kws_internal_push_service_key','KWS internal push authorization') FROM kws_runtime_secret;COMMIT;\n"
result=subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=payload.encode(),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
assert result.returncode==0,'Protected Vault seed failed'
decrypted=sql("SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='kws_internal_push_service_key';")
assert decrypted==key;decrypted=None;key=None;payload=None
assert sql("SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Authenticated can read all profiles for leaderboard';")=='0'
assert sql("SELECT has_function_privilege('anon','public.trigger_send_push_notification()','EXECUTE') OR has_function_privilege('authenticated','public.trigger_send_push_notification()','EXECUTE');")=='f'
report={'database':db,'rehearsal':rehearsal,'promotable':not rehearsal,'updated_url_values':len(originals),'reference_occurrences':dict(counts),'existing_missing_cdn_references':dict(missing),'security_patch_applied':True,'push_vault_key_decryption_verified':True,'source_changed':False}
(work/'PRODUCTION-CONFIGURED.json').write_text(json.dumps(report)+'\n');print(json.dumps(report));log.close()
PY
