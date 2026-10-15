#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,json,subprocess,time,urllib.request
root=Path('/opt/kws/production');config=root/'API.Caddyfile';text=config.read_text()
old='  @cors header Origin https://beta.kletterwelt-sauerland.de https://localhost capacitor://localhost http://localhost'
new=r'  @cors header_regexp Origin ^(https://beta\.kletterwelt-sauerland\.de|https://localhost|capacitor://localhost|http://localhost)$'
if old in text:
 (root/'API-before-cors-fix.Caddyfile').write_text(text)
 text=text.replace(old,new).replace('    Vary Origin\n','    Vary Origin\n    defer\n');config.write_text(text)
assert new in config.read_text()
with (root/'cors-fix.log').open('wb') as log:
 subprocess.run(['docker','exec','kws-api-internal','caddy','validate','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'],stdout=log,stderr=log,check=True)
 subprocess.run(['docker','restart','kws-api-internal'],stdout=log,stderr=log,check=True)
env=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
for attempt in range(20):
 try:
  with urllib.request.urlopen('http://127.0.0.1:9082/healthz',timeout=2) as response:assert response.status==200
  break
 except (OSError,AssertionError):time.sleep(0.5)
else:raise RuntimeError('Internal API did not become ready')
checks=[]
for origin in ('https://beta.kletterwelt-sauerland.de','https://localhost','capacitor://localhost','http://localhost','https://unapproved.example.invalid'):
 headers={'Origin':origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'apikey,authorization,content-type,x-client-info'}
 with urllib.request.urlopen(urllib.request.Request('https://beta-api.kletterwelt-sauerland.de/rest/v1/boulders?select=id',method='OPTIONS',headers=headers)) as response:
  values=response.headers.get_all('Access-Control-Allow-Origin') or []
  assert response.status==204 and values==([] if origin.startswith('https://unapproved.') else [origin])
 checks.append({'origin':origin,'preflight_verified':True})
headers={'Origin':'https://beta.kletterwelt-sauerland.de','apikey':env['ANON_KEY'],'Authorization':'Bearer '+env['ANON_KEY']}
with urllib.request.urlopen(urllib.request.Request('https://beta-api.kletterwelt-sauerland.de/rest/v1/boulders?select=id',headers=headers)) as response:
 assert response.headers.get_all('Access-Control-Allow-Origin')==['https://beta.kletterwelt-sauerland.de']
 assert len(json.load(response))==104
report={'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'preflight':checks,'no_duplicate_allow_origin':True,'public_boulders':104}
(root/'CORS-VERIFIED.json').write_text(json.dumps(report)+'\n');print(json.dumps(report))
PY
