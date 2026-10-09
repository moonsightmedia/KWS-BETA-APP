#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import hashlib,json,subprocess,urllib.request
root=Path('/opt/kws/production');proof=json.loads((root/'DATABASE-PROMOTED.json').read_text())
assert proof['database']=='postgres' and not (root/'PUBLIC-WRITES-ENABLED.json').exists()
work=Path('/var/backups/kws/migration')/proof['original_candidate']
runtime=dict(line.split('=',1) for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
def sql(query):
 result=subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 assert result.returncode==0;return result.stdout.decode().strip()
decrypted=sql("SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='kws_internal_push_service_key';")
assert decrypted==runtime['SERVICE_ROLE_KEY'];decrypted=None
config={'database':'postgres','publicWrites':False,'anon':runtime['ANON_KEY'],'service':runtime['SERVICE_ROLE_KEY'],'users':proof['users'],
 'boulders':int(sql('SELECT count(*) FROM public.boulders;')),'sectors':int(sql('SELECT count(*) FROM public.sectors;'))}
assert config['boulders']>0 and config['sectors']>0
result=subprocess.run(['docker','run','--rm','-i','--network','host','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1',
 '-v','/opt/kws/probe-web/source:/app:ro','-v','/opt/kws/tools/test-production-runtime.mjs:/test.mjs:ro','node:22-alpine','node','/test.mjs'],input=json.dumps(config).encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
# The test prints only named checks and booleans; do not forward stack traces.
lines=result.stdout.decode().splitlines()
for line in lines:
 try:row=json.loads(line)
 except ValueError:continue
 if 'check' in row or row.get('production_runtime_verified'):print(json.dumps(row),flush=True)
assert result.returncode==0,'Production runtime tests failed; no raw diagnostics printed'
outcome=json.loads(lines[-1]);assert outcome['production_runtime_verified'] and outcome['test_accounts_removed']
assert int(sql('SELECT count(*) FROM auth.users;'))==proof['users']
# Prove the actual production Storage mount serves the original bytes through
# the internal production gateway, independent of the candidate container.
metadata=json.loads((work/'storage-metadata-before.json').read_text())
manifests=[json.loads(p.read_text()) for p in Path('/var/backups/kws/migration').glob('storage-final-*.age.restore-test/*/manifest.json')]
manifest=max(manifests,key=lambda item:item['captured_at'])
import urllib.parse
samples=[]
for bucket in sorted({o['bucket'] for o in manifest['objects']}):
 item=next(o for o in manifest['objects'] if o['bucket']==bucket)
 path='/storage/v1/object/authenticated/'+urllib.parse.quote(bucket,safe='')+'/'+urllib.parse.quote(item['path'],safe='/')
 request=urllib.request.Request('http://127.0.0.1:9082'+path,headers={'Authorization':'Bearer '+runtime['SERVICE_ROLE_KEY'],'apikey':runtime['ANON_KEY']})
 with urllib.request.urlopen(request,timeout=30) as response:body=response.read();assert response.status==200
 assert len(body)==item['bytes'] and hashlib.sha256(body).hexdigest()==item['sha256'];samples.append(bucket)
report={**outcome,'production_storage_sample_buckets':samples,'production_vault_decryption_verified':True,'public_routes_still_disabled':True}
(root/'RUNTIME-VERIFIED.json').write_text(json.dumps(report)+'\n');print(json.dumps(report))
PY
