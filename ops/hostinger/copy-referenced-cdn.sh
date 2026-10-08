#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
import collections,concurrent.futures,datetime,hashlib,json,subprocess,tarfile,urllib.request,urllib.error,urllib.parse
from pathlib import Path
probe=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
assert (probe/'API-VERIFIED.json').is_file()
db='kws_restore_probe_20261008_121055'
def query(sql):
    return subprocess.check_output(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=sql,text=True)
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
root=Path('/var/backups/kws/migration')/('cdn-precopy-'+stamp)
root.mkdir(mode=0o700);(root/'objects').mkdir(mode=0o700)
references=collections.defaultdict(set)
def visit(value,location):
    if isinstance(value,dict):
        for v in value.values():visit(v,location)
    elif isinstance(value,list):
        for v in value:visit(v,location)
    elif isinstance(value,str) and value.startswith('https://cdn.kletterwelt-sauerland.de/'):
        parsed=urllib.parse.urlsplit(value)
        assert parsed.hostname=='cdn.kletterwelt-sauerland.de' and parsed.port in (None,443) and not parsed.username and not parsed.password
        references[value].add(location)
tables=json.loads(query("SELECT json_agg(tablename) FROM pg_tables WHERE schemaname='public';"))
for table in tables:
    assert table.replace('_','').isalnum()
    rows=json.loads(query('SELECT coalesce(json_agg(t),\'[]\'::json) FROM public."'+table+'" t;'))
    for row in rows:
        for column,value in row.items():visit(value,table+'.'+column)
class SameOriginRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        p=urllib.parse.urlsplit(newurl)
        if p.scheme!='https' or p.hostname!='cdn.kletterwelt-sauerland.de' or p.port not in (None,443) or p.username or p.password:
            raise RuntimeError('CDN redirect outside permitted HTTPS origin')
        return super().redirect_request(req,fp,code,msg,headers,newurl)
def download(url):
    local='objects/'+hashlib.sha256(url.encode()).hexdigest()
    result={'url':url,'references':sorted(references[url]),'local':local}
    try:
        opener=urllib.request.build_opener(SameOriginRedirect())
        with opener.open(urllib.request.Request(url,headers={'User-Agent':'KWS-Migration-ReadOnly/1.0'}),timeout=25) as response:
            mime=response.headers.get_content_type()
            if not (mime.startswith('image/') or mime.startswith('video/')):
                result.update(status='unexpected-content-type',content_type=mime);return result
            sha=hashlib.sha256();length=0
            with (root/local).open('xb') as output:
                while chunk:=response.read(1024*1024):
                    length+=len(chunk)
                    if length>100*1024*1024:raise RuntimeError('CDN object exceeds migration bound')
                    output.write(chunk);sha.update(chunk)
            expected=response.headers.get('Content-Length')
            if expected is not None:assert int(expected)==length
            result.update(status=200,bytes=length,sha256=sha.hexdigest(),content_type=mime)
    except urllib.error.HTTPError as error:result['status']=error.code
    return result
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    objects=list(pool.map(download,sorted(references)))
manifest={'kind':'referenced-cdn-precopy','captured_at':stamp,'writers_frozen':False,'objects':objects}
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],text=True).strip()
archive=Path(str(root)+'.tar.gz.age');partial=Path(str(archive)+'.partial')
with partial.open('xb') as output:
    encrypt=subprocess.Popen(['age','-r',recipient],stdin=subprocess.PIPE,stdout=output)
    with tarfile.open(fileobj=encrypt.stdin,mode='w|gz') as tar:tar.add(root,arcname=root.name)
    encrypt.stdin.close();assert encrypt.wait()==0
partial.rename(archive)
with archive.open('rb') as f:checksum=hashlib.file_digest(f,'sha256').hexdigest()
Path(str(archive)+'.sha256').write_text(checksum+'  '+archive.name+'\n')
restore=Path(str(archive)+'.restore-test');restore.mkdir(mode=0o700)
plain=root/'decrypted-restore.tar.gz'
with plain.open('xb') as output:
    subprocess.run(['age','-d','-i','/root/.config/kws-migration/age-key.txt',str(archive)],stdout=output,check=True)
with tarfile.open(plain) as tar:tar.extractall(restore,filter='data')
restored=restore/root.name
assert json.loads((restored/'manifest.json').read_text())==manifest
for item in objects:
    if item['status']==200:
        f=restored/item['local'];assert f.stat().st_size==item['bytes']
        with f.open('rb') as content:assert hashlib.file_digest(content,'sha256').hexdigest()==item['sha256']
summary={'archive':archive.name,'referenced_urls':len(objects),'copied_files':sum(o['status']==200 for o in objects),'bytes':sum(o.get('bytes',0) for o in objects),'status_counts':dict(collections.Counter(str(o['status']) for o in objects)),'unavailable_reference_locations':dict(collections.Counter(location for o in objects if o['status']!=200 for location in o['references'])),'decrypted_restore_verified':True,'source_changed':False,'final_cutover_copy':False}
(root/'RESTORE-VERIFIED.json').write_text(json.dumps(summary,indent=2))
(probe/'CDN-PRECOPY.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary))
PY
