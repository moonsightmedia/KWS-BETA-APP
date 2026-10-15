#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re,subprocess
work=Path('/var/backups/kws/migration/kws_restore_probe_20261009_092807')
data=work/'storage-files'
print(json.dumps({'storage_root_mode':oct(data.stat().st_mode&0o777),'uid':data.stat().st_uid,'gid':data.stat().st_gid,'files':sum(1 for p in data.rglob('*') if p.is_file())}))
raw=subprocess.check_output(['docker','logs','--tail','60','kws-storage-candidate'],stderr=subprocess.STDOUT,text=True)
for line in raw.splitlines():
 try:event=json.loads(line)
 except ValueError:continue
 if event.get('level',0) and isinstance(event['level'],int) and event['level']>=40:
  def safe(value):
   text=str(value)
   text=re.sub(r'eyJ[A-Za-z0-9_.-]+','<redacted-token>',text)
   text=re.sub(r'Bearer\s+\S+','Bearer <redacted>',text,flags=re.I)
   text=re.sub(r'(?i)(password|secret|authorization|apikey|api_key)\s*[:=]\s*[^,\s]+',r'\1=<redacted>',text)
   return text[:1800]
  selected={k:safe(event[k]) for k in ('msg','message','error','err') if k in event}
  print(json.dumps({'candidate_storage_error':selected}))
PY
