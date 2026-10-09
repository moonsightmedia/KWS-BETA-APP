#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,hashlib,json,subprocess
base=Path('/var/backups/kws/migration');source=Path('/opt/kws/video-production/data')
proof=json.loads((base/'SOURCE-VIDEO-FROZEN.json').read_text());gate=json.loads((base/'SOURCE-MAINTENANCE-GATE.json').read_text())
assert proof['stopped'] and proof['drained'] and gate['active'] and gate['api_rejection_verified']
expected={item['path']:item for item in proof['files']}
actual={str(p.relative_to(source)):p for p in source.rglob('*') if p.is_file()}
assert actual.keys()==expected.keys(),'Changed video file set requires final delta transfer'
mismatches=[]
for name,path in actual.items():
 assert not path.is_symlink() and path.resolve().is_relative_to(source.resolve())
 with path.open('rb') as stream:digest=hashlib.file_digest(stream,'sha256').hexdigest()
 if path.stat().st_size!=expected[name]['bytes'] or digest!=expected[name]['sha256']:mismatches.append(name)
print(json.dumps({'verified_precopy_files':len(actual),'frozen_source_hash_mismatches':len(mismatches)}),flush=True)
assert not mismatches,'Changed video bytes require final delta transfer'
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
archive=base/('video-final-'+stamp+'.tar.age');partial=Path(str(archive)+'.partial')
recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],text=True).strip()
tar=subprocess.Popen(['tar','-C',str(source),'-cf','-','.'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
subprocess.run(['age','-r',recipient,'-o',str(partial)],stdin=tar.stdout,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
tar.stdout.close();assert tar.wait()==0
partial.rename(archive)
with archive.open('rb') as stream:digest=hashlib.file_digest(stream,'sha256').hexdigest()
Path(str(archive)+'.sha256').write_text(digest+'  '+archive.name+'\n')
report={'archive':archive.name,'files':len(actual),'all_frozen_source_sha256_match':True,'source_stopped':True,'bytes':sum(item['bytes'] for item in expected.values()),'method':'verified-identical-precopy'}
(base/'VIDEO-FINAL-ARCHIVE.json').write_text(json.dumps(report)+'\n');print(json.dumps(report))
PY
