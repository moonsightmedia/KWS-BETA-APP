#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re
p=sorted(p for p in Path('/var/backups/kws/migration').glob('kws_restore_probe_*') if (p/'SCHEMA-COMPARISON.json').is_file())[-1]
src=json.loads((p/'source-schema-metadata.json').read_text());dst=json.loads((p/'target-schema-metadata.json').read_text())
lookup={r['name']:r for r in dst['functions']}
for row in src['functions']:
    target=lookup[row['name']]
    if row==target:continue
    def body(definition):
        m=re.search(r'AS (\$\w*\$)(.*?)\1',definition,re.S)
        return m.group(2) if m else None
    a=body(row['definition']);b=body(target['definition'])
    comments_removed=re.sub(r'(?m)^--[^\n]*\n','',a or '')
    print(json.dumps({'function':row['name'],'body_exact':a==b,'body_equal_after_removed_line_comments':comments_removed==b,
                     'acl_differs':row['acl']!=target['acl'],
                     'source_acl':row['acl'],'target_acl':target['acl']}))
PY
