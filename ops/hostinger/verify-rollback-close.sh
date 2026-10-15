#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
[[ ! -e /var/backups/kws/migration/SOURCE-MAINTENANCE-GATE.json ]] || exit 1
bash /opt/kws/production/rollback/close-target-before-source-resume.sh
python3 - <<'PY'
from pathlib import Path
import json,urllib.request,urllib.error
for host,path in (('beta.kletterwelt-sauerland.de','/'),('video.kletterwelt-sauerland.de','/health')):
 with urllib.request.urlopen('https://'+host+path,timeout=20) as response:assert response.status==200
try:urllib.request.urlopen('https://beta-api.kletterwelt-sauerland.de/rest/v1/boulders',timeout=20);raise AssertionError()
except urllib.error.HTTPError as error:assert error.code==503
report={'target_close_script_executed':True,'api_closed':True,'original_web_and_video_available':True,'source_gate_not_installed':True}
Path('/opt/kws/production/ROLLBACK-CLOSE-VERIFIED.json').write_text(json.dumps(report)+'\n');print(json.dumps(report))
PY
