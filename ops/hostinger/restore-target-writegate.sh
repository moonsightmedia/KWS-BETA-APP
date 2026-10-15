#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re,subprocess
root=Path('/var/backups/kws/migration')
gate=json.loads((root/'SOURCE-MAINTENANCE-GATE.json').read_text())
assert gate['active'] and gate['covered_tables']==66
work=sorted(p for p in root.glob('kws_restore_probe_*') if (p/'DATA-VERIFIED.json').exists())[-1]
assert not (work/'TARGET-GATE-RESTORED.json').exists()
details=json.loads((work/'RESTORE-COMMITTED.json').read_text());db=details['database'];source=Path(details['source'])
manifest=json.loads((source/'manifest.json').read_text());assert manifest['writers_frozen'] is True
client=['docker','run','--rm','--read-only','--network','none','--cap-drop','ALL','--security-opt','no-new-privileges','-v',str(source)+':/source:ro','-v',str(work)+':/work:ro','--entrypoint','pg_restore','supabase/postgres:17.6.1.136']
with (work/'target-writegate-restore.log').open('wb') as log:
 toc=subprocess.check_output(client+['--list','/source/source-full.dump'],stderr=log).decode()
 selected=[line for line in toc.splitlines() if re.search(r' TRIGGER (public|auth|storage) [A-Za-z0-9_]+ kws_migration_write_gate ',line)]
 assert len(selected)==gate['covered_tables']
 (work/'target-writegate.list').write_text('\n'.join(selected)+'\n')
 ddl=subprocess.check_output(client+['--use-list=/work/target-writegate.list','--schema-only','--file=-','/source/source-full.dump'],stderr=log).decode()
 # The public-only CLI dump already restored some gates; recreate known gates
 # uniformly, including managed Auth/Storage relations excluded by that dump.
 drops=[]
 for relation in gate['relations']:
  assert re.fullmatch(r'"[A-Za-z0-9_]+"\."[A-Za-z0-9_]+"',relation)
  drops.append('DROP TRIGGER IF EXISTS kws_migration_write_gate ON '+relation+';')
 subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=('BEGIN;\n'+'\n'.join(drops)+'\n'+ddl+'\nCOMMIT;').encode(),stdout=log,stderr=log,check=True)
report={'database':db,'restored_gate_triggers':len(selected),'source_changed':False,'target_writes_blocked':True}
(work/'TARGET-GATE-RESTORED.json').write_text(json.dumps(report)+'\n');print(json.dumps(report))
PY
