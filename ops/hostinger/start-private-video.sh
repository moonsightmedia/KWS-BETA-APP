#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
runtime=/opt/kws/video-private
[[ ! -e "$runtime/.source-restored" ]] || exit 1
install -d -m 700 "$runtime" "$runtime/data"
if [[ ! -d "$runtime/source" ]]; then
  cp -a /opt/kws/web/source/hostinger-video-server "$runtime/source"
fi
python3 - <<'PY'
from pathlib import Path
import shutil
runtime=Path('/opt/kws/video-private')
restores=list(Path('/var/backups/kws/migration').glob('video-precopy-*.tar.age.restore-test'))
assert len(restores)==1 and (restores[0]/'RESTORE-VERIFIED.json').is_file()
final=restores[0]/'final'
assert final.is_dir()
# Only published files: no copied queue, sessions or jobs may auto-resume.
if not (runtime/'data/final').exists(): shutil.copytree(final,runtime/'data/final')
env=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
settings={'PORT':'3000','DATA_DIR':'/data','PUBLIC_BASE_URL':'http://127.0.0.1:9000',
          'SUPABASE_URL':'http://api-gw:8000','SUPABASE_ANON_KEY':env['ANON_KEY'],
          'SUPABASE_SERVICE_ROLE_KEY':'','REQUIRED_ROLES':'admin,setter'}
p=runtime/'.env'
p.write_text('\n'.join(k+'='+v for k,v in settings.items())+'\n'); p.chmod(0o600)
dockerfile=(runtime/'source/Dockerfile').read_text()
assert dockerfile.startswith('FROM node:20-alpine')
(runtime/'Dockerfile.private').write_text(dockerfile.replace('FROM node:20-alpine','FROM node:22-alpine',1).replace('COPY src ./src','COPY src ./src\nCOPY test ./test',1))
PY
cat > "$runtime/docker-compose.yml" <<'EOF'
name: kws-video-private
services:
  video:
    build:
      context: ./source
      dockerfile: /opt/kws/video-private/Dockerfile.private
    restart: unless-stopped
    read_only: true
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
    tmpfs: ["/tmp:size=256m,mode=1777"]
    cpus: 1.0
    mem_limit: 2g
    env_file: .env
    ports: ["127.0.0.1:9000:3000"]
    volumes: ["/opt/kws/video-private/data:/data"]
    networks: [supabase]
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 6
networks:
  supabase:
    external: true
    name: supabase_default
EOF
cd "$runtime"
docker compose build > /var/log/kws-private-video-build.log 2>&1 || { echo 'Private video build failed'; exit 1; }
# Real service test suite with the exact new runtime and FFmpeg.
docker compose run --rm --no-deps --entrypoint node video --test > /var/log/kws-private-video-tests.log 2>&1 || { echo 'Private video tests failed'; exit 1; }
grep -Eq '^# tests [1-9][0-9]*$' /var/log/kws-private-video-tests.log || { echo 'No video tests discovered'; exit 1; }
docker compose up -d --wait --wait-timeout 100 > /var/log/kws-private-video-start.log 2>&1 || { echo 'Private video startup failed'; exit 1; }
python3 - <<'PY'
from pathlib import Path
import hashlib,json,urllib.request,urllib.error,urllib.parse
base='http://127.0.0.1:9000'
health=json.load(urllib.request.urlopen(base+'/health'))
assert health['ok'] and health['queue']==0
final=Path('/opt/kws/video-private/data/final')
checked=[]
for quality in ('hd','sd','low'):
    path=next(final.rglob('*_'+quality+'.mp4'))
    url=base+'/videos/'+urllib.parse.quote(path.relative_to(final).as_posix(),safe='/')
    with urllib.request.urlopen(url) as response:
        assert response.status==200 and 'video/mp4' in response.headers.get('Content-Type','')
        sha=hashlib.sha256()
        while chunk:=response.read(1024*1024): sha.update(chunk)
    with path.open('rb') as source: assert sha.hexdigest()==hashlib.file_digest(source,'sha256').hexdigest()
    with urllib.request.urlopen(urllib.request.Request(url,headers={'Range':'bytes=0-63'})) as response:
        assert response.status==206 and len(response.read())==64
    checked.append(quality)
try:
    urllib.request.urlopen(urllib.request.Request(base+'/upload.php',data=b'',method='POST'))
    raise AssertionError('Unauthenticated upload accepted')
except urllib.error.HTTPError as error: assert error.code==401
print(json.dumps({'video_health':True,'queue_empty':True,'playback_verified':checked,
                  'http_range_verified':True,'unauthenticated_upload':401,
                  'publisher_disabled':True,'source_jobs_copied':False,'production_dns_changed':False}))
PY
echo 'PRIVATE_VIDEO_READY_PUBLISHER_DISABLED_NOT_PRODUCTION'
