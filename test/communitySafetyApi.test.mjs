import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const raw=await readFile(new URL('../src/lib/communitySafety.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(raw.replace("import { getCurrentSession } from '@/lib/authenticatedFetch';",'const {getCurrentSession}=fixture;').replace("import { supabaseRestRequest } from '@/lib/supabaseRest';",'const {supabaseRestRequest}=fixture;'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function setup(){
 const state={session:{access_token:'session-fixture'},calls:[],body:{},failure:null}; const exports={};
 new Function('exports','fixture',compiled)(exports,{getCurrentSession:async()=>state.session,supabaseRestRequest:async(path,init)=>{state.calls.push({path,init});if(state.failure)throw state.failure;return state.body;}});
 return {state,...exports};
}
test('reports require signed session and confirmed receipt; arbitrary reporter cannot be supplied',async()=>{
 const api=setup();api.state.body={id:'server-report',received:true};
 await api.reportContent('comment','comment-fixture','harassment','  Test  ');
 assert.deepEqual(api.state.calls[0],{path:'/rest/v1/rpc/kws_report_content',init:{accessToken:'session-fixture',method:'POST',body:{content_kind:'comment',target:'comment-fixture',report_reason:'harassment',report_detail:'Test'}}});
 api.state.body={id:'server-report'};await assert.rejects(api.reportContent('comment','comment-fixture','other',''),/nicht bestätigt/);
 api.state.session=null;await assert.rejects(api.reportContent('comment','comment-fixture','other',''),/erneut an/);assert.equal(api.state.calls.length,2);
});
test('blocked/unblocked and moderation actions only succeed with exact server acknowledgment',async()=>{
 const api=setup();api.state.body={blocked:true};await api.blockUser('user-fixture',true);
 await assert.rejects(api.blockUser('user-fixture',false),/nicht bestätigt/);
 api.state.body={confirmed:false};await assert.rejects(api.moderateContent('comment','comment-fixture','approve'),/nicht bestätigt/);
 api.state.body={confirmed:true};await api.moderateContent('comment','comment-fixture','approve');
 api.state.failure=new Error('Permission denied');await assert.rejects(api.blockUser('user-fixture',true),/Permission denied/);
});
test('invalid reports do not reach the server; private admin context uses its guarded RPC',async()=>{
 const api=setup();await assert.rejects(api.reportContent('comment','fixture','bad-reason',''),/prüfe/);
 await assert.rejects(api.reportContent('comment','fixture','other','x'.repeat(1001)),/prüfe/);assert.equal(api.state.calls.length,0);
 api.state.body=[];assert.deepEqual(await api.getOpenReports(),[]);assert.equal(api.state.calls[0].path,'/rest/v1/rpc/kws_open_content_reports');
});
