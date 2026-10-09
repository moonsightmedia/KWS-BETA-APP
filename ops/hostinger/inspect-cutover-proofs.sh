#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json
paths=[Path('/var/backups/kws/rehearsal/20261009T130636Z.tar.age.restore-verified.json'),
 Path('/var/backups/kws/migration/kws_restore_probe_20261009_092807/DATA-VERIFIED.json'),
 Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055/API-TEST-RESULTS.json'),
 Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055/LIVE-FLOWS-VERIFIED.json')]
for path in paths:
 if not path.exists():print(json.dumps({'proof':path.name,'exists':False}));continue
 proof=json.loads(path.read_text())
 print(json.dumps({'proof':path.name,'exists':True,'keys':{key:(value if isinstance(value,(bool,int)) else type(value).__name__) for key,value in proof.items()}}))
print(json.dumps({'proof_files':sorted(p.name for p in Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055').glob('*VERIFIED*.json'))}))
PY
