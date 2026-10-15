#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,re,subprocess,urllib.request,urllib.error
work=Path('/var/backups/kws/migration/kws_restore_probe_20261008_121055')
def sql(query,db='postgres'):
    p=subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    assert p.returncode==0,'Protected SQL check failed'
    return p.stdout.decode().strip()
containers=json.loads(subprocess.check_output(['docker','inspect']+subprocess.check_output(['docker','ps','-aq'],text=True).split()))
print(json.dumps({'containers':[{'name':p['Name'],'status':p['State']['Status'],'health':p['State'].get('Health',{}).get('Status'),'image':p['Config']['Image'],'ports':p['NetworkSettings'].get('Ports')} for p in containers]}))
probe=json.loads((work/'DATA-VERIFIED.json').read_text())['database']
for db in ('postgres',probe):
    print(json.dumps({'database':db,'users':int(sql('SELECT count(*) FROM auth.users;',db)), 'realtime_publication':sql("SELECT coalesce(json_agg(t),'[]') FROM (SELECT schemaname,tablename FROM pg_publication_tables WHERE pubname='supabase_realtime') t;",db),'extensions':sql("SELECT json_agg(t) FROM (SELECT extname,extversion FROM pg_extension ORDER BY extname) t;",db)}))
print(json.dumps({'realtime_tenants':sql("SELECT coalesce(json_agg(t),'[]') FROM (SELECT external_id,name FROM _realtime.tenants) t;")}))
meta=json.loads((work/'source-schema-metadata.json').read_text())
for f in meta['functions']:
    if f['name'] in ('trigger_send_push_notification()','send_push_notification_for_notification()'):
        definition=f['definition']
        print(json.dumps({'source_outbound_function':f['name'],'url_hosts':re.findall(r'https?://([^/\s\x27\x22]+)',definition),'has_http_post':'http_post' in definition,'has_service_token':'service_role' in definition,'has_anon_token':'anon' in definition,'uses_vault':'vault.' in definition,'uses_settings':'current_setting' in definition}))
print(json.dumps({'tools':[p.name for p in Path('/opt/kws/tools').iterdir() if p.is_file()],'stage_manifests':[str(p) for p in Path('/var/backups/kws/migration').glob('*.age')],'disk':subprocess.check_output(['df','-h','/'],text=True).strip()}))
PY
