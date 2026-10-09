#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,hashlib,json,shutil,subprocess
base=Path('/var/backups/kws/migration');root=Path('/opt/kws/video-production')
proof=json.loads((base/'SOURCE-VIDEO-FROZEN.json').read_text())
assert proof['stopped'] and proof['drained']
source=max(p for p in base.glob('video-final-*.tar.age.restore-test') if (p/'RESTORE-VERIFIED.json').exists())
assert not (root/'FILES-FINAL-VERIFIED.json').exists()
running=subprocess.check_output(['docker','ps','--filter','name=^kws-video-production$','--format','{{.Names}}'],text=True).strip()
assert not running
expected={o['path']:o for o in proof['files']}
actual={str(p.relative_to(source)):p for p in source.rglob('*') if p.is_file() and p.name!='RESTORE-VERIFIED.json'}
assert actual.keys()==expected.keys()
for name,path in actual.items():
 assert not path.is_symlink() and path.stat().st_size==expected[name]['bytes']
 with path.open('rb') as stream:assert hashlib.file_digest(stream,'sha256').hexdigest()==expected[name]['sha256']
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
target=root/('data-final-'+stamp);target.mkdir(mode=0o700)
for name,path in actual.items():
 destination=target/name;assert destination.resolve().is_relative_to(target.resolve())
 destination.parent.mkdir(parents=True,mode=0o700,exist_ok=True)
 shutil.copyfile(path,destination);destination.chmod(0o600)
 with destination.open('rb') as stream:assert hashlib.file_digest(stream,'sha256').hexdigest()==expected[name]['sha256']
# Preserve the complete precopy; no file is deleted or overwritten in place.
(root/'data').rename(root/('data-before-final-'+stamp));target.rename(root/'data')
result={'frozen_source_files':len(actual),'bytes':sum(v['bytes'] for v in expected.values()),
 'all_source_sha256_match':True,'encrypted_restore':source.name,'container_started':False,'source_changed':False}
(root/'FILES-FINAL-VERIFIED.json').write_text(json.dumps(result)+'\n');print(json.dumps(result))
PY
