#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
import json,subprocess
from pathlib import Path
work=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
assert (work/'API-VERIFIED.json').is_file()
db='kws_restore_probe_20261008_121055'
def query(sql):
    return subprocess.check_output(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=sql,text=True)
tables=json.loads(query("SELECT json_agg(tablename) FROM pg_tables WHERE schemaname='public';"))
report=[]
for table in tables:
    assert table.replace('_','').isalnum()
    rows=json.loads(query('SELECT coalesce(json_agg(t),\'[]\'::json) FROM public."'+table+'" t;'))
    for column in (rows[0] if rows else {}):
        values=[json.dumps(r[column],ensure_ascii=False) for r in rows]
        counts={name:sum(host in v for v in values) for name,host in [('source_storage','pkzzxtsyxwxoraytyjau.supabase.co'),('source_video','video.kletterwelt-sauerland.de'),('legacy_cdn','cdn.kletterwelt-sauerland.de')]}
        if any(counts.values()):report.append({'table':table,'column':column,**counts})
(work/'URL-INVENTORY.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'probe_url_columns':report,'source_changed':False}))
PY
