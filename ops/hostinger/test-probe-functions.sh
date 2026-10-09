#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import json,secrets,time,urllib.request,urllib.error,sys
config={}
for line in Path('/opt/kws/supabase/runtime/.env').read_text().splitlines():
    if line and not line.startswith('#') and '=' in line:
        key,value=line.split('=',1);config[key]=value.strip('"\'')
base='http://127.0.0.1:9090'
def call(path,body=None,token=None,method='POST'):
    headers={'Content-Type':'application/json','apikey':config['ANON_KEY']}
    if token:headers['Authorization']='Bearer '+token
    req=urllib.request.Request(base+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=30) as r:
            raw=r.read();return r.status,json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        try:result=json.load(e)
        except ValueError:result={}
        return e.code,result
try:
    users=[];suffix=secrets.token_hex(8)
    for i in range(2):
        password=secrets.token_urlsafe(24);email='migration-push-'+suffix+'-'+str(i)+'@example.invalid'
        status,user=call('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True},config['SERVICE_ROLE_KEY'])
        assert status in (200,201)
        status,session=call('/auth/v1/token?grant_type=password',{'email':email,'password':password})
        assert status==200 and session.get('access_token')
        users.append((user['id'],session['access_token']))
    token='private-probe-push-'+suffix
    assert call('/rest/v1/push_tokens',{'user_id':users[0][0],'token':token,'platform':'android'},config['SERVICE_ROLE_KEY'])[0] in (200,201,204)
    # The normal Auth trigger creates preferences; force disabled without sending anything.
    assert call('/rest/v1/notification_preferences?user_id=eq.'+users[0][0],{'push_enabled':False},config['SERVICE_ROLE_KEY'],'PATCH')[0] in (200,204)
    body={'tokens':[{'token':token,'platform':'android'}],'payload':{'title':'Private migration check','body':'No provider delivery requested','action_url':'/'}}
    path='/functions/v1/send-push-notification';checks=[]
    for name,bearer,expected in [('anonymous',None,401),('public-key',config['ANON_KEY'],401),('forged','invalid-test-session',401),('foreign-owner',users[1][1],403)]:
        status,_=call(path,body,bearer);assert status==expected,(name,status);checks.append(name)
    for name,bearer in [('own-device',users[0][1]),('internal-service',config['SERVICE_ROLE_KEY'])]:
        status,result=call(path,body,bearer)
        assert status==200 and result['success']==False and result['results'][0]['error']=='PUSH_DISABLED'
        checks.append(name)
    result={'checks':checks,'passed':len(checks),'emails_sent':0,'pushes_sent':0,'synthetic_users_in_probe':2,'production_cutover':False}
    Path('/opt/kws/probe-functions/LIVE-FUNCTION-VERIFIED.json').write_text(json.dumps(result)+'\n')
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'probe_function_tests_failed':True,'error_class':type(e).__name__}))
    sys.exit(1)
PY
