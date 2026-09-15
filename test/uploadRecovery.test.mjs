import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/uploadRecovery.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { classifyRecoveredUpload: classify, readUploadRecovery, mergeRecoveredUploads, uploadLogTransitionFilter } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const now = Date.parse('2026-09-15T10:00:00Z');
const log = { id:'1', session_id:'job-a', user_id:'owner', boulder_id:'boulder-a', file_type:'video',file_name:'IMG.mov',file_size:42,status:'uploading',progress:40,error:null,created_at:'2026-08-24T12:00:00Z',updated_at:'2026-08-24T12:00:00Z' };
const boulder = { id:log.boulder_id, beta_video_upload_session_id:log.session_id, beta_video_status:'ready', beta_video_url:'https://video.example.invalid/hd.mp4' };
test('exact ready session is not restored even when log still says uploading',()=>assert.equal(classify({...log,progress:100},boulder,now).kind,'omit'));
for (const status of ['queued','processing']) test(`${status} is server processing, not a missing file`,()=>assert.equal(classify(log,{...boulder,beta_video_status:status},now).kind,'server_processing'));
for (const [name,changes] of [['different session',{beta_video_upload_session_id:'job-b'}],['legacy URL',{beta_video_upload_session_id:null}],['empty ready URL',{beta_video_url:null}],['failed processing',{beta_video_status:'failed'}]]) test(`${name} must not be inferred complete`,()=>assert.notEqual(classify({...log,progress:100},{...boulder,...changes},now).kind,'omit'));
test('100 percent without media still needs review',()=>assert.equal(classify({...log,progress:100},{id:log.boulder_id},now).kind,'recovery_review'));
test('missing boulder cannot resume or claim success',()=>assert.equal(classify(log,undefined,now).kind,'recovery_review'));
test('thumbnail URL alone cannot prove same upload',()=>assert.equal(classify({...log,file_type:'thumbnail'},{id:log.boulder_id,thumbnail_url:'/other.jpg'},now).kind,'recovery_review'));
test('old partial upload without media needs original file',()=>assert.equal(classify(log,{id:log.boulder_id},now).kind,'restoring'));
test('recent upload might still run on another device',()=>assert.equal(classify({...log,updated_at:new Date(now-1000).toISOString()},{id:log.boulder_id},now).kind,'recovery_review'));
test('unknown timestamps cannot authorize resumption',()=>assert.equal(classify({...log,updated_at:'invalid'},{id:log.boulder_id},now).kind,'recovery_review'));
for(const error of ['Upload entfernt',' Upload abgebrochen ']) test(`${error.trim()} remains excluded`,()=>assert.equal(classify({...log,error},undefined,now).kind,'omit'));
test('progress filter cannot reopen any terminal status',()=>{for(const status of ['uploading','compressing']) assert.equal(uploadLogTransitionFilter(status),'&status=in.(pending,compressing,uploading)');assert.equal(uploadLogTransitionFilter('completed'),'');});
test('preserves live files and excludes old recovered and already terminal jobs',()=>{
  const live={sessionId:'live',file:{},recoveredAt:'old'}, native={sessionId:'native',nativeFile:{}}, stale={sessionId:'stale',recoveredAt:'old'};
  assert.deepEqual(mergeRecoveredUploads([live,native,stale],[{sessionId:'live',recoveredAt:'old'},{sessionId:'done',recoveredAt:'old'},{sessionId:'new',recoveredAt:'old'}],new Set(['done'])),[live,native,{sessionId:'new',recoveredAt:'old'}]);
});
test('read-only reader scopes owner and reconciles against exact boulders',async()=>{
  const calls=[];const result=await readUploadRecovery('owner',async(table,query)=>{calls.push({table,query});return table==='upload_logs'?[log]:[boulder];});
  assert.equal(calls[0].query.get('user_id'),'eq.owner');assert.equal(calls[1].query.get('id'),'in.(boulder-a)');assert.equal(result[0].decision.kind,'omit');
});
test('foreign owner is rejected even if a server returns it',async()=>assert.rejects(readUploadRecovery('owner',async()=>[{...log,user_id:'someone-else'}]),/Zuordnung/));
test('failed boulder read does not become an empty or resumable list',async()=>assert.rejects(readUploadRecovery('owner',async table=>{if(table==='boulders')throw Error('503');return [log];}),/503/));
test('successful empty log read makes no unnecessary boulder call',async()=>{let calls=0;assert.deepEqual(await readUploadRecovery('owner',async()=>{calls++;return [];}),[]);assert.equal(calls,1);});
test('pagination loads beyond the default first page with stable cursor',async()=>{
  const first=Array.from({length:200},(_,i)=>({...log,id:String(i+1).padStart(4,'0'),boulder_id:null}));let reads=0;
  const rows=await readUploadRecovery('owner',async(table,q)=>{assert.equal(table,'upload_logs');reads++;if(reads===1)return first;assert.equal(q.get('id'),'gt.0200');return [{...log,id:'0201',boulder_id:null}];});assert.equal(rows.length,201);
});
