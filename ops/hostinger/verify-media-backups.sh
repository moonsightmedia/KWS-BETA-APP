#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import collections,hashlib,json,os,re,subprocess,tarfile
base=Path('/var/backups/kws/migration')
identity='/root/.config/kws-migration/age-key.txt'
selected=os.environ.get('KWS_BACKUP_ARCHIVE')
if selected:
    assert re.fullmatch(r'(database|storage|video|cdn)-(precopy|final)-[0-9TZ]+\.tar(?:\.gz)?\.age',selected), 'Invalid archive selection'
    archives=[base/selected]
    assert archives[0].is_file(), 'Selected archive missing'
else:
    archives=sorted(base.glob('*-precopy-*.age'))
for archive in archives:
    if archive.name.endswith('.partial'): continue
    digest=hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()
    recorded=Path(str(archive)+'.sha256').read_text().split()[0]
    assert digest==recorded, 'Encrypted archive checksum mismatch'
    restore=base/(archive.name+'.restore-test')
    if restore.exists():
        assert (restore/'RESTORE-VERIFIED.json').is_file(), 'Previous restore incomplete; inspect before retrying'
        print(json.dumps({'archive':archive.name,'restore_test':'already-present-not-retested'}))
        continue
    restore.mkdir(mode=0o700)
    decrypt=subprocess.Popen(['age','-d','-i',identity,str(archive)],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    count=0; byte_count=0; qualities=collections.Counter()
    with tarfile.open(fileobj=decrypt.stdout,mode='r|*') as tar:
        for member in tar:
            name=Path(member.name)
            assert not name.is_absolute() and '..' not in name.parts, 'Unsafe archive member'
            assert member.isdir() or member.isfile(), 'Unexpected archive member type'
            path=restore/name
            assert path.resolve().is_relative_to(restore.resolve()), 'Archive escape'
            if member.isdir(): path.mkdir(parents=True,exist_ok=True,mode=0o700); continue
            path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
            with tar.extractfile(member) as source,path.open('xb') as target:
                while chunk:=source.read(1024*1024): target.write(chunk)
            assert path.stat().st_size==member.size
            count+=1; byte_count+=member.size
            for quality in ('hd','sd','low'):
                if path.name.endswith('_'+quality+'.mp4'): qualities[quality]+=1
    decrypt.stdout.close()
    assert decrypt.wait()==0, 'Archive authentication failed'
    verified_objects=0
    verified_database_files=0
    if archive.name.startswith('database-'):
        manifests=list(restore.glob('*/manifest.json'))
        assert len(manifests)==1
        manifest_path=manifests[0]
        manifest=json.loads(manifest_path.read_text())
        for name,expected in manifest['files'].items():
            path=manifest_path.parent/name
            assert path.resolve().is_relative_to(manifest_path.parent.resolve())
            assert path.stat().st_size==expected['bytes']
            with path.open('rb') as stream: actual=hashlib.file_digest(stream,'sha256').hexdigest()
            assert actual==expected['sha256'], 'Restored database file checksum mismatch'
            verified_database_files+=1
    if archive.name.startswith('storage-'):
        manifests=list(restore.glob('*/manifest.json'))
        assert len(manifests)==1
        manifest_path=manifests[0]
        manifest=json.loads(manifest_path.read_text())
        for item in manifest['objects']:
            path=manifest_path.parent/item['local']
            assert path.resolve().is_relative_to(manifest_path.parent.resolve())
            assert path.stat().st_size==item['bytes']
            with path.open('rb') as stream: actual=hashlib.file_digest(stream,'sha256').hexdigest()
            assert actual==item['sha256'], 'Restored object checksum mismatch'
            verified_objects+=1
    result={'archive':archive.name,'restored_files':count,'restored_bytes':byte_count,
            'video_qualities':dict(qualities),'verified_storage_objects':verified_objects,
            'verified_database_files':verified_database_files,
            'authenticated_decryption':True,'final_source_comparison':False}
    (restore/'RESTORE-VERIFIED.json').write_text(json.dumps(result)+'\n')
    print(json.dumps(result))
PY
