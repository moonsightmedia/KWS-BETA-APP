#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import hashlib,json,shutil
base=Path('/var/backups/kws/migration')
source=max(p for p in base.glob('video-precopy-*.tar.age.restore-test') if (p/'RESTORE-VERIFIED.json').is_file())
proof=json.loads((source/'RESTORE-VERIFIED.json').read_text())
destination=Path('/opt/kws/video-production/data')
assert destination.is_dir() and not any(destination.iterdir()), 'Existing video files require inspection'
files=[p for p in source.rglob('*') if p.is_file() and p.name!='RESTORE-VERIFIED.json']
assert len(files)==proof['restored_files']
assert sum(p.stat().st_size for p in files)==proof['restored_bytes']
for path in files:
 assert not path.is_symlink()
 target=destination/path.relative_to(source)
 target.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
 shutil.copyfile(path,target);target.chmod(0o600)
 with path.open('rb') as left,target.open('rb') as right:
  assert hashlib.file_digest(left,'sha256').digest()==hashlib.file_digest(right,'sha256').digest()
report={'production_precopy_files':len(files),'bytes':proof['restored_bytes'],'verified_against_encrypted_restore':True,'final_source_alignment':False,'container_started':False}
Path('/opt/kws/video-production/FILES-PRECOPIED.json').write_text(json.dumps(report)+'\n')
print(json.dumps(report))
PY
