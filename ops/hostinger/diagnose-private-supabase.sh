#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re,subprocess
p=Path('/opt/kws/supabase/runtime')
values=[line.split('=',1)[1].strip().strip('"') for line in (p/'.env').read_text().splitlines() if '=' in line and not line.startswith('#')]
def safe(text):
    for value in sorted((v for v in values if len(v)>=4), key=len, reverse=True):
        text=text.replace(value,'[REDACTED]')
    text=re.sub(r'(?:postgres(?:ql)?://)[^\s\"\']+', '[REDACTED_DSN]',text)
    text=re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[REDACTED_JWT]',text)
    return text
print(safe(Path('/var/log/kws-supabase-start.log').read_text()[-5000:]))
result=subprocess.run(['docker','compose','-f','docker-compose.yml','-f','docker-compose.local.yml','logs','--tail','50','db'],cwd=p,capture_output=True,text=True)
print(safe(result.stdout+result.stderr))
PY
