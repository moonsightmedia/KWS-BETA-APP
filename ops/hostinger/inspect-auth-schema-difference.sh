#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import re
stage=sorted(p for p in Path('/var/backups/kws/migration').glob('database-precopy-*.tar.age.restore-test') if (p/'RESTORE-VERIFIED.json').is_file())[-1]
sql=next(stage.glob('*/internal-schema.sql')).read_text()
# Only table DDL for identified differences; never print function bodies/records.
for name in ('mfa_recovery_code_sets','mfa_recovery_codes','scim_tokens','scim_users','one_time_tokens'):
    match=re.search(r'CREATE TABLE auth\.'+name+r' \([\s\S]*?\n\);',sql)
    print(match.group(0) if match else 'DDL_NOT_FOUND:'+name)
PY
