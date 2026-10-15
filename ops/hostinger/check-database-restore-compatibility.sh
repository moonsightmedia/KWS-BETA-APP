#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess
base=Path('/var/backups/kws/migration')
stages=sorted(p for p in base.glob('database-precopy-*.tar.age.restore-test') if (p/'RESTORE-VERIFIED.json').is_file())
assert stages
source_file=next(stages[-1].glob('*/inventory.json'))
source=json.loads(source_file.read_text())
query="""SELECT json_build_object('columns',(SELECT json_agg(row_to_json(t)) FROM
 (SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,is_nullable,is_generated
  FROM information_schema.columns WHERE table_schema IN ('auth','storage','public')
  ORDER BY table_schema,table_name,ordinal_position) t),
 'auth_users',(SELECT count(*) FROM auth.users));"""
result=subprocess.check_output(['docker','exec','supabase-db','psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1','-c',query],stderr=subprocess.DEVNULL)
target=json.loads(result)
(source_file.parent/'target-before-restore.json').write_text(json.dumps(target))
assert target['auth_users']==0, 'Target already has users; never overwrite'
def tables(value):
    result={}
    for c in value['columns']:
        if c['table_schema'] not in ('auth','storage'): continue
        result.setdefault((c['table_schema'],c['table_name']),{})[c['column_name']]=c
    return result
src=tables(source);dst=tables(target)
differences=[]
for table,cols in src.items():
    missing=[name for name in cols if name not in dst.get(table,{})]
    changed=[name for name,c in cols.items() if name in dst.get(table,{}) and
             any(c[k]!=dst[table][name][k] for k in ('data_type','udt_schema','udt_name','is_generated'))]
    if missing or changed:
        rows=next(t['rows'] for t in source['tables'] if (t['schema'],t['name'])==table)
        differences.append({'table':'.'.join(table),'source_rows':rows,'missing_columns':missing,'changed_columns':changed})
print(json.dumps({'compatibility_differences':differences,'source_tables':len(src),'target_tables':len(dst)}))
PY
