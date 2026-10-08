#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json
work=sorted(p for p in Path('/var/backups/kws/migration').glob('kws_restore_probe_*') if (p/'SCHEMA-COMPARISON.json').is_file())[-1]
source=json.loads((work/'source-schema-metadata.json').read_text())
for row in source['policies']:
    if row['name'].startswith('profiles.') or (row['name'].startswith('objects.') and row['cmd'] in ('ALL','INSERT','UPDATE')):
        print(json.dumps(row))
inventory=json.loads((Path(json.loads((work/'RESTORE-COMMITTED.json').read_text())['source'])/'inventory.json').read_text())
print(json.dumps({'profile_columns':[r['column_name'] for r in inventory['columns'] if r['table_schema']=='public' and r['table_name']=='profiles']}))
PY
