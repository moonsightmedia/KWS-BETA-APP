#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import base64,datetime,json,shutil,subprocess
runtime=Path('/opt/kws/supabase/runtime');production=Path('/opt/kws/production');production.mkdir(mode=0o700,exist_ok=True)
assert not (production/'RUNTIME-PREPARED.json').exists(), 'Inspect existing preparation rather than overwriting'
candidate=Path('/var/backups/kws/migration/kws_restore_probe_20261009_092807')
assert json.loads((candidate/'STORAGE-VERIFIED.json').read_text())['all_sha256_match'] is True
env_path=runtime/'.env';env=dict(line.split('=',1) for line in env_path.read_text().splitlines() if '=' in line and not line.startswith('#'))
integrations=json.loads(Path('/opt/kws/integrations/runtime.json').read_text())
recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],text=True).strip()
subprocess.run(['age','-r',recipient,'-o',str(production/'supabase-env-before-production.age'),str(env_path)],check=True,stderr=subprocess.DEVNULL)
updates={'SUPABASE_PUBLIC_URL':'https://beta-api.kletterwelt-sauerland.de','API_EXTERNAL_URL':'https://beta-api.kletterwelt-sauerland.de',
 'SITE_URL':'https://beta.kletterwelt-sauerland.de','ADDITIONAL_REDIRECT_URLS':'https://beta.kletterwelt-sauerland.de/**',
 'SMTP_HOST':integrations['smtp_host'],'SMTP_PORT':str(integrations['smtp_port']),'SMTP_USER':integrations['smtp_user'],
 'SMTP_PASS':integrations['smtp_password'],'SMTP_ADMIN_EMAIL':integrations['sender'],'SMTP_SENDER_NAME':integrations['sender_name'],
 'ENABLE_EMAIL_AUTOCONFIRM':'false','ENABLE_EMAIL_SIGNUP':'true','DISABLE_SIGNUP':'true'}
lines=env_path.read_text().splitlines();seen=set()
for index,line in enumerate(lines):
 key=line.split('=',1)[0]
 if key in updates:lines[index]=key+'='+updates[key];seen.add(key)
lines += [k+'='+v for k,v in updates.items() if k not in seen]
env_path.write_text('\n'.join(lines)+'\n');env_path.chmod(0o600)
function_root=runtime/'volumes/functions/send-push-notification';function_root.mkdir(mode=0o700,exist_ok=True)
for name in ('index.ts','handler.ts'):shutil.copy2(Path('/opt/kws/probe-functions/functions/send-push-notification')/name,function_root/name)
override={'services':{
 'auth':{'environment':{'GOTRUE_SMTP_HEADERS':json.dumps({'Reply-To':integrations['reply_to']}),'GOTRUE_MAILER_SUBJECTS_CONFIRMATION':'Kletterwelt Sauerland – E-Mail bestätigen','GOTRUE_MAILER_SUBJECTS_RECOVERY':'Kletterwelt Sauerland – Passwort zurücksetzen'}},
 'functions':{'environment':{'SUPABASE_URL':'http://kws-api-internal:80','VERIFY_JWT':'true','FCM_SERVICE_ACCOUNT_JSON':base64.b64encode(json.dumps(integrations['fcm_service_account']).encode()).decode()}}
}}
override_path=runtime/'docker-compose.production.json';override_path.write_text(json.dumps(override)+'\n');override_path.chmod(0o600)
compose=['docker','compose','-f','docker-compose.yml','-f','docker-compose.local.yml','-f','docker-compose.production.json']
config=json.loads(subprocess.check_output(compose+['config','--format','json'],cwd=runtime))
assert config['services']['auth']['environment']['GOTRUE_DISABLE_SIGNUP']=='true'
assert config['services']['functions']['environment']['VERIFY_JWT']=='true'
assert config['services']['auth']['environment']['GOTRUE_SMTP_PASS']==integrations['smtp_password']
# Configuration only: no restart, no target users created, no public routes opened.
(production/'RUNTIME-PREPARED.json').write_text(json.dumps({'prepared_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'smtp_ready':True,'functions_configured':True,'signup_disabled_until_cutover':True,'compose_files':['docker-compose.yml','docker-compose.local.yml','docker-compose.production.json'],'applied':False})+'\n')
print(json.dumps({'production_runtime_prepared':True,'applied':False,'source_changed':False,'public_routes_disabled':True}))
PY
cat > /opt/kws/production/API.Caddyfile <<'EOF'
{
  admin off
}
http://:80 {
  header {
    X-Content-Type-Options nosniff
    X-Frame-Options DENY
    Referrer-Policy no-referrer
  }
  @cors header_regexp Origin ^(https://beta\.kletterwelt-sauerland\.de|https://localhost|capacitor://localhost|http://localhost)$
  header @cors {
    Access-Control-Allow-Origin {http.request.header.Origin}
    Access-Control-Allow-Methods "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS"
    Access-Control-Allow-Headers "authorization, apikey, content-type, x-client-info, prefer, range, x-upsert, x-supabase-api-version"
    Access-Control-Expose-Headers "content-range, range, x-total-count"
    Vary Origin
    defer
  }
  @preflight method OPTIONS
  handle @preflight {
    respond "" 204
  }
  handle /healthz {
    header Content-Type application/json
    respond `{"status":"target-prepared"}` 200
  }
  handle_path /auth/v1/* {
    reverse_proxy supabase-auth:9999
  }
  handle_path /rest/v1/* {
    reverse_proxy supabase-rest:3000
  }
  handle_path /storage/v1/* {
    reverse_proxy supabase-storage:5000
  }
  handle_path /realtime/v1/* {
    @socket path /websocket
    handle @socket {
      rewrite /socket/websocket
      reverse_proxy realtime-dev.supabase-realtime:4000 {
        header_up Host realtime-dev.localhost
      }
    }
    @broadcast path /api/broadcast
    handle @broadcast {
      reverse_proxy realtime-dev.supabase-realtime:4000 {
        header_up Host realtime-dev.localhost
      }
    }
    handle {
      respond "Unknown Realtime route" 404
    }
  }
  handle_path /functions/v1/* {
    @push path /send-push-notification
    handle @push {
      reverse_proxy supabase-edge-functions:9000
    }
    handle {
      respond "Unknown function" 404
    }
  }
  handle {
    respond "Not found" 404
  }
}
EOF
cat > /opt/kws/production/docker-compose.yml <<'EOF'
name: kws-production
services:
  api:
    container_name: kws-api-internal
    image: caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f
    restart: unless-stopped
    read_only: true
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]
    security_opt: [no-new-privileges:true]
    ports: ["127.0.0.1:9082:80"]
    volumes:
      - /opt/kws/production/API.Caddyfile:/etc/caddy/Caddyfile:ro
    tmpfs: ["/data:size=16m", "/config:size=16m"]
    networks: [supabase]
networks:
  supabase:
    external: true
    name: supabase_default
EOF
cd /opt/kws/production
docker compose run --rm --no-deps api caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile > /var/log/kws-production-api-validation.log 2>&1 || { echo PRIVATE_PRODUCTION_CONFIG_INVALID_INSPECT_PROTECTED_LOG; exit 1; }
echo PRIVATE_PRODUCTION_API_CONFIG_VALID_NOT_STARTED
