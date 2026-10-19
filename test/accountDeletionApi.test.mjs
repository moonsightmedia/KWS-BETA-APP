import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const raw = (await readFile(new URL('../src/lib/accountDeletion.ts', import.meta.url), 'utf8'))
  .replace("import { backendConfig } from '@/lib/backendConfig';", "const backendConfig = {supabaseUrl:'https://fixture.invalid', publicKey:'public-fixture'};");
const compiled = ts.transpileModule(raw.replace("import { authenticatedFetch, getCurrentSession } from '@/lib/authenticatedFetch';", 'const {authenticatedFetch,getCurrentSession}=fixture;').replaceAll('import.meta.env.VITE_SUPABASE_URL', "'https://fixture.invalid'").replaceAll('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY', "'public-fixture'"), { compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS} }).outputText;
function setup() {
  const state = {session:{access_token:'signed-session-fixture'},calls:[],status:200,body:[]};
  const exports = {};
  new Function('exports','fixture',compiled)(exports, {
    getCurrentSession:async()=>state.session,
    authenticatedFetch:async(url,init)=>{state.calls.push({url,init}); return new Response(JSON.stringify(state.body),{status:state.status});},
  });
  return {state,...exports};
}
test('authenticated status and admin reads carry gateway key and current session',async()=>{
  const api=setup();
  assert.equal(await api.getAccountDeletionRequest('own-id'),null);
  await api.getPendingAccountDeletions();
  for(const {url,init} of api.state.calls) {
    assert.ok(url.startsWith('https://fixture.invalid/rest/v1/account_deletion_requests?'));
    assert.equal(init.headers.get('apikey'),'public-fixture');
    assert.equal(init.headers.get('Authorization'),'Bearer signed-session-fixture');
  }
});
test('self-request posts no client-supplied account and requires server confirmation',async()=>{
  const api=setup();
  api.state.body={id:'request-id',due_at:'2026-10-19T08:00:00Z',status:'pending'};
  await api.requestAccountDeletion();
  const call=api.state.calls[0];
  assert.equal(call.init.method,'POST'); assert.equal(call.init.body,'{}');
  assert.equal(call.init.headers.get('Content-Type'),'application/json');
  assert.equal(call.init.headers.get('Authorization'),'Bearer signed-session-fixture');
  api.state.body={}; await assert.rejects(api.requestAccountDeletion(),/nicht bestätigt/);
});
test('missing session and failed API cannot be reported as a saved request',async()=>{
  const api=setup(); api.state.session=null;
  await assert.rejects(api.requestAccountDeletion(),/erneut an/); assert.equal(api.state.calls.length,0);
  api.state.session={access_token:'signed-session-fixture'}; api.state.status=403;
  await assert.rejects(api.requestAccountDeletion(),/nicht bestätigt/);
});
