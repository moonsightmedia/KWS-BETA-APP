import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const { outputText } = ts.transpileModule(await readFile(new URL('../src/lib/sessionRecovery.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { createSessionRecovery, SessionRequiredError } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const jwt = (id, version) => `fixture.${Buffer.from(JSON.stringify({ sub: id, version })).toString('base64url')}.not-a-signature`;
const session = (version = 1, id = 'owner-a') => ({ access_token: jwt(id, version), user: { id }, expires_at: Date.now()/1000+3600 });
const expired = () => new Response(JSON.stringify({ code: 'PGRST303', message: 'JWT expired' }), { status: 401 });
function setup(fetcher = async () => new Response('[]'), config = {}) {
  const state = { current: session(), reads: 0, refreshes: 0, required: 0, error: null, refreshError: null, calls: [] };
  const recovery = createSessionRecovery({
    url: 'https://fixture.invalid', publicKey: 'public-fixture', timeoutMs: 100,
    auth: {
      getSession: async () => { state.reads++; return { data: { session: state.current }, error: state.error }; },
      refreshSession: async () => { state.refreshes++; await new Promise(r => setTimeout(r, 5)); if (!state.refreshError) state.current = session(2); return { data: { session: state.current }, error: state.refreshError }; },
    },
    fetch: async (input, init) => { state.calls.push({ input, init }); return fetcher(input, init, state); },
    onRequired: () => { state.required++; }, ...config,
  });
  const request = (init = {}) => recovery.authenticatedFetch('https://fixture.invalid/rest/v1/boulders', { headers: { Authorization: `Bearer ${session().access_token}` }, ...init });
  return { state, recovery, request };
}

test('stale caller uses latest token before sending', async () => {
  const { state, request } = setup(); state.current = session(2);
  await request(); assert.equal(state.calls[0].init.headers.get('Authorization'), `Bearer ${session(2).access_token}`); assert.equal(state.refreshes, 0);
});
test('parallel expired reads share one refresh, each retries exactly once', async () => {
  const { state, request } = setup(async (_url, init) => init.headers.get('Authorization').includes(session().access_token) ? expired() : new Response('[]'));
  await Promise.all(Array.from({ length: 8 }, () => request()));
  assert.equal(state.refreshes, 1); assert.equal(state.calls.length, 16); assert.equal(state.required, 0);
});
test('already expired session refreshes before request', async () => {
  const { state, request } = setup(); state.current.expires_at = Date.now()/1000-1;
  await request(); assert.equal(state.refreshes, 1); assert.equal(state.calls.length, 1);
});
test('no retry loop if freshly issued token is rejected', async () => {
  const { state, request } = setup(expired);
  await assert.rejects(request(), SessionRequiredError); assert.equal(state.calls.length, 2); assert.equal(state.refreshes, 1);
});
for (const method of ['POST','PATCH','DELETE']) test(`${method} never replayed on expired JWT`, async () => {
  const { state, request } = setup(expired);
  await assert.rejects(request({ method, body: '{"fixture":true}', headers: { Authorization: `Bearer ${session().access_token}` } }), /starte die Aktion erneut/);
  assert.equal(state.calls.length, 1); assert.equal(state.refreshes, 1);
});
for (const status of [401,403,429,500]) test(`${status} non-expiry response does not trigger auth recovery`, async () => {
  const { state, request } = setup(async () => new Response('{"message":"forbidden"}', { status }));
  assert.equal((await request()).status, status); assert.equal(state.refreshes, 0); assert.equal(state.calls.length, 1); assert.equal(state.required, 0);
});
test('invalid refresh asks for sign-in once, no read replay', async () => {
  const { state, request } = setup(expired); state.refreshError = { code: 'refresh_token_not_found' };
  await assert.rejects(request(), SessionRequiredError); assert.equal(state.calls.length, 1); assert.equal(state.required, 1);
});
test('missing session never falls back to anonymous for protected request', async () => {
  const { state, request } = setup(); state.current = null;
  await assert.rejects(request(), SessionRequiredError); assert.equal(state.calls.length, 0);
});
test('offline refresh keeps session and does not ask to sign out', async () => {
  const { state, request } = setup(expired); state.refreshError = { name: 'AuthRetryableFetchError', message: 'network' };
  await assert.rejects(request(), /Verbindung/); assert.ok(state.current); assert.equal(state.required, 0);
  state.refreshError = null; await assert.rejects(request(), SessionRequiredError); // backend still rejects, bounded
});
test('public and external requests pass through without reading session', async () => {
  const { state, recovery } = setup();
  await recovery.authenticatedFetch('https://fixture.invalid/rest/v1/colors', { headers: { Authorization: 'Bearer public-fixture' } });
  await recovery.authenticatedFetch('https://other.invalid/rest/v1/boulders', { headers: { Authorization: 'Bearer external-fixture' } });
  await recovery.authenticatedFetch('https://fixture.invalid/auth/v1/token');
  assert.equal(state.reads, 0); assert.equal(state.calls.length, 3);
  assert.equal(state.calls[1].init.headers.Authorization, 'Bearer external-fixture');
});
test('account switch blocks stale requests before transport', async () => {
  const { state, request } = setup(); state.current = session(1, 'owner-b');
  await assert.rejects(request(), /Konto wurde gewechselt/); assert.equal(state.calls.length, 0);
});
test('account switch during rejected read cannot replay', async () => {
  const { state, request } = setup(async (_u, _i, s) => { s.current = session(1,'owner-b'); return expired(); });
  await assert.rejects(request(), /Konto wurde gewechselt/); assert.equal(state.calls.length, 1); assert.equal(state.refreshes, 0);
});
test('aborted request sends nothing', async () => {
  const { state, request } = setup(); const controller = new AbortController(); controller.abort();
  await assert.rejects(request({ signal: controller.signal }), { name: 'AbortError' }); assert.equal(state.calls.length, 0);
});
test('session timeout is bounded and does not sign out', async () => {
  const { state, request } = setup(undefined, { timeoutMs: 10, auth: { getSession: () => new Promise(() => {}), refreshSession: () => { throw new Error('unexpected'); } } });
  await assert.rejects(request(), /Verbindung/); assert.equal(state.calls.length, 0); assert.equal(state.required, 0);
});

test('aborting during a shared refresh cancels only that reader', async () => {
  let beginRefresh; const begun = new Promise(resolve => { beginRefresh = resolve; });
  let finishRefresh; const refreshed = new Promise(resolve => { finishRefresh = resolve; });
  const controller = new AbortController();
  const { state, request } = setup(async (_url, init) => init.headers.get('Authorization').includes(session().access_token) ? expired() : new Response('[]'), {
    auth: { getSession: async () => ({ data: {session: session()}, error:null }), refreshSession: () => { beginRefresh(); return refreshed; } },
  });
  const canceled = request({ signal:controller.signal });
  const assertCanceled = assert.rejects(canceled,{name:'AbortError'});
  await begun;
  const other = request();
  controller.abort();
  await assertCanceled;
  finishRefresh({ data:{session:session(2)},error:null });
  await other;
  assert.equal(state.calls.length,3);
  assert.equal(state.required,0);
});

test('RPC GET is not replayed because it may have side effects', async () => {
  const {state,recovery} = setup(expired);
  await assert.rejects(recovery.authenticatedFetch('https://fixture.invalid/rest/v1/rpc/example', {headers:{Authorization:`Bearer ${session().access_token}`}}), /starte die Aktion erneut/);
  assert.equal(state.calls.length,1);
});

test('proactive refresh cannot return a concurrent other account session', async () => {
  let current = {...session(),expires_at:1};
  let beginRefresh; const begun = new Promise(resolve=>{beginRefresh=resolve;});
  let finishRefresh; const refreshed = new Promise(resolve=>{finishRefresh=resolve;});
  const {recovery} = setup(undefined,{auth:{
    getSession: async()=>({data:{session:current},error:null}),
    refreshSession:()=>{beginRefresh();return refreshed;},
  }});
  const first=recovery.getSession(); await begun;
  current={...session(1,'owner-b'),expires_at:1};
  const second=assert.rejects(recovery.getSession(),/Konto wurde gewechselt/);
  await new Promise(resolve=>setTimeout(resolve,0));
  finishRefresh({data:{session:session(2)},error:null});
  assert.equal((await first).user.id,'owner-a'); await second;
});
