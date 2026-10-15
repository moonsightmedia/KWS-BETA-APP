#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import re
text=Path('/var/log/kws-private-video-tests.log').read_text()
for file in ('/opt/kws/video-private/.env','/opt/kws/supabase/runtime/.env'):
    for line in Path(file).read_text().splitlines():
        if '=' not in line or line.startswith('#'): continue
        value=line.split('=',1)[1]
        if len(value)>=4: text=text.replace(value,'[REDACTED]')
text=re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[REDACTED-JWT]',text)
text=re.sub(r'([a-z]+://)[^\s/@]+:[^\s/@]+@',r'\1[REDACTED]@',text)
print('\n'.join(text.splitlines()[-70:]))
PY
