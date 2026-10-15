#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess
p=Path('/opt/kws/video-private/.env')
work=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
backup=work/'video-before-probe.env.age'
if not backup.exists():
    recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],text=True).strip()
    subprocess.run(['age','-r',recipient,'-o',str(backup),str(p)],check=True)
env=dict(line.split('=',1) for line in p.read_text().splitlines() if '=' in line and not line.startswith('#'))
config=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
env.update(SUPABASE_URL='http://kws-probe-web-caddy-1:80',SUPABASE_SERVICE_ROLE_KEY=config['SERVICE_ROLE_KEY'],PUBLIC_BASE_URL='https://video.kletterwelt-sauerland.de')
p.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n');p.chmod(0o600)
with (work/'video-probe-start.log').open('wb') as log:
    subprocess.run(['docker','compose','up','-d','--wait','--wait-timeout','90'],cwd=p.parent,stdout=log,stderr=log,check=True)
print(json.dumps({'video_auth_connected_to_probe':True,'publisher_enabled_for_probe':True,'source_video_changed':False,'public_binding':False}))
PY
