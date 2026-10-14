#!/usr/bin/env bash
set -Eeuo pipefail
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,subprocess
root=Path('/opt/kws/web-production')
def sql(query):
 r=subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 assert r.returncode==0,'Read-only preflight SQL failed'
 return r.stdout.decode().strip()
print(json.dumps({'web_source':json.loads((root/'SOURCE.json').read_text()),'runtime_healthy':(root/'source/dist/index.html').is_file(),
 'boulders':json.loads(sql("SELECT json_build_object('total',count(*),'without_video',count(*) FILTER (WHERE beta_video_status='none' AND beta_video_url IS NULL),'rls', (SELECT relrowsecurity FROM pg_class WHERE oid='public.boulders'::regclass)) FROM public.boulders;")),
 'policies':json.loads(sql("SELECT coalesce(json_agg(json_build_object('name',policyname,'roles',roles,'command',cmd)), '[]'::json) FROM pg_policies WHERE schemaname='public' AND tablename='boulders';")),
 'video_fields':json.loads(sql("SELECT json_agg(json_build_object('name',column_name,'nullable',is_nullable,'default',column_default)) FROM information_schema.columns WHERE table_schema='public' AND table_name='boulders' AND column_name LIKE 'beta_video%';"))}))
PY
