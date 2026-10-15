#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,json,socket,subprocess
hosts={}
for host in ('beta.kletterwelt-sauerland.de','video.kletterwelt-sauerland.de','beta-api.kletterwelt-sauerland.de'):
 addresses={v[4][0] for v in socket.getaddrinfo(host,443,type=socket.SOCK_STREAM)}
 assert addresses=={'187.7.70.230'},'DNS propagation pending; do not freeze source yet'
 hosts[host]='187.7.70.230'
 path='/health' if host.startswith('video.') else '/'
 result=subprocess.run(['curl','--silent','--show-error','--connect-timeout','10','--max-time','20','-o','/dev/null','-w','%{http_code}','https://'+host+path],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 assert result.returncode==0 and result.stdout.decode()==('503' if host.startswith('beta-api.') else '200')
report={'hosts':hosts,'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'https_verified_without_resolve_override':True,'bridge_serves_existing_source':True,'target_api_still_closed':True}
Path('/opt/kws/production/DNS-CUTOVER-VERIFIED.json').write_text(json.dumps(report)+'\n');print(json.dumps(report))
PY
