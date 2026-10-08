#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re,subprocess
p=sorted(Path('/var/backups/kws/migration').glob('kws_restore_probe_*'))[-1]
text=(p/'restore.log').read_text(errors='replace')
safe_patterns=[r'ERROR:\s+(?:type|relation|column|function|schema|role|constraint|index|database) "[A-Za-z0-9_.]+" (?:already exists|does not exist|is being accessed by other users)',
 r'ERROR:\s+source database "[A-Za-z0-9_]+" is being accessed by other users',
 r'ERROR:\s+permission denied[^\n]*',r'ERROR:\s+cannot create[^\n]*',r'ERROR:\s+must be[^\n]*',
 r'ERROR:\s+new collation \([A-Za-z0-9_.-]+\) is incompatible with the collation of the template database \([A-Za-z0-9_.-]+\)',
 r'ERROR:\s+terminating connection due to administrator command']
for line in text.splitlines():
    if 'pg_restore: error:' in line:
        for phrase in ('unsupported version','could not open input file','could not open TOC file','input file does not appear','could not read from input file','Permission denied','read-only','cannot specify both --schema-only and --data-only','one of -d/--dbname and -f/--file must be specified'):
            if phrase in line: print('PG_RESTORE:'+phrase)
        continue
    if 'ERROR:' not in line: continue
    found=next((m.group(0) for pat in safe_patterns if (m:=re.search(pat,line))),None)
    print(found or 'UNCLASSIFIED_ERROR_REQUIRES_PROTECTED_LOCAL_CLASSIFICATION')
print(json.dumps({'probe_work':p.name,'database_created':(p/'probe.json').is_file(),'committed':(p/'RESTORE-COMMITTED.json').is_file()}))
PY
