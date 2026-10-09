#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re
stage=sorted(p for p in Path('/var/backups/kws/migration').glob('database-precopy-*') if p.is_dir() and not p.name.endswith('restore-test'))[-1]
text=(stage/'diagnostics.log').read_text(errors='replace')
print(json.dumps({'stage':stage.name,'files':[{'name':p.name,'bytes':p.stat().st_size} for p in stage.iterdir() if p.is_file()]}))
for phrase in ('invalid snapshot identifier','permission denied','SSL error','Connection reset','server closed the connection','timeout','could not connect','password authentication failed','unrecognized configuration parameter','snapshot does not exist','invalid command','Broken pipe','terminating connection','does not exist','ERROR:'):
    if phrase in text:print(json.dumps({'diagnostic_class':phrase,'occurrences':text.count(phrase)}))
for relation in re.findall(r'(?:table|relation|column|schema) "([A-Za-z0-9_.]+)"',text):print(json.dumps({'diagnostic_identifier':relation}))
print(json.dumps({'cli_markers':{term:term in text for term in ('keep-comments','data-only','role-only','use-copy','cannot','Cannot','unknown flag','mutually exclusive','incompatible','unsupported')}}))
PY
