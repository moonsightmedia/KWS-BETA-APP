import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {publishThumbnailDecision} from '../src/lib/thumbnailPublish.mjs';

// Exercise the real production allowlist/recovery, not a stand-in transport.
const {outputText}=ts.transpileModule(await readFile(new URL('../src/lib/sessionRecovery.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
const {createSessionRecovery}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const backend='https://backend.example.invalid',media='https://media.example.invalid';
const owner='29a40560-e6a5-425b-9809-1862926a6d84',boulder='03a06939-cbe7-48e0-94f6-23620ba301e1';
const jwt=(id,version)=>`fixture.${Buffer.from(JSON.stringify({sub:id,version})).toString('base64url')}.not-a-real-signature`;
const session=(version=1,id=owner)=>({user:{id},access_token:jwt(id,version),expires_at:Date.now()/1000+3600});
const expired=()=>Response.json({message:'JWT expired'},{status:401});

function setup({expireRole=false,switchAt='',role='setter'}={}){
 const state={current:session(),calls:[],refreshes:0,uploads:0,patches:0,stored:null,online:media+'/original.jpg',expired:false};
 const recovery=createSessionRecovery({url:backend,publicKey:'public-fixture',uploadUrls:[media],
  auth:{getSession:async()=>({data:{session:state.current},error:null}),refreshSession:async()=>{state.refreshes++;state.current=session(2);return{data:{session:state.current},error:null};}},
  fetch:async(input,init)=>{
   const url=new URL(String(input)),headers=new Headers(init.headers);state.calls.push({url,init,headers});
   assert.equal(init.redirect,'error');
   if(url.pathname==='/rest/v1/user_roles'){
    assert.equal(init.method??'GET','GET');assert.equal(url.searchParams.get('user_id'),`eq.${owner}`);
    if(switchAt==='role')state.current=session(1,'another-owner');
    if(expireRole&&!state.expired){state.expired=true;return expired();}
    return Response.json(role?[{role}]:[]);
   }
   if(url.pathname==='/rest/v1/boulders'&&init.method!=='PATCH'){
    assert.equal(url.searchParams.get('id'),`eq.${boulder}`);
    if(switchAt==='read')state.current=session(1,'another-owner');
    return Response.json([{id:boulder,thumbnail_url:state.online,color:'Grün',color_2:null,status:'haengt',volume_only:false}]);
   }
   if(url.pathname==='/upload.php'){
    state.uploads++;assert.equal(headers.get('Authorization'),null);assert.equal(headers.get('X-Upload-Auth'),`Bearer ${state.current.access_token}`);
    if(switchAt==='upload')state.current=session(1,'another-owner');
    return Response.json({url:media+'/processed.png'});
   }
   if(url.pathname==='/rest/v1/boulders'&&init.method==='PATCH'){
    state.patches++;assert.equal(url.searchParams.get('thumbnail_url'),`eq.${media}/original.jpg`);assert.equal(url.searchParams.get('volume_only'),'eq.false');
    state.online=JSON.parse(init.body).thumbnail_url;return Response.json([{id:boulder,thumbnail_url:state.online}]);
   }
   throw Error('Unexpected request in isolated transport test');
  }});
 const raw='synthetic original photo bytes';
 const decision={key:'fixture-key',boulderId:boulder,sourceBackend:backend,sourceUrl:state.online,color:'Grün',color2:null,state:'accepted',focus:{inputFile:new Blob([raw]),result:{image_hash:createHash('sha256').update(raw).digest('hex')},mode:'focus',selected:['a']}};
 const deps={backend,publicKey:'public-fixture',uuid:()=> 'fixture-upload',read:async()=>state.stored?[structuredClone(state.stored)]:[],save:async value=>{state.stored=structuredClone(value);},getSession:recovery.getSession,transportFor:recovery.createUploadFetch,
  upload:async(_focus,_id,transport)=>{const response=await transport(media+'/upload.php',{method:'POST',body:new Blob(['synthetic processed image'])});return response.json();}};
 return{state,recovery,decision,deps};
}

test('actual upload transport permits exactly the role/row preflight and CAS publication sequence',async()=>{
 const f=setup();const done=await publishThumbnailDecision(f.decision,f.deps);
 assert.equal(done.state,'published');assert.equal(f.state.uploads,1);assert.equal(f.state.patches,1);
 assert.deepEqual(f.state.calls.map(call=>[call.init.method??'GET',call.url.pathname]),[['GET','/rest/v1/user_roles'],['GET','/rest/v1/boulders'],['POST','/upload.php'],['PATCH','/rest/v1/boulders']]);
 for(const call of f.state.calls.filter(call=>call.url.origin===backend))assert.equal(call.headers.get('Authorization'),`Bearer ${session().access_token}`);
});

test('actual preflight GET refreshes an expired token once and keeps the owner through upload and PATCH',async()=>{
 const f=setup({expireRole:true});await publishThumbnailDecision(f.decision,f.deps);
 assert.equal(f.state.refreshes,1);assert.equal(f.state.calls.filter(call=>call.url.pathname==='/rest/v1/user_roles').length,2);
 assert.equal(f.state.uploads,1);assert.equal(f.state.patches,1);
 assert.equal(f.state.calls.at(-1).headers.get('Authorization'),`Bearer ${session(2).access_token}`);
});

for(const switchAt of ['role','read','upload'])test(`actual owner binding prevents the next network action after an account switch at ${switchAt}`,async()=>{
 const f=setup({switchAt});await assert.rejects(publishThumbnailDecision(f.decision,f.deps),/Konto wurde gewechselt/);
 assert.equal(f.state.patches,0);assert.equal(f.state.uploads,switchAt==='upload'?1:0);
 assert.equal(f.state.calls.some(call=>call.headers.get('Authorization')?.includes(jwt('another-owner',1))),false);
});

test('an account switch after an expired role read cannot consume another account session or replay',async()=>{
 const f=setup({switchAt:'role',expireRole:true});await assert.rejects(publishThumbnailDecision(f.decision,f.deps),/Konto wurde gewechselt/);
 assert.equal(f.state.calls.length,1);assert.equal(f.state.refreshes,0);assert.equal(f.state.uploads,0);
});

test('RLS role results without setter/admin rights stop before any media or CAS write',async()=>{
 for(const role of [null,'customer']){const f=setup({role});await assert.rejects(publishThumbnailDecision(f.decision,f.deps),/Setter- oder Adminfreigabe/);assert.equal(f.state.calls.length,1);assert.equal(f.state.uploads,0);assert.equal(f.state.patches,0);}
});

test('new read allowance rejects broad, foreign-owner, duplicate-filter, RPC and off-origin requests before transport',async()=>{
 const f=setup(),transport=f.recovery.createUploadFetch(owner);
 const roles=`${backend}/rest/v1/user_roles?${new URLSearchParams({select:'role',user_id:`eq.${owner}`,role:'in.(setter,admin)',limit:'1'})}`;
 const row=`${backend}/rest/v1/boulders?${new URLSearchParams({id:`eq.${boulder}`,select:'id,thumbnail_url,color,color_2,status,volume_only'})}`;
 for(const [url,init] of [
  [`${backend}/rest/v1/boulders`,{}],[row+'&or=(id.not.is.null)',{}],[row+'&id=eq.other',{}],
  [row.replace('volume_only','*'),{}],[roles.replace(`eq.${owner}`,'eq.other'),{}],[roles+'&select=*',{}],
  [roles,{method:'POST',body:'{}'}],[row,{body:'unexpected'}],[row.replace(backend,'https://another.example.invalid'),{}],
  [`${backend}/rest/v1/rpc/has_role`,{method:'POST',body:'{}'}],[`${backend}/rest/v1/user_roles?select=role`,{}],
 ])await assert.rejects(transport(url,init),/Upload-Ziel ist nicht freigegeben/);
 assert.equal(f.state.calls.length,0);
});
