#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
test -f /opt/kws/tools/test-probe-liveflows.mjs
python3 - <<'PY'
from pathlib import Path
import json,subprocess
work=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
assert (work/'REALTIME-PREPARED.json').is_file()
config=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
with (work/'live-flows-preparation.log').open('wb') as log:
    for audio in (True,False):
        name='live-flow-'+('audio' if audio else 'silent')+'.mp4'
        command=['docker','exec','kws-video-private-video-1','ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=360x640:rate=30']
        if audio:command+=['-f','lavfi','-i','sine=frequency=1000:sample_rate=44100']
        command+=['-t','2','-c:v','libx264','-pix_fmt','yuv420p','-b:v','500k']
        if audio:command+=['-c:a','aac','-b:a','64k','-shortest']
        command+=['/tmp/'+name]
        subprocess.run(command,stdout=log,stderr=log,check=True)
        with (work/name).open('wb') as output:
            subprocess.run(['docker','exec','kws-video-private-video-1','cat','/tmp/'+name],stdout=output,stderr=log,check=True)
payload=json.dumps({'database':'kws_restore_probe_20261008_121055','anon':config['ANON_KEY'],'service':config['SERVICE_ROLE_KEY']})
with (work/'live-flows.log').open('wb') as log:
    result=subprocess.run(['docker','run','--rm','-i','--network','host','--read-only','--memory','512m','--cpus','1','--cap-drop','ALL','--security-opt','no-new-privileges','-v','/opt/kws/probe-web/source:/app:ro','-v',str(work)+':/work:ro','-v','/opt/kws/tools/test-probe-liveflows.mjs:/test.mjs:ro','node:22-alpine','node','/test.mjs'],input=payload.encode(),stdout=log,stderr=log)
text=(work/'live-flows.log').read_text(errors='replace')
rows=[]
for line in text.splitlines():
    try:
        row=json.loads(line)
        if 'check' in row or 'live_flow_tests_passed' in row:rows.append(row);print(json.dumps(row),flush=True)
        elif 'system_status' in row or 'video_user_http_status' in row or 'video_setter_http_status' in row or 'boulder_insert_status' in row: print(json.dumps(row),flush=True)
    except ValueError:pass
if result.returncode:
    for phrase in ('PRIVATE_REALTIME_SUBSCRIPTION_TIMEOUT','PRIVATE_REALTIME_CHANNEL_ERROR','ERR_MODULE_NOT_FOUND','does not provide an export','AssertionError','ECONNREFUSED'):
        if phrase in text:print(json.dumps({'diagnostic_class':phrase}))
    raise SystemExit(1)
assert rows and all(row.get('passed',True) for row in rows)
(work/'LIVE-FLOWS-VERIFIED.json').write_text(json.dumps({'checks':rows,'passed':True}))
PY
