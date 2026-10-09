#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re,subprocess
base=Path('/var/backups/kws/migration')
work=sorted(p for p in base.glob('kws_restore_probe_*') if (p/'DATA-VERIFIED.json').exists())[-1]
proof=json.loads((work/'SCHEMA-COMPARISON.json').read_text())
assert all(not p['missing'] and not p['extra'] and not p['different'] for p in proof.values())
gate=json.loads((base/'SOURCE-MAINTENANCE-GATE.json').read_text())
target=json.loads((work/'TARGET-GATE-RESTORED.json').read_text())
assert gate['active'] and gate['api_rejection_verified'] and target['restored_gate_triggers']==gate['covered_tables']==66
db=target['database'];assert re.fullmatch(r'kws_restore_probe_[0-9_]+',db)
sql=['BEGIN;']
for relation in gate['relations']:
 assert re.fullmatch(r'"[A-Za-z0-9_]+"\."[A-Za-z0-9_]+"',relation)
 sql.append('DROP TRIGGER kws_migration_write_gate ON '+relation+';')
sql.extend(['DROP FUNCTION public.kws_migration_write_gate();','COMMIT;'])
with (work/'target-gate-remove.log').open('wb') as log:
 subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],input='\n'.join(sql).encode(),stdout=log,stderr=log,check=True)
report={'database':db,'target_gates_removed':66,'source_gate_kept':True,'schema_exact_before_intentional_changes':True}
(work/'TARGET-GATE-REMOVED.json').write_text(json.dumps(report)+'\n');print(json.dumps(report))
PY
