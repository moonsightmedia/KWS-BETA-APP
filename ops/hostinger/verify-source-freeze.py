"""Verify the installed gate through all three live source write APIs.

REST uses a nonexistent UUID. Auth and Storage repeat the current value only;
there is no password change, email, signup, object upload, or deletion.
"""
import datetime,json,os,socket,sys,urllib.request,urllib.error
from pathlib import Path
assert os.geteuid()==0 and socket.gethostname().split('.')[0]=='srv2044594'
os.umask(0o077)
request=json.loads(sys.stdin.readline())
root=Path('/var/backups/kws/migration')
record=root/'SOURCE-MAINTENANCE-GATE.json'
gate=json.loads(record.read_text())
assert gate['active'] and gate['covered_tables']==66 and not gate['api_rejection_verified']
key=request['service_key'];base='https://pkzzxtsyxwxoraytyjau.supabase.co';stage='initial';diagnostics={}
def api(path,method='GET',body=None):
    req=urllib.request.Request(base+path,method=method,
        headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'},
        data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req,timeout=30) as response:
            return response.status,json.loads(response.read() or b'null')
    except urllib.error.HTTPError as error:
        return error.code,json.loads(error.read() or b'null')
try:
    stage='read_auth_users'
    status,users=api('/auth/v1/admin/users?page=1&per_page=1')
    diagnostics['auth_read_status']=status
    assert status==200 and users['users']
    user=users['users'][0];uid=user['id'];metadata=user.get('user_metadata') or {}
    status,buckets=api('/storage/v1/bucket')
    diagnostics['storage_read_status']=status
    assert status==200 and buckets
    bucket=buckets[0];bid=bucket['id']
    assert uid.replace('-','').isalnum() and bid.replace('-','').replace('_','').isalnum()
    stage='rest_write_rejection'
    rest_status,rest=api('/rest/v1/boulders?id=eq.00000000-0000-0000-0000-000000000000',
        'PATCH',{'name':'KWS maintenance rejection probe'})
    diagnostics.update(rest_status=rest_status,rest_sqlstate=rest.get('code'))
    assert rest_status>=400 and rest.get('code')=='55000'
    assert 'writes are temporarily disabled' in rest.get('message','')
    stage='auth_write_rejection'
    auth_status,auth=api('/auth/v1/admin/users/'+uid,'PUT',{'user_metadata':metadata})
    diagnostics.update(auth_write_status=auth_status,auth_error_code=auth.get('error_code'),auth_error_classes=[v for v in ('database','temporarily disabled','unexpected') if v in str(auth).lower()])
    # Hosted GoTrue masks database exceptions as unexpected_failure. Combined
    # with the exact SQL gate, healthy reads and unchanged values this is the
    # expected rejection; do not require a leaked database exception message.
    assert auth_status==500 and (auth.get('error_code')=='unexpected_failure' or 'database' in str(auth.get('msg',auth.get('message',''))).lower())
    stage='storage_write_rejection'
    storage_status,storage=api('/storage/v1/bucket/'+bid,'PUT',{'public':bucket['public']})
    diagnostics.update(storage_write_status=storage_status,storage_error_classes=[v for v in ('database','temporarily disabled','permission','55000') if v in str(storage).lower()])
    assert storage_status>=400 and ('temporarily disabled' in str(storage) or 'database' in str(storage).lower())
    stage='unchanged_auth_value'
    status,current=api('/auth/v1/admin/users/'+uid)
    assert status==200 and current['user_metadata']==metadata and current['updated_at']==user['updated_at']
    stage='unchanged_bucket_value'
    status,current=api('/storage/v1/bucket/'+bid)
    assert status==200 and current['public']==bucket['public']
    proof={'rest_status':rest_status,'auth_status':auth_status,'storage_status':storage_status,
        'rest_sqlstate':'55000','existing_auth_and_bucket_values_unchanged':True,
        'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    gate.update(api_rejection_verified=True,api_rejection=proof)
    record.write_text(json.dumps(gate)+'\n')
    print(json.dumps({'source_api_writes_rejected':True,**proof}))
except Exception as error:
    print(json.dumps({'source_freeze_api_verification_failed':True,'error_class':type(error).__name__,'stage':stage,'diagnostics':diagnostics}))
    sys.exit(1)
finally:
    key=None;request=None
    stage='read_storage_buckets'
