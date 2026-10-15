#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import concurrent.futures,hashlib,json,subprocess,urllib.request,urllib.parse,urllib.error
base=Path('/var/backups/kws/migration')
work=sorted(p for p in base.glob('kws_restore_probe_*') if (p/'services.json').is_file())[-1]
assert not (work/'STORAGE-VERIFIED.json').exists(), 'Import already verified; do not repeat automatically'
services=json.loads((work/'services.json').read_text());db=services['database']
storage_port=next(s['port'] for s in services['services'] if 'storage' in s['name'])
assert isinstance(storage_port,int) and 9900<=storage_port<=9999
storage_origin='http://127.0.0.1:'+str(storage_port)
storage=max((p for p in base.glob('storage-*.age.restore-test') if (p/'RESTORE-VERIFIED.json').is_file()),key=lambda p:json.loads(next(p.glob('*/manifest.json')).read_text())['captured_at'])
manifest_path=next(storage.glob('*/manifest.json'))
manifest=json.loads(manifest_path.read_text())
source_database_manifest=json.loads((Path(json.loads((work/'RESTORE-COMMITTED.json').read_text())['source'])/'manifest.json').read_text())
if source_database_manifest.get('stage')=='final':
    assert manifest.get('writers_frozen') is True, 'Final database requires frozen Storage set'
config={}
for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines():
    if line and not line.startswith('#') and '=' in line:
        key,value=line.split('=',1);config[key]=value.strip('"\'')
key=config['SERVICE_ROLE_KEY']
log=(work/'storage-import.log').open('wb')
def sql(query):
    return subprocess.check_output(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,
      '-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stderr=log)
rows=json.loads(sql('SELECT coalesce(json_agg(t),\'[]\'::json) FROM storage.objects t;'))
current_rows={(r['bucket_id'],r['name']):r for r in rows}
storage_service=next(s for s in services['services'] if 'storage' in s['name'])
storage_env=dict(line.split('=',1) for line in json.loads(subprocess.check_output(['docker','inspect',storage_service['name']]))[0]['Config']['Env'])
storage_root=(work/'storage-files').resolve()
assert len(rows)==len(manifest['objects']) and len(rows)>0
original_metadata=work/'storage-metadata-before.json'
if original_metadata.exists():
    rows=json.loads(original_metadata.read_text())
else:
    original_metadata.write_text(json.dumps(rows))
source_rows={(r['bucket_id'],r['name']):r for r in rows}
for item in manifest['objects']:
    row=source_rows[(item['bucket'],item['path'])]
    assert row['id']==item['source_metadata']['id'], 'Media precopy differs from database snapshot'
    assert int(row['metadata']['size'])==item['bytes']
print(json.dumps({'storage_precopy_metadata_matches':len(rows),'database':db}),flush=True)

def transfer(item):
    local=manifest_path.parent/item['local']
    assert local.resolve().is_relative_to(manifest_path.parent.resolve())
    payload=local.read_bytes();assert hashlib.sha256(payload).hexdigest()==item['sha256']
    path=urllib.parse.quote(item['bucket'],safe='')+'/'+urllib.parse.quote(item['path'],safe='/')
    mime=(item['source_metadata'].get('metadata') or {}).get('mimetype','application/octet-stream')
    headers={'Authorization':'Bearer '+key,'Content-Type':mime,'x-upsert':'true'}
    try:
        # Resume interrupted imports by proving existing bytes before uploading.
        existing_row=current_rows[(item['bucket'],item['path'])]
        physical=(storage_root/storage_env['TENANT_ID']/storage_env['GLOBAL_S3_BUCKET']/item['bucket']/item['path']/existing_row['version']).resolve()
        assert physical.is_relative_to(storage_root)
        # Imported metadata can precede physical files. Storage API v1.74 returns
        # a generic 500/ENOENT for that state; avoid the read rather than masking
        # every server error. Once a file exists, any unexpected 500 is fatal.
        try:
            if not physical.is_file():raise FileNotFoundError
            with urllib.request.urlopen(urllib.request.Request(storage_origin+'/object/authenticated/'+path,
                    headers={'Authorization':'Bearer '+key}),timeout=120) as response:
                existing=response.read()
            if len(existing)==item['bytes'] and hashlib.sha256(existing).hexdigest()==item['sha256']:
                return item['bytes']
        except FileNotFoundError:
            pass
        except urllib.error.HTTPError as error:
            if error.code not in (400,404):raise
        with urllib.request.urlopen(urllib.request.Request(storage_origin+'/object/'+path,
                    data=payload,headers=headers,method='POST'),timeout=120) as response:
            assert response.status in (200,201);response.read()
        with urllib.request.urlopen(urllib.request.Request(storage_origin+'/object/authenticated/'+path,
                    headers={'Authorization':'Bearer '+key}),timeout=120) as response:
            downloaded=response.read()
        assert len(downloaded)==item['bytes'] and hashlib.sha256(downloaded).hexdigest()==item['sha256']
        return item['bytes']
    except urllib.error.HTTPError as error:
        # Save detailed provider diagnostic privately, never propagate request URLs/keys.
        (work/'storage-http-error.json').write_bytes(error.read())
        raise RuntimeError('Storage transfer HTTP '+str(error.code)) from None

total_bytes=0;count=0
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    for length in executor.map(transfer,manifest['objects']):
        total_bytes+=length;count+=1
        if count%250==0:print(json.dumps({'storage_import_verified':count,'total':len(rows)}),flush=True)
# Upload APIs update storage versions; preserve versions needed for serving the
# new physical files, while restoring source ownership, IDs and original dates.
def literal(value):
    return 'NULL' if value is None else "'"+str(value).replace("'","''")+"'"
updates=['BEGIN; SET LOCAL session_replication_role=replica;']
for row in rows:
    fields=['id='+literal(row['id'])+'::uuid',
            'owner='+literal(row.get('owner'))+'::uuid',
            'owner_id='+literal(row.get('owner_id')),
            'created_at='+literal(row.get('created_at'))+'::timestamptz',
            'updated_at='+literal(row.get('updated_at'))+'::timestamptz',
            'last_accessed_at='+literal(row.get('last_accessed_at'))+'::timestamptz',
            'user_metadata='+literal(json.dumps(row.get('user_metadata'))) +'::jsonb' if row.get('user_metadata') is not None else 'user_metadata=NULL']
    updates.append('UPDATE storage.objects SET '+','.join(fields)+' WHERE bucket_id='+literal(row['bucket_id'])+' AND name='+literal(row['name'])+';')
updates.append('COMMIT;')
sql('\n'.join(updates))
after=json.loads(sql('SELECT coalesce(json_agg(t),\'[]\'::json) FROM storage.objects t;'))
assert len(after)==len(rows)
invariants=['id','bucket_id','name','owner','owner_id','created_at','updated_at','last_accessed_at','user_metadata']
assert all(all(r.get(k)==source_rows[(r['bucket_id'],r['name'])].get(k) for k in invariants) for r in after)
result={'database':db,'objects_uploaded_and_download_verified':count,'bytes':total_bytes,
 'all_sha256_match':True,'source_ownership_ids_dates_preserved':True,'storage_versions_recreated_by_api':True,
 'final_live_source_comparison':False,'production_cutover':False}
(work/'STORAGE-VERIFIED.json').write_text(json.dumps(result))
print(json.dumps(result),flush=True)
log.close()
PY
