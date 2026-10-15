import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL='https://supabase.fixture.invalid';
process.env.SUPABASE_ANON_KEY='public-fixture';
process.env.REQUIRED_ROLES='admin,setter';
const {requireSupabaseUser}=await import('../src/auth.js');

test('a banned user is rejected even with a cached, valid upload token',async()=>{
  const original=globalThis.fetch; let allowed=true; const calls=[];
  globalThis.fetch=async(url,init)=>{
    calls.push(url); assert.equal(init.headers.Authorization,'Bearer upload-fixture');
    if(url.endsWith('/auth/v1/user')) return {ok:true,json:async()=>({id:'12345678-1234-4234-8234-123456789012'})};
    if(url.includes('/user_roles?')) return {ok:true,json:async()=>[{role:'setter'}]};
    assert.ok(url.endsWith('/rpc/kws_community_allowed'));
    return {ok:true,json:async()=>allowed};
  };
  let next=0; const req={headers:{authorization:'Bearer upload-fixture'}};
  const res={code:0,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  try {
    await requireSupabaseUser(req,res,()=>next++); assert.equal(next,1); assert.equal(req.userId,'12345678-1234-4234-8234-123456789012');
    allowed=false; await requireSupabaseUser(req,res,()=>next++);
    assert.equal(next,1); assert.equal(res.code,403); assert.equal(calls.filter(url=>url.endsWith('/auth/v1/user')).length,1);
    assert.equal(calls.filter(url=>url.endsWith('/rpc/kws_community_allowed')).length,2);
  } finally {globalThis.fetch=original;}
});

test('an unavailable moderation check cannot authorize an upload',async()=>{
  const original=globalThis.fetch; let next=0;
  globalThis.fetch=async(url)=>url.endsWith('/auth/v1/user') ? {ok:true,json:async()=>({id:'12345678-1234-4234-8234-123456789012'})} : {ok:false,status:503};
  const res={status(code){this.code=code;return this;},json(){return this;}};
  try {await requireSupabaseUser({headers:{authorization:'Bearer another-fixture'}},res,()=>next++);assert.equal(next,0);assert.equal(res.code,403);}
  finally {globalThis.fetch=original;}
});
