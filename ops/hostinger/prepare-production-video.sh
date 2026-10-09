#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess
root=Path('/opt/kws/video-production');root.mkdir(mode=0o700,exist_ok=True)
assert not (root/'docker-compose.yml').exists(), 'Existing production video requires inspection'
(root/'data').mkdir(mode=0o700,exist_ok=True)
image=json.loads(subprocess.check_output(['docker','inspect','kws-video-private-video-1']))[0]['Image']
assert image.startswith('sha256:') and len(image)==71
env=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
values={'PORT':'3000','DATA_DIR':'/data','PUBLIC_BASE_URL':'https://video.kletterwelt-sauerland.de',
 'SUPABASE_URL':'http://kws-api-internal:80','SUPABASE_ANON_KEY':env['ANON_KEY'],'SUPABASE_SERVICE_ROLE_KEY':env['SERVICE_ROLE_KEY'],
 'REQUIRED_ROLES':'admin,setter','KWS_VIDEO_IMAGE':image}
(root/'.env').write_text('\n'.join(k+'='+v for k,v in values.items())+'\n');(root/'.env').chmod(0o600)
(root/'PREPARED.json').write_text(json.dumps({'image':image,'private_probe_image_reused':True,'production_media_not_copied_yet':True,'public_cutover':False})+'\n')
print(json.dumps({'production_video_prepared':True,'production_media_not_copied_yet':True}))
PY
cat > /opt/kws/video-production/docker-compose.yml <<'EOF'
name: kws-video-production
services:
  video:
    container_name: kws-video-production
    image: ${KWS_VIDEO_IMAGE}
    restart: unless-stopped
    read_only: true
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
    tmpfs: ["/tmp:size=256m,mode=1777"]
    cpus: 2.0
    mem_limit: 2g
    env_file: .env
    ports: ["127.0.0.1:9085:3000"]
    volumes: ["/opt/kws/video-production/data:/data"]
    networks: [supabase]
    logging:
      driver: local
      options: {max-size: "10m", max-file: "3"}
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
docker compose -f /opt/kws/video-production/docker-compose.yml --env-file /opt/kws/video-production/.env config --quiet
echo PRODUCTION_VIDEO_CONFIG_VALID_NOT_STARTED
