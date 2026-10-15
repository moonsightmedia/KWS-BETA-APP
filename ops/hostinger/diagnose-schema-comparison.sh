#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json
p=sorted(p for p in Path('/var/backups/kws/migration').glob('kws_restore_probe_*') if (p/'SCHEMA-COMPARISON.json').is_file())[-1]
src=json.loads((p/'source-schema-metadata.json').read_text());dst=json.loads((p/'target-schema-metadata.json').read_text())
for kind in ('functions','constraints'):
    lookup={r['name']:r for r in dst[kind]}
    examples=[]
    for row in src[kind]:
        fields=[k for k in row if row[k]!=lookup[row['name']][k]]
        if fields:
            examples.append({'name':row['name'],'fields':fields})
            if kind=='functions' and 'proconfig' in fields:
                # Only nonsecret search_path identifiers; never expose hook values.
                a=[c for c in (row['proconfig'] or []) if c.startswith('search_path=')]
                b=[c for c in (lookup[row['name']]['proconfig'] or []) if c.startswith('search_path=')]
                examples[-1].update(source_search_path=a,target_search_path=b)
            if kind=='constraints':examples[-1].update(source_definition=row['definition'],target_definition=lookup[row['name']]['definition'])
        if len(examples)>=4:break
    print(json.dumps({kind:examples}))
PY
