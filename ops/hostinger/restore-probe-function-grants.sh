#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re,subprocess
p=sorted(p for p in Path('/var/backups/kws/migration').glob('kws_restore_probe_*') if (p/'SCHEMA-COMPARISON.json').is_file())[-1]
src=json.loads((p/'source-schema-metadata.json').read_text());dst=json.loads((p/'target-schema-metadata.json').read_text())
db=json.loads((p/'DATA-VERIFIED.json').read_text())['database']
lookup={r['name']:r for r in dst['functions']}
commands=['BEGIN; SET LOCAL search_path=public,extensions;'];changed=[]
def grants(value):
    result={}
    for grant in value.strip('{}').split(','):
        match=re.fullmatch(r'([A-Za-z0-9_]*)=(X\*?)/([A-Za-z0-9_]+)',grant)
        assert match, 'Unexpected ACL format requires review'
        role,privilege,grantor=match.groups();result[role or 'PUBLIC']=privilege
    return result
for row in src['functions']:
    target=lookup[row['name']]
    if row['acl']==target['acl']:continue
    assert row['definition']==target['definition'], 'Definitions must match before fixing permissions'
    expected=grants(row['acl']);actual=grants(target['acl'])
    # pg_dump grants alone can retain more permissive target default grants.
    identity='public.'+row['name']
    # pg_get_function_identity_arguments excludes defaults used in CREATE DDL.
    assert ';' not in identity and '\n' not in identity
    commands.append('SET LOCAL ROLE '+row['owner']+';')
    for role in set(expected)|set(actual)|{'PUBLIC'}:
        commands.append('REVOKE ALL ON FUNCTION '+identity+' FROM '+role+';')
    for role,priv in expected.items():
        commands.append('GRANT EXECUTE ON FUNCTION '+identity+' TO '+role+(' WITH GRANT OPTION' if '*' in priv else '')+';')
    commands.append('RESET ROLE;');changed.append(row['name'])
commands.append('COMMIT;')
with (p/'function-grants.log').open('wb') as log:
    subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,
      '-X','-qAt','-v','ON_ERROR_STOP=1'],input='\n'.join(commands).encode(),stdout=log,stderr=log,check=True)
(p/'FUNCTION-GRANTS-RESTORED.json').write_text(json.dumps({'functions':changed,'source_permissions_restored':True}))
print(json.dumps({'function_permissions_restored':len(changed),'removed_extra_target_default_grants':True}))
PY
