import {spawn} from 'node:child_process';
import {homedir} from 'node:os';
import {join} from 'node:path';
const targetArgs=['-T','-i',join(homedir(),'.ssh','id_ed25519_kws_vps_laptop'),'-o','IdentitiesOnly=yes',
  '-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',`UserKnownHostsFile=${join(homedir(),'.ssh','known_hosts_kws')}`,
  '-o','HostKeyAlgorithms=ssh-ed25519','-o','KexAlgorithms=curve25519-sha256','kws-admin@187.7.70.230'];
const inspection=process.argv.includes('--inspect');
if(process.argv.slice(2).some(v=>v!=='--inspect'))throw new Error('Usage: node freeze-source-video.mjs [--inspect]');
async function ssh(args,command,input='') {
  return new Promise((resolve,reject)=>{
    const child=spawn('ssh.exe',[...args,command],{stdio:['pipe','pipe','pipe']});
    let out='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',()=>{});
    child.on('error',()=>reject(new Error('SSH connection failed')));
    child.on('close',code=>code===0?resolve(out):reject(new Error('Protected remote operation failed')));
    child.stdin.end(input);
  });
}
if(!inspection)await ssh(targetArgs,"sudo -n python3 -c 'import json;from pathlib import Path;p=Path(\"/var/backups/kws/migration\");g=json.loads((p/\"SOURCE-MAINTENANCE-GATE.json\").read_text());assert g[\"active\"] and g[\"api_rejection_verified\"];assert not (p/\"SOURCE-VIDEO-FROZEN.json\").exists()'");
const sourceCode='inspection='+String(inspection?'True':'False')+'\n'+String.raw`
import datetime,hashlib,json,re,subprocess,sys
from pathlib import Path
container='kws-video-server-video-server-1';root=Path('/opt/kws-video-server/data')
state=json.loads(subprocess.check_output(['docker','inspect',container]))[0]
assert state['State']['Running'] is True
assert any(v['Source']==str(root) and v['Destination']=='/data' for v in state['Mounts'])
def idle(stopped=False):
 if not stopped:
  health=json.loads(subprocess.check_output(['docker','exec',container,'node','-e',"fetch('http://127.0.0.1:3000/health').then(r=>r.json()).then(v=>console.log(JSON.stringify(v)))"]))
  assert health['ok'] and health['queue']==0 and health['uploads']['multipart_active']==0
 jobs=[json.loads(p.read_text()) for p in (root/'jobs').glob('*.json')]
 assert jobs and not any(j.get('status') in ('reserved','queued','processing') for j in jobs)
 uuid=re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',re.I)
 for j in jobs:
  if uuid.fullmatch(str(j.get('boulder_id',''))) and j.get('session_id') and j.get('status') in ('queued','processing','completed','failed'):
   assert j.get('published_status')==(j.get('published_target_status') or j['status']), 'Unpublished job must settle before freeze'
 return len(jobs)
jobs=idle();assert idle()==jobs
if inspection:
 print(json.dumps({'source_video_running':True,'queue_and_publisher_idle':True,'job_count':jobs,'source_changed':False}));sys.exit(0)
subprocess.run(['docker','stop','--time','30',container],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
assert not json.loads(subprocess.check_output(['docker','inspect',container]))[0]['State']['Running']
assert idle(stopped=True)==jobs, 'Job set changed at stop; inspect before recording freeze'
files=[]
for path in sorted(root.rglob('*')):
 assert not path.is_symlink()
 if path.is_file():
  with path.open('rb') as stream:digest=hashlib.file_digest(stream,'sha256').hexdigest()
  files.append({'path':str(path.relative_to(root)),'bytes':path.stat().st_size,'sha256':digest})
print(json.dumps({'source_container':container,'stopped':True,'drained':True,'job_count':jobs,
 'frozen_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files}))
`;
const raw=await ssh(['-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','vps'], 'python3 -',sourceCode);
const report=JSON.parse(raw);
if(inspection){
 await ssh(targetArgs,'sudo -n python3 -c '+`'import json,sys;from pathlib import Path;p=Path("/var/backups/kws/migration/VIDEO-PREFLIGHT.json");r=json.load(sys.stdin);p.write_text(json.dumps(r)+"\\n");p.chmod(0o600)'`,JSON.stringify(report));
 console.log(JSON.stringify(report));process.exit(0);
}
if(!report.stopped||!report.drained||!report.files.length)throw new Error('Source stop proof missing');
await ssh(targetArgs,'sudo -n python3 -c '+`'import json,sys;from pathlib import Path;p=Path("/var/backups/kws/migration/SOURCE-VIDEO-FROZEN.json");assert not p.exists();r=json.load(sys.stdin);p.write_text(json.dumps(r)+"\\n");p.chmod(0o600)'`,JSON.stringify(report));
console.log(JSON.stringify({source_video_stopped:true,queue_and_publisher_drained:true,files:report.files.length,
  bytes:report.files.reduce((sum,f)=>sum+f.bytes,0),source_database_remains_write_gated:true}));
