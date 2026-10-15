"""Create an encrypted Storage copy on the KWS target only.

Credentials arrive through stdin, never argv or output. This is not a database
backup or a consistent final migration snapshot while the source is writable.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tarfile
import urllib.error
import urllib.parse
import urllib.request

if os.geteuid() != 0 or socket.gethostname().split('.')[0] != 'srv2044594':
    raise SystemExit('Unexpected target')
os.umask(0o077)
credential = json.loads(sys.stdin.readline())
key = credential['service_key']
export_stage = credential.get('export_stage', 'precopy')
assert export_stage in ('precopy','final')
backup_base = Path('/var/backups/kws/migration')
reusable = {}
if export_stage == 'final':
    gate=json.loads((backup_base/'SOURCE-MAINTENANCE-GATE.json').read_text())
    video=json.loads((backup_base/'SOURCE-VIDEO-FROZEN.json').read_text())
    assert gate['active'] is True and gate['api_rejection_verified'] is True
    assert video['stopped'] is True and video['drained'] is True
    previous=max(p for p in backup_base.glob('storage-precopy-*.age.restore-test') if (p/'RESTORE-VERIFIED.json').is_file())
    previous_manifest=next(previous.glob('*/manifest.json'))
    for item in json.loads(previous_manifest.read_text())['objects']:
        reusable[(item['bucket'],item['path'])]=(previous_manifest.parent,item)
base = 'https://pkzzxtsyxwxoraytyjau.supabase.co'
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
root = backup_base / ('storage-' + export_stage + '-' + stamp)
root.mkdir(mode=0o700)

def request(path, body=None):
    headers = {'apikey': key, 'Authorization': 'Bearer ' + key}
    if body is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(base + path, headers=headers,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        return urllib.request.urlopen(req, timeout=120)
    except urllib.error.HTTPError as error:
        raise RuntimeError('Source request failed with HTTP ' + str(error.code)) from None

def get_json(path, body=None):
    with request(path, body) as response:
        return json.load(response)

buckets = get_json('/storage/v1/bucket')
manifest = {'source': base, 'captured_at': stamp, 'kind': export_stage+'-storage-copy',
            'writers_frozen': export_stage == 'final',
            'buckets': buckets, 'objects': []}
total_bytes = 0
summaries = []
downloaded_files = reused_files = 0
for bucket in buckets:
    bucket_id = bucket['id']
    count = 0
    size = 0
    prefixes = ['']
    visited = set()
    while prefixes:
        prefix = prefixes.pop()
        if prefix in visited:
            continue
        visited.add(prefix)
        offset = 0
        while True:
            objects = get_json('/storage/v1/object/list/' + urllib.parse.quote(bucket_id, safe=''),
                               {'prefix': prefix, 'limit': 1000, 'offset': offset,
                                'sortBy': {'column': 'name', 'order': 'asc'}})
            for obj in objects:
                path = prefix + obj['name']
                if obj.get('id') is None and obj.get('metadata') is None:
                    prefixes.append(path + '/')
                    continue
                # Local names depend only on a digest; object paths cannot escape.
                digest_name = hashlib.sha256((bucket_id + '\0' + path).encode()).hexdigest()
                local = root / 'objects' / digest_name
                local.parent.mkdir(mode=0o700, exist_ok=True)
                sha = hashlib.sha256()
                length = 0
                download = '/storage/v1/object/authenticated/' + urllib.parse.quote(bucket_id, safe='') + '/' + urllib.parse.quote(path, safe='/')
                previous=reusable.get((bucket_id,path))
                # Storage updates immutable version/etag and updated_at on every
                # API upload. Only identical metadata can reuse verified bytes.
                signature=('id','updated_at','created_at','version','metadata')
                if previous and all(obj.get(field)==previous[1]['source_metadata'].get(field) for field in signature):
                    previous_path=previous[0]/previous[1]['local']
                    assert previous_path.resolve().is_relative_to(previous[0].resolve())
                    with previous_path.open('rb') as content:
                        assert hashlib.file_digest(content,'sha256').hexdigest()==previous[1]['sha256']
                    import shutil
                    shutil.copyfile(previous_path,local)
                    length=local.stat().st_size
                    with local.open('rb') as content:sha.update(content.read())
                    assert length==previous[1]['bytes']
                    reused_files+=1
                else:
                    with request(download) as response, local.open('xb') as output:
                        while chunk := response.read(1024 * 1024):
                            output.write(chunk); sha.update(chunk); length += len(chunk)
                    downloaded_files+=1
                expected_size = (obj.get('metadata') or {}).get('size')
                if expected_size is not None and int(expected_size) != length:
                    raise RuntimeError('Source object changed or download incomplete')
                manifest['objects'].append({'bucket': bucket_id, 'path': path,
                                            'local': 'objects/' + digest_name,
                                            'sha256': sha.hexdigest(), 'bytes': length,
                                            'source_metadata': obj})
                count += 1; size += length
                if (downloaded_files+reused_files)%250==0:
                    print(json.dumps({'storage_files_processed':downloaded_files+reused_files,'source_files_downloaded':downloaded_files,'verified_files_reused':reused_files}),flush=True)
            if len(objects) < 1000:
                break
            offset += len(objects)
    total_bytes += size
    summaries.append({'bucket': bucket_id, 'files': count, 'bytes': size})
(root / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False) + '\n')
identity = '/root/.config/kws-migration/age-key.txt'
recipient = subprocess.check_output(['age-keygen', '-y', identity], text=True).strip()
archive = root.with_suffix('.tar.gz.age')
temporary = Path(str(archive) + '.partial')
with temporary.open('xb') as output:
    encrypt = subprocess.Popen(['age', '-r', recipient], stdin=subprocess.PIPE, stdout=output)
    try:
        with tarfile.open(fileobj=encrypt.stdin, mode='w|gz') as tar:
            tar.add(root, arcname=root.name)
    finally:
        encrypt.stdin.close()
    if encrypt.wait() != 0:
        raise RuntimeError('Backup encryption failed')
temporary.rename(archive)
with archive.open('rb') as backup:
    checksum = hashlib.file_digest(backup, 'sha256').hexdigest()
Path(str(archive) + '.sha256').write_text(checksum + '  ' + archive.name + '\n')
print(json.dumps({'kind': export_stage+'-storage-copy', 'buckets': summaries,
                  'total_bytes': total_bytes, 'encrypted_archive': str(archive),
                  'source_writers_frozen':export_stage=='final','source_files_downloaded':downloaded_files,'verified_files_reused':reused_files,
                  'database_backup_included': False, 'raw_staging_retained': True}))
