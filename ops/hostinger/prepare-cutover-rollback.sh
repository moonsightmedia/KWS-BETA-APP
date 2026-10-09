#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
install -d -m 700 /opt/kws/production/rollback
if [[ ! -e /opt/kws/production/rollback/GATEWAY-BEFORE.Caddyfile ]]; then
 cp /opt/kws/public-gateway/Caddyfile /opt/kws/production/rollback/GATEWAY-BEFORE.Caddyfile
fi
cat > /opt/kws/production/rollback/close-target-before-source-resume.sh <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
[[ ! -e /opt/kws/production/PUBLIC-WRITES-ENABLED.json ]] || { echo TARGET_PUBLIC_WRITES_POSSIBLE_REVERSE_DATA_MIGRATION_REQUIRED; exit 1; }
if [[ -e /opt/kws/production/BRIDGE.Caddyfile ]]; then
 cp /opt/kws/production/BRIDGE.Caddyfile /opt/kws/public-gateway/Caddyfile
else
 cp /opt/kws/production/rollback/GATEWAY-BEFORE.Caddyfile /opt/kws/public-gateway/Caddyfile
fi
docker compose -f /opt/kws/public-gateway/docker-compose.yml restart caddy > /var/log/kws-cutover-rollback-gateway.log 2>&1
if docker inspect kws-video-production >/dev/null 2>&1; then docker stop kws-video-production >/dev/null; fi
echo TARGET_CLOSED_NOW_RESTORE_BETA_AND_VIDEO_DNS_THEN_REMOVE_SOURCE_GATE_AND_START_ONLY_OLD_KWS_VIDEO
EOF
chmod 700 /opt/kws/production/rollback/close-target-before-source-resume.sh
cat > /opt/kws/production/rollback/PROCEDURE.md <<'EOF'
# KWS cutover rollback
Source remains retained. No server-wide operation on the old shared VPS.

Before PUBLIC-WRITES-ENABLED.json exists:
1. Run close-target-before-source-resume.sh. Verify new public API is 503.
2. Restore KAS beta CNAME 55aa1c11d6fda53d.vercel-dns-017.com.
   Restore video A 187.124.182.245. Preserve all unrelated DNS, including MX.
3. Inspect source-maintenance-gate.py, then run its authorized remove action
   using the protected KWS_SUPABASE_DB_PASSWORD reference via run-source-database.ps1.
4. Start ONLY kws-video-server-video-server-1 via the old vps SSH alias.
5. Verify old Web/API/Video and existing user access; preserve all target data.

After any target public writes are possible, DNS-only rollback is unsafe.
Stop writes on both sides, back up both, reconcile target changes back into
source and verify users/records/files before reopening. Never remove the source
gate or reopen the old video producer without that reconciliation.
EOF
bash -n /opt/kws/production/rollback/close-target-before-source-resume.sh
python3 - <<'PY'
import json
from pathlib import Path
root=Path('/opt/kws/production/rollback')
(root/'PREPARED.json').write_text(json.dumps({'gateway_snapshot_saved':True,'target_close_script_syntax_valid':True,'old_dns_documented':True,'post_write_reconciliation_required':True,'source_changed':False})+'\n')
print('CUTOVER_ROLLBACK_PREPARED_SOURCE_UNCHANGED')
PY
