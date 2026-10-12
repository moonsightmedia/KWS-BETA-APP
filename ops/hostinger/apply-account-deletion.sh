#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
install -d -m 700 /var/lib/kws-account-deletion
recipient=$(age-keygen -y /root/.config/kws-migration/age-key.txt)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker exec supabase-db pg_dump -U supabase_admin -d postgres --schema-only 2>/var/lib/kws-account-deletion/apply.log |
  age -r "$recipient" > "/var/lib/kws-account-deletion/schema-before-$stamp.sql.age"
python3 - <<'PY'
import datetime,json,pathlib,subprocess
root=pathlib.Path('/opt/kws/release-readiness')
client=['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1']
with pathlib.Path('/var/lib/kws-account-deletion/apply.log').open('ab') as log:
 def sql(query):return subprocess.check_output(client,input=query.encode(),stderr=log).decode().strip()
 before=sql("SELECT json_build_object('users',(SELECT count(*) FROM auth.users),'storage',(SELECT count(*) FROM storage.objects));")
 subprocess.run(client,input=(root/'20261012090000_account_deletion_requests.sql').read_bytes(),stdout=log,stderr=log,check=True)
 result=sql((root/'test-account-deletion.sql').read_text())
 assert 'ACCOUNT_DELETION_SQL_SECURITY_AND_ERASURE_VERIFIED' in result
 after=sql("SELECT json_build_object('users',(SELECT count(*) FROM auth.users),'storage',(SELECT count(*) FROM storage.objects));")
 assert before==after,'Existing account/file totals changed'
 report={'configured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'private_self_request_enabled':True,'deadline_days':7,'owner':'Marketing','duplicate_deadline_preserved':True,'foreign_request_hidden':True,'direct_client_writes_denied':True,'client_purge_denied':True,'deleted_user_token_denied':True,'owned_storage_blocks_erasure':True,'synthetic_erasure_cascades_verified':True,'synthetic_data_rolled_back':True,'existing_totals':json.loads(after),'operator_script_installed':True,'real_accounts_deleted':0}
 subprocess.run(['python3','-c',"import ast,pathlib; ast.parse(pathlib.Path('/opt/kws/release-readiness/account-deletion.py').read_text())"],check=True,stderr=log)
 (root/'ACCOUNT-DELETION-VERIFIED.json').write_text(json.dumps(report)+'\n')
 print(json.dumps(report))
PY
