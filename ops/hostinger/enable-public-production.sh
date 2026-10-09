#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,json,shutil,subprocess
root=Path('/opt/kws/production');runtime=Path('/opt/kws/supabase/runtime')
proof=json.loads((root/'RUNTIME-VERIFIED.json').read_text());assert proof['production_runtime_verified'] and proof['test_accounts_removed']
assert json.loads((root/'DATABASE-PROMOTED.json').read_text())['database']=='postgres'
assert not (root/'PUBLIC-WRITES-ENABLED.json').exists()
dns=json.loads((root/'DNS-CUTOVER-VERIFIED.json').read_text())
assert set(dns['hosts'])=={'beta.kletterwelt-sauerland.de','video.kletterwelt-sauerland.de','beta-api.kletterwelt-sauerland.de'}
assert all(v=='187.7.70.230' for v in dns['hosts'].values())
env=runtime/'.env';text=env.read_text();assert text.count('DISABLE_SIGNUP=true')==1
env.write_text(text.replace('DISABLE_SIGNUP=true','DISABLE_SIGNUP=false'));env.chmod(0o600)
compose=['docker','compose','-f','docker-compose.yml','-f','docker-compose.local.yml','-f','docker-compose.production.json']
with (root/'public-enable.log').open('wb') as log:
 subprocess.run(compose+['up','-d','--wait','--wait-timeout','120','auth'],cwd=runtime,stdout=log,stderr=log,check=True)
 # Record possible public writes BEFORE opening the API; rollback must then
 # require reconciliation even if the later readiness check is interrupted.
 marker={'enabled_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'target_public_writes_possible':True,'dns_only_rollback_safe':False}
 (root/'PUBLIC-WRITES-ENABLED.json').write_text(json.dumps(marker)+'\n')
 shutil.copyfile(root/'PUBLIC.Caddyfile','/opt/kws/public-gateway/Caddyfile')
 subprocess.run(['docker','compose','-f','/opt/kws/public-gateway/docker-compose.yml','restart','caddy'],stdout=log,stderr=log,check=True)
print(json.dumps({'public_routes_enabled':True,'signup_enabled':True,'source_remains_write_gated':True,'post_cutover_verification_pending':True}))
PY
