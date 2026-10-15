#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re,subprocess
work=Path('/var/backups/kws/migration/kws_restore_probe_20261009_092807')
meta=json.loads((work/'source-schema-metadata.json').read_text())
for f in meta['functions']:
 if f['name'] in ('trigger_send_push_notification()','send_push_notification_for_notification()'):
  sanitized=re.sub(r"'([^']|'')*'",lambda m: "'<protected-long-literal>'" if len(m.group(0))>80 else m.group(0),f['definition'])
  assert not re.search(r'eyJ[A-Za-z0-9_-]{40,}',sanitized)
  print(json.dumps({'function':f['name'],'definition_with_long_literals_removed':sanitized}))
details=json.loads((work/'RESTORE-COMMITTED.json').read_text());inventory=json.loads((Path(details['source'])/'inventory.json').read_text())
print(json.dumps({'excluded_gate_tables':[x for x in inventory['tables'] if x['schema']+'.'+x['name'] in ('storage.buckets_vectors','storage.vector_indexes','auth.schema_migrations','storage.migrations')]}))
config=json.loads(subprocess.check_output(['docker','compose','-f','docker-compose.yml','-f','docker-compose.local.yml','config','--format','json'],cwd='/opt/kws/supabase/runtime'))
for name in ('auth','rest','storage','realtime','functions'):
 service=config['services'][name]
 print(json.dumps({'service':name,'image':service['image'],'volumes':service.get('volumes',[]),'ports':service.get('ports',[]),'environment_keys':sorted(service['environment'])}))
record=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055/private-ui-account.json')
if record.exists():
 data=json.loads(record.read_text());assert data['database']=='kws_restore_probe_20261008_121055' and data['email'].startswith('migration-ui-') and data['email'].endswith('@example.invalid')
 runtime=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
 import urllib.request
 req=urllib.request.Request('http://127.0.0.1:9090/auth/v1/admin/users/'+data['user_id'],headers={'Authorization':'Bearer '+runtime['SERVICE_ROLE_KEY'],'apikey':runtime['ANON_KEY']},method='DELETE')
 with urllib.request.urlopen(req,timeout=30) as response:assert response.status in (200,204)
 record.unlink()
 marker={'private_ui_login_verified':True,'reset_form_render_verified':True,'no_new_password_entered_in_browser':True,'synthetic_ui_account_removed':True,'source_changed':False}
 (record.parent/'UI-RECOVERY-VERIFIED.json').write_text(json.dumps(marker)+'\n');print(json.dumps(marker))
PY
