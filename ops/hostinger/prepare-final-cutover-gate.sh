#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,json,subprocess,urllib.request,urllib.error
base=Path('/var/backups/kws/migration');production=Path('/opt/kws/production')
assert not (base/'SOURCE-MAINTENANCE-GATE.json').exists()
assert not (base/'CUTOVER-TARGET-READY.json').exists()
backup=json.loads(Path('/var/backups/kws/rehearsal/20261009T130636Z.tar.age.restore-verified.json').read_text())
assert backup['database_restore_tested'] and backup['vault_decryption_verified'] and backup['decrypted_files_verified']==4198
for name in ('API-TEST-RESULTS.json','LIVE-FLOWS-VERIFIED.json'):
 tests=json.loads((base/'kws_restore_probe_20261008_121055'/name).read_text())
 assert tests['passed'] and tests['checks']
 assert all(check.get('passed',check.get('ok',True)) for check in tests['checks'] if isinstance(check,dict))
candidate=base/'kws_restore_probe_20261009_092807'
assert json.loads((candidate/'STORAGE-VERIFIED.json').read_text())['all_sha256_match']
assert json.loads((candidate/'PRODUCTION-CONFIGURED.json').read_text())['push_vault_key_decryption_verified']
assert json.loads((production/'RUNTIME-PREPARED.json').read_text())['signup_disabled_until_cutover']
assert json.loads((production/'DNS-CUTOVER-VERIFIED.json').read_text())['https_verified_without_resolve_override']
video=json.loads((base/'VIDEO-PREFLIGHT.json').read_text());assert video['source_video_running'] and video['queue_and_publisher_idle']
rollback=json.loads((production/'rollback/PREPARED.json').read_text());assert rollback['gateway_snapshot_saved'] and rollback['target_close_script_syntax_valid']
assert json.loads((production/'ROLLBACK-CLOSE-VERIFIED.json').read_text())['api_closed']
tools=Path('/opt/kws/tools')
for name in ('configure-production-candidate.sh','configure-production-push.sql','remove-target-writegate.sh','align-production-video.sh','promote-final-database.sh','verify-production-runtime.sh','test-production-runtime.mjs','enable-public-production.sh','verify-source-freeze.py'):
 assert (tools/name).is_file() and (tools/name).stat().st_mode&0o077==0
 if name.endswith('.sh'):subprocess.run(['bash','-n',str(tools/name)],check=True)
req=urllib.request.Request('https://beta-api.kletterwelt-sauerland.de/rest/v1/boulders')
try:urllib.request.urlopen(req,timeout=20);raise AssertionError('Target API unexpectedly open')
except urllib.error.HTTPError as error:assert error.code==503
report={'ready':True,'ready_for_final_copy':True,'production_ready':False,'public_routes_disabled':True,'rollback_prepared':True,
 'backup_restore_tested':True,'vault_restore_tested':True,'original_source_still_active':True,'prepared_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(base/'CUTOVER-TARGET-READY.json').write_text(json.dumps(report)+'\n');print(json.dumps(report))
PY
