"""Read-only Storage object totals; does not download object contents."""
import datetime,json,os,socket,sys,urllib.request,urllib.parse
from pathlib import Path
if os.geteuid()!=0 or socket.gethostname().split('.')[0]!='srv2044594':
    raise SystemExit('Unexpected target')
os.umask(0o077)
key=json.loads(sys.stdin.readline())['service_key']
base='https://pkzzxtsyxwxoraytyjau.supabase.co'
def get(path,body=None):
    headers={'apikey':key,'Authorization':'Bearer '+key}
    if body is not None: headers['Content-Type']='application/json'
    req=urllib.request.Request(base+path,headers=headers,data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req,timeout=60) as r: return json.load(r)
summary=[]
for bucket in get('/storage/v1/bucket'):
    pending=['']; visited=set(); count=0; size=0
    while pending:
        prefix=pending.pop()
        if prefix in visited: continue
        visited.add(prefix); offset=0
        while True:
            objects=get('/storage/v1/object/list/'+urllib.parse.quote(bucket['id'],safe=''),
                        {'prefix':prefix,'limit':1000,'offset':offset,'sortBy':{'column':'name','order':'asc'}})
            for obj in objects:
                if obj.get('id') is None and obj.get('metadata') is None:
                    pending.append(prefix+obj['name']+'/')
                else:
                    count+=1; size+=int((obj.get('metadata') or {}).get('size',0))
            if len(objects)<1000: break
            offset+=len(objects)
    summary.append({'bucket':bucket['id'],'objects':count,'declared_bytes':size})
result={'source_project':'pkzzxtsyxwxoraytyjau','kind':'preliminary-storage-inventory',
        'captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'buckets':summary,'total_objects':sum(x['objects'] for x in summary),
        'total_declared_bytes':sum(x['declared_bytes'] for x in summary),'consistent_snapshot':False}
Path('/var/backups/kws/migration/source-storage-inventory.json').write_text(json.dumps(result)+'\n')
print(json.dumps(result))
