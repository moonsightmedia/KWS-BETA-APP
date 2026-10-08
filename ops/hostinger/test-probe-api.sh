#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import base64,hashlib,json,re,secrets,subprocess,urllib.request,urllib.error,uuid
work=sorted(p for p in Path('/var/backups/kws/migration').glob('kws_restore_probe_*') if (p/'STORAGE-VERIFIED.json').is_file())[-1]
if (work/'API-TEST-RESULTS.json').exists():
    (work/('API-TEST-RESULTS-previous-'+uuid.uuid4().hex+'.json')).write_bytes((work/'API-TEST-RESULTS.json').read_bytes())
db=json.loads((work/'DATA-VERIFIED.json').read_text())['database']
meta=json.loads((work/'source-schema-metadata.json').read_text())
for function in meta['functions']:
    if re.search(r'\b(?:http_post|http_get|http_request|dblink|dblink_exec)\s*\(',function['definition'],re.I):
        print(json.dumps({'outbound_function':function['name']}),flush=True)
        assert function['name'] in ('trigger_send_push_notification()','send_push_notification_for_notification()'), 'Unexpected outbound function needs review'
(work/'PROBE-TESTS-STARTED.json').write_text(json.dumps({'database':db,'test_users_added':True,'final_snapshot_pristine':False}))
log=(work/'api-tests.log').open('wb')
def sql(query):
    return subprocess.check_output(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,
        '-X','-qAt','-v','ON_ERROR_STOP=1'],input=query.encode(),stderr=log)
config={}
for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines():
    if line and not line.startswith('#') and '=' in line:
        key,value=line.split('=',1);config[key]=value.strip('"\'')
# Reversible, explicit probe-only stubs prevent copied triggers contacting Cloud.
# Source definitions remain in the encrypted archive and verified metadata files.
sql("""BEGIN;
CREATE OR REPLACE FUNCTION public.trigger_send_push_notification() RETURNS trigger
LANGUAGE plpgsql AS $probe$ BEGIN RETURN NEW; END; $probe$;
CREATE OR REPLACE FUNCTION public.send_push_notification_for_notification() RETURNS trigger
LANGUAGE plpgsql AS $probe$ BEGIN RETURN NEW; END; $probe$;
COMMIT;""")
checks=[]
def check(name,condition,status=None,critical=False):
    row={'check':name,'passed':bool(condition)}
    if status is not None:row['http_status']=status
    checks.append(row)
    (work/'API-TEST-RESULTS.json').write_text(json.dumps({'checks':checks,'passed':all(c['passed'] for c in checks)},indent=2))
    print(json.dumps(row),flush=True)
    if critical:assert condition, 'Critical probe assertion failed: '+name
def api(port,path,token=None,body=None,method=None,headers=None):
    h={'Authorization':'Bearer '+token} if token else {}
    if headers:h.update(headers)
    if body is not None and not isinstance(body,bytes):
        body=json.dumps(body).encode();h['Content-Type']='application/json'
    request=urllib.request.Request('http://127.0.0.1:'+str(port)+path,headers=h,data=body,method=method)
    try:
        with urllib.request.urlopen(request,timeout=30) as response:status=response.status;raw=response.read()
    except urllib.error.HTTPError as error:status=error.code;raw=error.read()
    try:result=json.loads(raw)
    except (ValueError,UnicodeDecodeError):result=raw
    return status,result
users={}
for role in ('user','setter','admin'):
    email='migration-probe-'+role+'-'+uuid.uuid4().hex+'@example.invalid';password=secrets.token_urlsafe(32)
    status,created=api(9998,'/admin/users',config['SERVICE_ROLE_KEY'],
                         {'email':email,'password':password,'email_confirm':True,'user_metadata':{'full_name':'Migration Probe '+role}})
    check('create_private_'+role,status==200,status,True)
    user_id=created['id']
    check('registration_profile_and_default_role_'+role,sql("SELECT (EXISTS(SELECT 1 FROM public.profiles WHERE id='"+user_id+"') AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id='"+user_id+"' AND role='user'));").decode().strip()=='t')
    if role!='user':sql("INSERT INTO public.user_roles(user_id,role) VALUES ('"+user_id+"','"+role+"') ON CONFLICT DO NOTHING;")
    status,session=api(9998,'/token?grant_type=password',None,{'email':email,'password':password})
    check('password_login_'+role,status==200 and session.get('user',{}).get('id')==user_id,status,True)
    users[role]={'id':user_id,'token':session['access_token'],'refresh':session['refresh_token'],'email':email,'password':password}
status,body=api(9998,'/user',users['user']['token'])
check('authenticated_user_endpoint',status==200 and body['id']==users['user']['id'],status)
status,body=api(9998,'/token?grant_type=refresh_token',None,{'refresh_token':users['user']['refresh']})
check('session_refresh',status==200 and body['user']['id']==users['user']['id'],status)
users['user']['token']=body['access_token']
status,body=api(9998,'/token?grant_type=password',None,{'email':users['user']['email'],'password':secrets.token_urlsafe(32)})
check('wrong_password_denied',status in (400,401) and body.get('error_code')=='invalid_credentials',status)
status,body=api(9998,'/admin/users',config['ANON_KEY'])
check('guest_auth_admin_denied',status in (401,403),status)
status,body=api(9996,'/boulders?select=id&limit=1',config['ANON_KEY'])
check('guest_can_read_public_boulders',status==200 and len(body)>0,status)
status,body=api(9996,'/profiles?select=id',config['ANON_KEY'])
check('guest_cannot_read_profiles',status==200 and len(body)==0,status)
status,body=api(9996,'/profiles?select=id&id=eq.'+users['user']['id'],users['user']['token'])
check('user_can_read_own_profile',status==200 and len(body)==1,status)
status,body=api(9996,'/profiles?select=id&id=eq.'+users['admin']['id'],users['user']['token'])
check('user_cannot_read_other_profile',status==200 and len(body)==0,status)
status,body=api(9996,'/profiles?select=id,email,birth_date&id=eq.'+users['admin']['id'],users['user']['token'])
check('user_cannot_read_other_email_or_birth_date',status==200 and len(body)==0,status)
if (work/'PROBE-SECURITY-APPLIED.json').exists():
    status,body=api(9996,'/rpc/get_community_display_names',users['user']['token'],{'p_user_ids':[users['admin']['id']]})
    check('peer_display_name_available_without_private_fields',status==200 and len(body)==1 and set(body[0])=={'id','full_name'},status)
    status,body=api(9996,'/rpc/get_community_display_names',config['ANON_KEY'],{'p_user_ids':[users['admin']['id']]})
    check('guest_cannot_call_community_name_rpc',status in (401,403),status)
status,body=api(9996,'/profiles?select=id',users['admin']['token'])
check('admin_can_read_all_profiles',status==200 and len(body)>=47,status)
for role in ('user','setter'):
    status,body=api(9996,'/user_roles',users[role]['token'],{'user_id':users[role]['id'],'role':'admin'})
    check(role+'_cannot_promote_self_to_admin',status in (401,403),status)
for role in ('user','setter','guest'):
    token=config['ANON_KEY'] if role=='guest' else users[role]['token']
    status,body=api(9996,'/colors',token,{'name':'Migration '+uuid.uuid4().hex,'hex':'#101010'})
    check(role+'_cannot_create_admin_color',status in (401,403),status)
status,body=api(9996,'/colors',users['admin']['token'],{'name':'Migration '+uuid.uuid4().hex,'hex':'#101010'},headers={'Prefer':'return=representation'})
check('admin_can_create_color',status==201 and len(body)==1,status)
fake=str(uuid.uuid4())
payload={'p_boulder_id':fake,'p_upload_session_id':'migration-probe','p_job_id':fake,'p_status':'failed',
         'p_hd_url':None,'p_sd_url':None,'p_low_url':None,'p_error':'private probe'}
for role in ('guest','user','setter'):
    token=config['ANON_KEY'] if role=='guest' else users[role]['token']
    status,body=api(9996,'/rpc/sync_boulder_video_job',token,payload)
    check(role+'_cannot_call_video_publisher_rpc',status in (401,403),status)
for role in ('guest','user'):
    token=config['ANON_KEY'] if role=='guest' else users[role]['token']
    status,body=api(9996,'/rpc/begin_boulder_video_upload',token,{'p_boulder_id':fake,'p_upload_session_id':'migration-probe'})
    check(role+'_cannot_start_setter_video_job',status in (401,403),status)
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5xkAAAAASUVORK5CYII=')
for role in ('guest','user'):
    name='__migration_probe/'+uuid.uuid4().hex+'.png'
    token=config['ANON_KEY'] if role=='guest' else users[role]['token']
    status,body=api(9997,'/object/sector-images/'+name,token,png,headers={'Content-Type':'image/png'})
    denied=status in (400,401,403) and str(body.get('statusCode',status)) in ('401','403')
    check(role+'_cannot_upload_sector_image',denied,status)
name='__migration_probe/'+uuid.uuid4().hex+'.png'
status,body=api(9997,'/object/sector-images/'+name,users['setter']['token'],png,headers={'Content-Type':'image/png'})
check('setter_can_upload_sector_image',status in (200,201),status)
status,body=api(9997,'/object/public/sector-images/'+name)
check('uploaded_public_image_download_hash',status==200 and isinstance(body,bytes) and hashlib.sha256(body).digest()==hashlib.sha256(png).digest(),status)
for role in ('guest','user'):
    token=config['ANON_KEY'] if role=='guest' else users[role]['token']
    status,body=api(9996,'/feedback?select=id&limit=1',token)
    check(role+'_cannot_read_admin_feedback',status==200 and len(body)==0,status)
status,body=api(9996,'/feedback?select=id&limit=1',users['admin']['token'])
check('admin_can_read_feedback',status==200 and len(body)==1,status)
result={'checks':len(checks),'all_passed':all(c['passed'] for c in checks),'failed_checks':[c['check'] for c in checks if not c['passed']],'database':db,'new_test_accounts_this_run':3,
 'only_probe_mutated':True,'outbound_push_stubbed':True,'smtp_send_verified':False,
 'rendered_app_verified':False,'production_cutover':False}
(work/'API-RESULT-SUMMARY.json').write_text(json.dumps(result))
if result['all_passed']:(work/'API-VERIFIED.json').write_text(json.dumps(result))
print(json.dumps(result),flush=True)
log.close()
PY
