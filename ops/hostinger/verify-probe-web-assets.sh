#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
import hashlib,json,mimetypes,subprocess,urllib.request
from pathlib import Path
work=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
rewritten=json.loads((work/'URLS-REWRITTEN.json').read_text())
cdn=json.loads((work/'CDN-PRECOPY.json').read_text())
root=work.parent/cdn['archive'].removesuffix('.tar.gz.age')
manifest=json.loads((root/'manifest.json').read_text());checked=0
for obj in manifest['objects']:
 if obj['status']==200:
  name=Path(obj['local']).name+(mimetypes.guess_extension(obj['content_type']) or '.bin')
  url='http://127.0.0.1:9090/migrated-cdn/'+name
  with urllib.request.urlopen(url,timeout=20) as response:
   assert response.headers.get_content_type()==obj['content_type']
   sha=hashlib.sha256();length=0
   while chunk:=response.read(1024*1024):sha.update(chunk);length+=len(chunk)
  assert sha.hexdigest()==obj['sha256'] and length==obj['bytes'];checked+=1
db=rewritten['database']
sql="""SELECT json_build_object('boulders',(SELECT count(*) FROM public.boulders),
 'source_video_urls',(SELECT count(*) FROM public.boulders WHERE beta_video_url LIKE '%video.kletterwelt-sauerland.de%'),
 'source_thumbnails',(SELECT count(*) FROM public.boulders WHERE thumbnail_url LIKE '%cdn.kletterwelt-sauerland.de%'),
 'source_sector_images',(SELECT count(*) FROM public.sectors WHERE image_url LIKE '%cdn.kletterwelt-sauerland.de%'),
 'auth_metadata_source_storage',(SELECT count(*) FROM auth.users WHERE raw_user_meta_data::text LIKE '%pkzzxtsyxwxoraytyjau.supabase.co%'));"""
data=json.loads(subprocess.check_output(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=sql,text=True))
assert checked==136 and data['source_video_urls']==0 and data['source_thumbnails']==0 and data['source_sector_images']==0
ports=json.loads(subprocess.check_output(['docker','inspect','kws-probe-web-caddy-1'],text=True))[0]['NetworkSettings']['Ports']
assert all(binding['HostIp']=='127.0.0.1' for bindings in ports.values() if bindings for binding in bindings)
result={'cdn_http_hashes_verified':checked,'cdn_http_bytes_verified':cdn['bytes'],**data,'loopback_only':True,'source_changed':False,'production_cutover':False}
(work/'WEB-ASSETS-VERIFIED.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
PY
/opt/kws/tools/supabase db dump --help | grep -- '--keep-comments' > /dev/null
echo 'OFFICIAL_CLI_KEEP_COMMENTS_FLAG_SUPPORTED'
