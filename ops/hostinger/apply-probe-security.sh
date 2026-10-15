#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess
work=sorted(p for p in Path('/var/backups/kws/migration').glob('kws_restore_probe_*') if (p/'PROBE-TESTS-STARTED.json').is_file())[-1]
db=json.loads((work/'DATA-VERIFIED.json').read_text())['database']
assert db.startswith('kws_restore_probe_') and db!='postgres'
sql=Path('/opt/kws/tools/probe-access-migration.sql').read_bytes()
with (work/'security-migration.log').open('wb') as log:
    subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,
       '-X','-qAt','-v','ON_ERROR_STOP=1'],input=b'BEGIN;\n'+sql+b'\nCOMMIT;\n',stdout=log,stderr=log,check=True)
(work/'PROBE-SECURITY-APPLIED.json').write_text(json.dumps({'database':db,'source_unmodified':True,'main_target_unmodified':True}))
print('PROFILE_PRIVACY_AND_SECTOR_UPLOAD_ROLES_PATCHED_ONLY_IN_PROBE')
PY
