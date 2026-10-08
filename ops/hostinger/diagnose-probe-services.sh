#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import http.client,json,subprocess,urllib.error,urllib.request
work=sorted(p for p in Path('/var/backups/kws/migration').glob('kws_restore_probe_*') if (p/'DATA-VERIFIED.json').is_file())[-1]
for name in ('kws-auth-probe','kws-storage-probe','kws-rest-probe'):
    info=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
    print(json.dumps({'container':name,'status':info['State']['Status'],'exit_code':info['State']['ExitCode']}))
    with (work/(name+'.log')).open('wb') as log:
        subprocess.run(['docker','logs',name],stdout=log,stderr=log)
    text=(work/(name+'.log')).read_text(errors='replace')
    for phrase in ('permission denied','does not exist','already exists','connection refused','password authentication failed','invalid JWT','EACCES','migration failed','Could not connect','role "supabase_auth_admin"','read-only file system'):
        if phrase in text:print(json.dumps({'container':name,'diagnostic_class':phrase}))
for port,path in [(9998,'/health'),(9997,'/status'),(9996,'/')]:
    try:
        with urllib.request.urlopen('http://127.0.0.1:'+str(port)+path,timeout=5) as r:code=r.status
    except urllib.error.HTTPError as error:code=error.code
    except (urllib.error.URLError,ConnectionError,http.client.HTTPException):code='connection-failed'
    print(json.dumps({'loopback_port':port,'status':code}))
PY
