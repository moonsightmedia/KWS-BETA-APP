#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re,subprocess
base=Path('/var/backups/kws/migration')
work=sorted(p for p in base.glob('kws_restore_probe_*') if (p/'DATA-VERIFIED.json').is_file())[-1]
assert not (work/'SCHEMA-SUPPLEMENTS-RESTORED.json').exists()
details=json.loads((work/'DATA-VERIFIED.json').read_text())
db=details['database'];source=Path(json.loads((work/'RESTORE-COMMITTED.json').read_text())['source'])
image='supabase/postgres:17.6.1.136'
client=['docker','run','--rm','--read-only','--network','none','--cap-drop','ALL','--security-opt','no-new-privileges',
 '-v',str(source)+':/source:ro','-v',str(work)+':/work:ro','--entrypoint','pg_restore',image]
log=(work/'schema-supplements.log').open('wb')
toc=subprocess.check_output(client+['--list','/source/source-full.dump'],stderr=log).decode()
selected=[line for line in toc.splitlines() if not line.startswith(';') and
          (re.search(r' POLICY storage ',line) or re.search(r' FUNCTION public ',line))]
(work/'schema-supplements.list').write_text('\n'.join(selected)+'\n')
ddl=subprocess.check_output(client+['--use-list=/work/schema-supplements.list','--schema-only','--file=-','/source/source-full.dump'],stderr=log).decode()
ddl=re.sub(r'(?m)^CREATE FUNCTION ', 'CREATE OR REPLACE FUNCTION ',ddl)
(work/'schema-supplements.sql').write_text(ddl)
subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,
 '-X','-qAt','-v','ON_ERROR_STOP=1'],input=('BEGIN;\n'+ddl+'\nCOMMIT;\n').encode(),stdout=log,stderr=log,check=True)
result={'database':db,'storage_policies_restored':sum(' POLICY storage ' in l for l in selected),
 'functions_restored_from_full_archive':sum(' FUNCTION public ' in l and ' ACL ' not in l for l in selected)}
(work/'SCHEMA-SUPPLEMENTS-RESTORED.json').write_text(json.dumps(result))
print(json.dumps(result),flush=True)
log.close()
PY
