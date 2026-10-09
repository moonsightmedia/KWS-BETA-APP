#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
python3 - <<'PY'
from pathlib import Path
from datetime import datetime,timezone
import base64,json,subprocess
env=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if line and not line.startswith('#') and '=' in line)
basic='Basic '+base64.b64encode((env['DASHBOARD_USERNAME']+':'+env['DASHBOARD_PASSWORD']).encode()).decode()
base='https://supabase.kletterwelt-sauerland.de'
checks=[]
def request(url, expected, auth=None, body=None):
 config='url = '+json.dumps(url)+'\n'
 if auth:config+='header = '+json.dumps('Authorization: '+auth)+'\n'
 if body is not None:config+='header = "Content-Type: application/json"\ndata = '+json.dumps(body)+'\n'
 r=subprocess.run(['curl','--silent','--show-error','--max-time','25','--config','-','--write-out','\n%{http_code}'],input=config.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
 payload,status=r.stdout.rsplit(b'\n',1);assert int(status)==expected,'HTTP check failed at '+url
 checks.append({'url':url,'status':int(status),'authorized':auth==basic})
 return payload
for route in ('/','/ops/status.json','/ops/dashboard.js','/ops/dashboard.css','/ops/poppins.woff2','/project/default','/api/platform/pg-meta/default/query','/auth/v1/admin/users','/api/mcp'):
 request(base+route,401)
request(base+'/ops/status.json',401,'Basic aW52YWxpZDppbnZhbGlk')
request(base+'/ops/status.json',401,'Bearer '+env['SERVICE_ROLE_KEY'])
html=request(base+'/',200,basic)
assert b'KWS Beta App' in html and b'/project/default/editor' in html and b'/ops/dashboard.js' in html
data=json.loads(request(base+'/ops/status.json',200,basic))
assert data['schema_version']==1 and not data['errors']
assert (datetime.now(timezone.utc)-datetime.fromisoformat(data['generated_at'])).total_seconds()<180
assert data['database']['users']>=44 and data['database']['boulders']>=104 and data['database']['storage_objects']>=2389
assert all(row['healthy'] for row in data['services'])
assert data['backups']['latest']['files_verified']>4000 and data['backups']['restore_test']['tables_verified']==73
assert data['backups']['timer_active']
assert subprocess.check_output(['systemctl','is-active','kws-operations-status.timer'],text=True).strip()=='active'
for route in ('/ops/dashboard.js','/ops/dashboard.css','/ops/poppins.woff2','/ops/teko.woff2','/project/default'):
 request(base+route,200,basic)
rows=json.loads(request(base+'/api/platform/pg-meta/default/query',200,basic,json.dumps({'query':'SELECT count(*)::int AS boulders FROM public.boulders;'})))
assert rows[0]['boulders']>=104
request('https://beta.kletterwelt-sauerland.de/',200)
request('https://video.kletterwelt-sauerland.de/health',200)
request('https://beta-api.kletterwelt-sauerland.de/auth/v1/health',200)
proof={'verified_at':datetime.now(timezone.utc).isoformat(),'all_routes_protected':True,'read_only_real_data':True,'production_services_healthy':True,'studio_database_query_verified':True,'automatic_snapshot_timer_active':True,'checks':checks}
Path('/opt/kws/production/OPERATIONS-DASHBOARD-VERIFIED.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof))
PY
