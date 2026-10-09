#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import base64,datetime,json,subprocess
runtime={}
for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines():
 if line and not line.startswith('#') and '=' in line:
  key,value=line.split('=',1);runtime[key]=value
basic='Basic '+base64.b64encode((runtime['DASHBOARD_USERNAME']+':'+runtime['DASHBOARD_PASSWORD']).encode()).decode()
base='https://supabase.kletterwelt-sauerland.de'
checks=[]
def request(url,auth=None,method='GET',body=None,expect=None):
 config='url = '+json.dumps(url)+'\nresolve = "supabase.kletterwelt-sauerland.de:443:187.7.70.230"\n'
 if auth:config+='header = '+json.dumps('Authorization: '+auth)+'\n'
 if body is not None:config+='header = "Content-Type: application/json"\ndata = '+json.dumps(body)+'\n'
 args=['curl','--silent','--show-error','--max-time','25','--request',method,'--config','-', '--write-out','\n%{http_code}']
 result=subprocess.run(args,input=config.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 assert result.returncode==0, 'TLS or transport failure (credentials suppressed)'
 payload,status=result.stdout.rsplit(b'\n',1);code=int(status)
 assert code==expect, 'Unexpected HTTP status '+str(code)+' at '+url
 checks.append({'url':url,'auth': 'authorized' if auth==basic else 'denied' if auth else 'none','status':code})
 return payload
routes=['/','/project/default','/api/platform/pg-meta/default/query','/pg/','/api/mcp','/mcp','/auth/v1/admin/users']
for route in routes:
 request(base+route,expect=401)
request(base+'/',auth='Basic aW52YWxpZDppbnZhbGlk',expect=401)
request(base+'/api/mcp',auth='Bearer '+runtime['SERVICE_ROLE_KEY'],expect=401)
html=request(base+'/project/default',auth=basic,expect=200)
assert b'__NEXT_DATA__' in html or b'Supabase' in html
query=request(base+'/api/platform/pg-meta/default/query',auth=basic,method='POST',body=json.dumps({'query':'SELECT count(*)::int AS boulders FROM public.boulders;'}),expect=200)
assert '104' in query.decode(), 'Production tables not visible through Studio'
request('https://beta.kletterwelt-sauerland.de/',expect=200)
request('https://video.kletterwelt-sauerland.de/health',expect=200)
proof={'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':base,
 'all_routes_protected':True,'studio_html_verified':True,'studio_database_query_verified':True,'checks':checks}
Path('/opt/kws/production/PUBLIC-STUDIO-VERIFIED.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof))
PY
