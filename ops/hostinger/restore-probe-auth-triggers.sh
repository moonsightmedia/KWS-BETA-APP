#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess
p=sorted(p for p in Path('/var/backups/kws/migration').glob('kws_restore_probe_*') if (p/'SCHEMA-COMPARISON.json').is_file())[-1]
details=json.loads((p/'RESTORE-COMMITTED.json').read_text());db=details['database'];source=Path(details['source'])
meta=json.loads((p/'source-schema-metadata.json').read_text())
expected=[r['name'].split('.',2)[2] for r in meta['triggers'] if r['name'].startswith('auth.users.')]
assert sorted(expected)==['on_auth_user_created','on_auth_user_default_role']
client=['docker','run','--rm','--read-only','--network','none','--cap-drop','ALL','--security-opt','no-new-privileges',
 '-v',str(source)+':/source:ro','-v',str(p)+':/work:ro','--entrypoint','pg_restore','supabase/postgres:17.6.1.136']
with (p/'auth-triggers.log').open('wb') as log:
    toc=subprocess.check_output(client+['--list','/source/source-full.dump'],stderr=log).decode()
    selected=[line for line in toc.splitlines() if any(' TRIGGER auth users '+name+' ' in line for name in expected)]
    assert len(selected)==2
    (p/'auth-triggers.list').write_text('\n'.join(selected)+'\n')
    ddl=subprocess.check_output(client+['--use-list=/work/auth-triggers.list','--schema-only','--file=-','/source/source-full.dump'],stderr=log)
    subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,
      '-X','-qAt','-v','ON_ERROR_STOP=1'],input=b'BEGIN;\n'+ddl+b'\nCOMMIT;\n',stdout=log,stderr=log,check=True)
(p/'AUTH-TRIGGERS-RESTORED.json').write_text(json.dumps({'database':db,'triggers':expected}))
print('BOTH_SOURCE_REGISTRATION_TRIGGERS_RESTORED_IN_PROBE')
PY
