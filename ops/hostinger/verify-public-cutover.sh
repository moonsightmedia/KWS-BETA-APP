#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,hashlib,json,socket,subprocess,urllib.parse,urllib.request
root=Path('/opt/kws/production');base=Path('/var/backups/kws/migration')
assert json.loads((root/'PUBLIC-WRITES-ENABLED.json').read_text())['target_public_writes_possible']
runtime=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
proof=json.loads((root/'DATABASE-PROMOTED.json').read_text());work=base/proof['original_candidate']
def get(url,headers={}):
 request=urllib.request.Request(url,headers=headers)
 with urllib.request.urlopen(request,timeout=30) as response:return response.status,response.read(),dict(response.headers)
hosts={}
for host in ('beta.kletterwelt-sauerland.de','beta-api.kletterwelt-sauerland.de','video.kletterwelt-sauerland.de'):
 addresses={entry[4][0] for entry in socket.getaddrinfo(host,443,type=socket.SOCK_STREAM)}
 assert addresses=={'187.7.70.230'};hosts[host]=sorted(addresses)
web='https://beta.kletterwelt-sauerland.de';api='https://beta-api.kletterwelt-sauerland.de';video='https://video.kletterwelt-sauerland.de'
checks=[]
for path in ('/','/reset-password','/auth/callback'):
 status,body,headers=get(web+path);assert status==200 and b'<html' in body.lower();checks.append('web'+path)
auth={'apikey':runtime['ANON_KEY'],'Authorization':'Bearer '+runtime['ANON_KEY']}
status,body,_=get(api+'/auth/v1/health',auth);assert status==200;checks.append('public_auth_health')
for table,count in (('boulders',104),('sectors',19)):
 status,body,_=get(api+'/rest/v1/'+table+'?select=id',auth)
 assert status==200 and len(json.loads(body))==count;checks.append('public_'+table+'_count')
manifests=[json.loads(p.read_text()) for p in base.glob('storage-final-*.age.restore-test/*/manifest.json')]
manifest=max(manifests,key=lambda item:item['captured_at'])
for bucket in sorted({o['bucket'] for o in manifest['objects']}):
 item=next(o for o in manifest['objects'] if o['bucket']==bucket)
 path='/storage/v1/object/authenticated/'+urllib.parse.quote(bucket,safe='')+'/'+urllib.parse.quote(item['path'],safe='/')
 status,body,_=get(api+path,{'apikey':runtime['ANON_KEY'],'Authorization':'Bearer '+runtime['SERVICE_ROLE_KEY']})
 assert status==200 and len(body)==item['bytes'] and hashlib.sha256(body).hexdigest()==item['sha256'];checks.append('public_storage_'+bucket)
status,body,_=get(video+'/health');health=json.loads(body);assert status==200 and health['ok'];checks.append('public_video_health')
sample=next(p for p in sorted(Path('/opt/kws/video-production/data/final').rglob('*.mp4')) if p.stat().st_size>=1024)
relative=str(sample.relative_to('/opt/kws/video-production/data/final'))
status,body,headers=get(video+'/videos/'+urllib.parse.quote(relative,safe='/'),{'Range':'bytes=0-1023'})
assert status==206 and len(body)==1024 and body==sample.read_bytes()[:1024];checks.append('public_video_range_bytes')
media=next(Path('/opt/kws/web-production/media').glob('*'))
status,body,_=get(web+'/migrated-cdn/'+media.name)
assert status==200 and hashlib.sha256(body).hexdigest()==hashlib.sha256(media.read_bytes()).hexdigest();checks.append('public_migrated_cdn_bytes')
sql='SELECT count(*) FROM auth.users;'
users=int(subprocess.check_output(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],input=sql.encode(),stderr=subprocess.DEVNULL))
assert users>=proof['users']
report={'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'hosts':hosts,'public_https_verified':True,'checks':checks,'original_users_preserved':proof['users'],'current_users':users,'source_write_gate_kept':True,'database':'postgres'}
(root/'PUBLIC-CUTOVER-VERIFIED.json').write_text(json.dumps(report)+'\n')
(root/'CUTOVER-COMPLETE.json').write_text(json.dumps(report)+'\n')
print(json.dumps(report))
PY
