"""Read-only preliminary API inventory; no row contents are printed or saved."""
import datetime,json,os,socket,sys,urllib.request,urllib.parse
from pathlib import Path
if os.geteuid()!=0 or socket.gethostname().split('.')[0]!='srv2044594':
    raise SystemExit('Unexpected target')
os.umask(0o077)
key=json.loads(sys.stdin.readline())['service_key']
base='https://pkzzxtsyxwxoraytyjau.supabase.co'
headers={'apikey':key,'Authorization':'Bearer '+key}
def read_json(path):
    with urllib.request.urlopen(urllib.request.Request(base+path,headers=headers),timeout=60) as r:
        return json.load(r)
schema=read_json('/rest/v1/')
counts={}
for path,operations in sorted(schema.get('paths',{}).items()):
    if path=='/' or path.startswith('/rpc/') or 'get' not in operations: continue
    request=urllib.request.Request(base+'/rest/v1'+path+'?select=*',headers={**headers,'Prefer':'count=exact','Range':'0-0'},method='HEAD')
    with urllib.request.urlopen(request,timeout=60) as r:
        value=r.headers.get('Content-Range','').rsplit('/',1)[-1]
        counts[path.lstrip('/')]=int(value) if value.isdigit() else None
user_count=0; page=1
while True:
    response=read_json('/auth/v1/admin/users?page='+str(page)+'&per_page=250')
    users=response.get('users',[])
    user_count+=len(users)
    if len(users)<250: break
    page+=1
result={'source':base,'captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'kind':'preliminary-api-inventory','consistent_database_snapshot':False,
        'table_or_view_counts':counts,'auth_user_count':user_count,
        'rpc_names':[p.removeprefix('/rpc/') for p in schema.get('paths',{}) if p.startswith('/rpc/')]}
target=Path('/var/backups/kws/migration/source-api-inventory.json')
target.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'source_project':'pkzzxtsyxwxoraytyjau','tables_or_views':len(counts),
                  'auth_user_count':user_count,'inventory_file':str(target),
                  'full_database_export':False}))
