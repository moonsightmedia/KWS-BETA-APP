#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,hashlib,json,re,shutil,subprocess
base=Path('/var/backups/kws/migration')
stage=Path('/home/kws-admin/.kws-encrypted-backup-export')/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
stage.mkdir(mode=0o700,parents=True)
files=[]
for kind in ('database','storage','video','cdn'):
 candidates=[]
 for archive in base.glob(kind+'-*.age'):
  if not re.fullmatch(kind+r'-(?:precopy|final)-\d{8}T\d{6}Z\.tar(?:\.gz)?\.age',archive.name):continue
  proof=Path(str(archive)+'.restore-test')/'RESTORE-VERIFIED.json'
  if kind=='cdn':proof=Path(str(archive).removesuffix('.tar.gz.age'))/'RESTORE-VERIFIED.json'
  if proof.is_file():candidates.append(archive)
 assert candidates, 'Verified encrypted archive missing'
 archive=max(candidates,key=lambda p:re.search(r'\d{8}T\d{6}Z',p.name).group())
 expected=Path(str(archive)+'.sha256').read_text().split()[0]
 assert re.fullmatch('[a-f0-9]{64}',expected)
 with archive.open('rb') as content:assert hashlib.file_digest(content,'sha256').hexdigest()==expected
 target=stage/archive.name;shutil.copyfile(archive,target);target.chmod(0o600)
 files.append({'kind':kind,'name':archive.name,'bytes':archive.stat().st_size,'sha256':expected})
manifest={'files':files,'encrypted_only':True,'final_aligned_cutover_set':False}
(stage/'manifest.json').write_text(json.dumps(manifest)+'\n')
subprocess.run(['chown','-R','kws-admin:kws-admin',str(stage)],check=True)
stage.parent.chmod(0o700);subprocess.run(['chown','kws-admin:kws-admin',str(stage.parent)],check=True)
print(json.dumps({'transfer_directory':str(stage),'files':files,'encrypted_only':True,'source_changed':False}))
PY
