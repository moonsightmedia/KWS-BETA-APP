#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/kws/supabase/runtime
python3 - <<'PY'
from pathlib import Path
import json,subprocess,urllib.request,urllib.error
env=dict(line.split('=',1) for line in Path('.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
for use_bearer in (False,True):
    h={'apikey':env['ANON_KEY']}
    if use_bearer: h['Authorization']='Bearer '+env['ANON_KEY']
    req=urllib.request.Request('http://127.0.0.1:8000/rest/v1/',headers=h)
    try:
        with urllib.request.urlopen(req,timeout=10) as r: print(json.dumps({'bearer':use_bearer,'status':r.status}))
    except urllib.error.HTTPError as e:
        body=e.read().decode(errors='replace')
        print(json.dumps({'bearer':use_bearer,'status':e.code,'body_bytes':len(body),'rbac_denied':'RBAC' in body,'missing_key':'API key' in body,'invalid_jwt':'JWT' in body,'permission_denied':'permission denied' in body}))
sql="SELECT rolname, has_schema_privilege(oid, 'public', 'USAGE') FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role');"
result=subprocess.run(['docker','exec','supabase-db','psql','-U','postgres','-d','postgres','-Atc',sql],capture_output=True,text=True,check=True)
print(result.stdout)
PY
grep -nE 'PGRST_DB_ANON_ROLE|PGRST_OPENAPI|ANON_KEY|SERVICE_ROLE_KEY' docker-compose.yml | head -n 25
