#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import collections,hashlib,json,re,subprocess
base=Path('/var/backups/kws/migration')
work=sorted(p for p in base.glob('kws_restore_probe_*') if (p/'RESTORE-COMMITTED.json').is_file())[-1]
details=json.loads((work/'RESTORE-COMMITTED.json').read_text())
source=Path(details['source']);db=details['database']
inventory=json.loads((source/'inventory.json').read_text())
sql=(source/'data.sql').read_text()
log=(work/'verification.log').open('wb')
def query(sql):
    return subprocess.check_output(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,
      '-X','-qAt','-v','ON_ERROR_STOP=1'],input=sql.encode(),stderr=log)
def hashes(data):
    return collections.Counter(hashlib.sha256(line).digest() for line in data.splitlines(keepends=True))
tables=[];failures=[]
for match in re.finditer(r'^COPY ("(?:[^"]|"")+"\."(?:[^"]|"")+") \(([^\n]+)\) FROM stdin;\n(.*?)^\\\.\n',sql,re.M|re.S):
    relation,columns,data=match.groups()
    # Reuse identifiers from the protected pg_dump, never hand-construct records.
    actual=query("SET timezone='UTC'; SET DateStyle='ISO, MDY'; SET extra_float_digits=3;\nCOPY (SELECT "+columns+' FROM '+relation+') TO STDOUT;\n')
    expected=data.encode()
    equal=hashes(actual)==hashes(expected)
    rows=len(expected.splitlines())
    name=relation.replace('"','')
    tables.append({'table':name,'rows':rows,'all_column_values_match':equal})
    if not equal: failures.append(name)
    else: print(json.dumps({'verified_table':name,'rows':rows}),flush=True)
assert tables, 'No COPY sections found'
restored_names={t['table'] for t in tables}
required=[t for t in inventory['tables'] if t['schema'] in ('public','auth','storage') and
          (t['schema'],t['name']) not in (('auth','schema_migrations'),('storage','migrations'))]
missing=['.'.join((t['schema'],t['name'])) for t in required if '.'.join((t['schema'],t['name'])) not in restored_names]
count_mismatch=[t['table'] for t in tables if t['rows']!=next(s['rows'] for s in inventory['tables'] if '.'.join((s['schema'],s['name']))==t['table'])]
sequences=[]
for match in re.finditer(r"SELECT pg_catalog.setval\('([^']+)', (\d+), (true|false)\);",sql):
    name,value,called=match.groups()
    assert re.fullmatch(r'"[A-Za-z0-9_]+"\."[A-Za-z0-9_]+"',name)
    actual=query('SELECT last_value,is_called FROM '+name+';').decode().strip()
    equal=actual==value+'|'+('t' if called=='true' else 'f')
    sequences.append({'sequence':name.replace('"',''),'match':equal})
result={'database':db,'tables_checked':len(tables),'rows_checked':sum(t['rows'] for t in tables),
        'all_column_values_match':not failures,'value_mismatch_tables':failures,
        'source_tables_missing':missing,'snapshot_count_mismatch':count_mismatch,
        'sequences_checked':len(sequences),'sequences_match':all(s['match'] for s in sequences),
        'auth_runtime_verified':False,'storage_file_serving_verified':False,'production_cutover':False}
(work/'data-comparison.json').write_text(json.dumps({'summary':result,'tables':tables,'sequences':sequences},indent=2))
print(json.dumps(result),flush=True)
assert not failures and not missing and not count_mismatch and result['sequences_match'], 'Database verification failed'
(work/'DATA-VERIFIED.json').write_text(json.dumps(result))
log.close()
PY
