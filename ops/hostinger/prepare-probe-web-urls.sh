#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
import collections,hashlib,json,mimetypes,shutil,subprocess,urllib.parse
from pathlib import Path
work=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
assert (work/'API-VERIFIED.json').is_file() and (work/'STORAGE-VERIFIED.json').is_file()
assert not (work/'URLS-REWRITTEN.json').exists(), 'Do not overwrite the original URL rollback evidence'
db='kws_restore_probe_20261008_121055';origin='http://127.0.0.1:9090'
cdn=json.loads((work/'CDN-PRECOPY.json').read_text())
cdnroot=work.parent/cdn['archive'].removesuffix('.tar.gz.age')
manifest=json.loads((cdnroot/'manifest.json').read_text())
media=Path('/opt/kws/probe-web/media');media.mkdir(mode=0o755,parents=True,exist_ok=True)
mapping={};failed=set()
for o in manifest['objects']:
    if o['status']!=200:failed.add(o['url']);continue
    path=cdnroot/o['local']
    with path.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==o['sha256']
    name=Path(o['local']).name+(mimetypes.guess_extension(o['content_type']) or '.bin')
    destination=media/name
    if destination.exists():
        with destination.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==o['sha256']
    else:shutil.copyfile(path,destination);destination.chmod(0o644)
    mapping[o['url']]=origin+'/migrated-cdn/'+name
def query(sql):
    return subprocess.check_output(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=sql,text=True)
storage=set(tuple(v) for v in json.loads(query("SELECT json_agg(json_build_array(bucket_id,name)) FROM storage.objects;")))
videoroot=Path('/opt/kws/video-private/data/final').resolve()
counts=collections.Counter();unavailable=collections.Counter()
def convert(value,location):
    if isinstance(value,dict):return {k:convert(v,location) for k,v in value.items()}
    if isinstance(value,list):return [convert(v,location) for v in value]
    if not isinstance(value,str):return value
    if value in mapping:counts['cdn']+=1;return mapping[value]
    if value in failed:unavailable[location]+=1;return value
    parsed=urllib.parse.urlsplit(value)
    if parsed.scheme not in ('http','https') or parsed.username or parsed.password:return value
    if parsed.hostname=='pkzzxtsyxwxoraytyjau.supabase.co':
        prefix='/storage/v1/object/public/'
        assert parsed.path.startswith(prefix), 'Non-public source Storage URL needs separate review'
        parts=urllib.parse.unquote(parsed.path[len(prefix):]).split('/',1)
        assert len(parts)==2 and tuple(parts) in storage,'Source storage reference is missing from verified target'
        counts['storage']+=1
        return origin+parsed.path+('?' + parsed.query if parsed.query else '')+('#'+parsed.fragment if parsed.fragment else '')
    if parsed.hostname=='video.kletterwelt-sauerland.de':
        assert parsed.path.startswith('/videos/') and not parsed.query
        relative=urllib.parse.unquote(parsed.path[len('/videos/'):]);path=(videoroot/relative).resolve()
        assert path.is_relative_to(videoroot) and path.is_file(),'Video reference not in verified published files'
        counts['video']+=1;return origin+'/video-api'+parsed.path
    if parsed.hostname=='cdn.kletterwelt-sauerland.de':raise RuntimeError('CDN reference not included in protected inventory')
    return value
inventory=json.loads((work/'URL-INVENTORY.json').read_text())
columns=[(o['table'],o['column']) for o in inventory]
originals=[];statements=[]
def literal(v):return "'"+v.replace("'","''")+"'"
for table,column in columns:
    assert all(name.replace('_','').isalnum() for name in (table,column))
    data=json.loads(query('SELECT json_agg(json_build_object(\'id\',id,\'value\',"'+column+'")) FROM public."'+table+'";')) or []
    kind=query("SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name="+literal(table)+" AND column_name="+literal(column)+";").strip()
    assert kind in ('text','character varying','jsonb','json')
    for row in data:
        value=convert(row['value'],table+'.'+column)
        if value!=row['value']:
            originals.append({'table':table,'column':column,**row})
            cast=literal(json.dumps(value,ensure_ascii=False))+'::'+kind if kind in ('json','jsonb') else literal(value)
            statements.append('UPDATE public."'+table+'" SET "'+column+'"='+cast+' WHERE id::text='+literal(str(row['id']))+';')
(work/'URL-ORIGINALS.json').write_text(json.dumps(originals,ensure_ascii=False,indent=2))
sql='BEGIN; SET LOCAL session_replication_role=replica;\n'+'\n'.join(statements)+'\nCOMMIT; NOTIFY pgrst, \'reload schema\';'
(work/'probe-url-rewrite.sql').write_text(sql)
query(sql)
result={'database':db,'updated_column_values':len(originals),'url_occurrences':dict(counts),'already_missing_historical_references':dict(unavailable),'cdn_files':len(mapping),'source_changed':False,'final_cutover_configuration':False}
(work/'URLS-REWRITTEN.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
PY
