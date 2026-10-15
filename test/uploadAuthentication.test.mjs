import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const compile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const recoveryUri = asModule(compile(await readFile(new URL('../src/lib/sessionRecovery.ts', import.meta.url), 'utf8')));
const { createSessionRecovery, SessionRequiredError, SessionAccountChangedError } = await import(recoveryUri);
const nativeUri = asModule(`
let chunks = [];
export const setChunks = values => { chunks = values; };
export const Capacitor = { getPlatform: () => 'ios' };
export const Filesystem = { readFileInChunks: async (_options, callback) => {
  for (const data of chunks) callback({data});
  callback({data:''});
} };
`);
const { setChunks } = await import(nativeUri);
const resumableSource = await readFile(new URL('../src/utils/resumableUpload.ts', import.meta.url), 'utf8');
const resumableUri = asModule(compile(resumableSource
  .replace("'@capacitor/filesystem'", JSON.stringify(nativeUri))
  .replace("'@capacitor/core'", JSON.stringify(nativeUri))
  .replace("'@/lib/sessionRecovery'", JSON.stringify(recoveryUri))));
const { resumableUpload, CHUNK_SIZE, getNativeUploadChunkSize } = await import(resumableUri);

// Only protocol fixtures. No production sessions, accounts, media or requests.
const rest = 'https://api.fixture.invalid';
const media = 'https://video.fixture.invalid';
const assets = 'https://assets.fixture.invalid/upload-api';
const jwt = (id, version) => `fixture.${Buffer.from(JSON.stringify({ sub: id, version })).toString('base64url')}.not-a-signature`;
const session = (version = 1, id = 'owner-a') => ({ access_token: jwt(id, version), user: { id }, expires_at: Date.now() / 1000 + 3600 });
const expired = () => new Response(JSON.stringify({ code: 'PGRST303', message: 'JWT expired' }), { status: 401 });
const mediaExpired = () => new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401 });
const json = value => new Response(JSON.stringify(value));
function setup(handler = async () => json({}), config = {}) {
  const state = { current: session(), version: 1, calls: [], refreshes: 0, reads: 0, required: 0, refreshError: null };
  const recovery = createSessionRecovery({
    url: rest, publicKey: 'public-fixture', uploadUrls: [media, assets], timeoutMs: 100,
    auth: {
      getSession: async () => { state.reads++; return { data: {session: state.current}, error: null }; },
      refreshSession: async () => {
        state.refreshes++;
        await new Promise(resolve => setTimeout(resolve, 5));
        if (!state.refreshError) state.current = session(++state.version);
        return { data: {session: state.current}, error: state.refreshError };
      },
    },
    fetch: async (input, init) => {
      state.calls.push({ url: String(input), init: {...init, headers: new Headers(init?.headers)} });
      return handler(input, init, state);
    },
    onRequired: () => { state.required++; }, ...config,
  });
  return { state, recovery, send: recovery.createUploadFetch('owner-a') };
}

test('every media request resolves latest SDK token and strips stale alternate credentials', async () => {
  const {state, send} = setup();
  await send(`${media}/upload-status.php?session_id=stable`);
  state.current = session(2);
  await send(`${media}/upload.php`, {method:'POST', body:new FormData(), headers:{Authorization:'Bearer stale', 'X-Upload-Auth':'Bearer stale'}});
  assert.equal(state.calls[0].init.headers.get('X-Upload-Auth'), `Bearer ${session().access_token}`);
  assert.equal(state.calls[1].init.headers.get('X-Upload-Auth'), `Bearer ${session(2).access_token}`);
  assert.equal(state.calls[1].init.headers.get('Authorization'), null);
  assert.equal(state.calls[1].init.redirect, 'error');
  assert.equal(state.refreshes, 0);
});

test('parallel video chunks, thumbnail save and REST read share one session renewal', async () => {
  const {state, send, recovery} = setup(async (input, init) => {
    const used = init.headers.get('Authorization') ?? init.headers.get('X-Upload-Auth');
    return used === `Bearer ${session().access_token}` ? (String(input).startsWith(media) ? mediaExpired() : expired()) : json({});
  });
  await Promise.all([
    ...Array.from({length:5}, () => send(`${media}/upload.php`, {method:'POST', body:new FormData()})),
    send(`${rest}/rest/v1/boulders?id=eq.fixture`, {method:'PATCH', body:'{"thumbnail_url":"fixture"}'}),
    send(`${rest}/rest/v1/upload_logs`, {method:'POST', body:'{"session_id":"stable"}'}),
    recovery.authenticatedFetch(`${rest}/rest/v1/boulders`, {headers:{Authorization:`Bearer ${session().access_token}`}}),
  ]);
  assert.equal(state.refreshes, 1);
  assert.equal(state.calls.length, 16);
  assert.equal(state.required, 0);
});

for (const path of ['upload_logs', 'boulders?id=eq.fixture', 'rpc/begin_boulder_video_upload', 'rpc/fail_boulder_video_upload']) {
  test(`${path}: definite JWT rejection retries same body once, not a new action`, async () => {
    const {state, send} = setup(async (_u,_i,s) => s.calls.length === 1 ? expired() : json(true));
    const body = '{"p_boulder_id":"fixture","p_upload_session_id":"stable"}';
    await send(`${rest}/rest/v1/${path}`, {method:path.startsWith('boulders') ? 'PATCH' : 'POST', body});
    assert.equal(state.calls.length, 2);
    assert.equal(state.refreshes, 1);
    assert.equal(state.calls[0].url, state.calls[1].url);
    assert.equal(state.calls[0].init.body, body);
    assert.equal(state.calls[1].init.body, body);
  });
}

for (const status of [401,403,429,500]) test(`generic ${status} does not renew or replay upload writes`, async () => {
  const {state, send} = setup(async () => new Response('{"error":"Permission denied"}', {status}));
  assert.equal((await send(`${media}/upload.php`, {method:'POST', body:new FormData()})).status, status);
  assert.equal(state.calls.length, 1);
  assert.equal(state.refreshes, 0);
});

test('ambiguous network failure is not automatically replayed by auth transport', async () => {
  const {state, send} = setup(async () => { throw new TypeError('network fixture'); });
  await assert.rejects(send(`${rest}/rest/v1/upload_logs`, {method:'POST', body:'{}'}), /network fixture/);
  assert.equal(state.calls.length,1); assert.equal(state.refreshes,0);
});

test('fresh token rejected again requires sign-in, no infinite retry', async () => {
  const {state, send} = setup(mediaExpired);
  await assert.rejects(send(`${media}/upload.php`, {method:'POST', body:new FormData()}), SessionRequiredError);
  assert.equal(state.calls.length,2); assert.equal(state.refreshes,1); assert.equal(state.required,1);
});

test('revoked session requests reconnect without sending a second chunk', async () => {
  const {state, send} = setup(mediaExpired);
  state.refreshError = {code:'refresh_token_not_found'};
  await assert.rejects(send(`${media}/upload.php`, {method:'POST', body:new FormData()}), SessionRequiredError);
  assert.equal(state.calls.length,1); assert.equal(state.required,1);
});

test('offline refresh does not erase session or ask user to sign out', async () => {
  const {state, send} = setup(mediaExpired);
  state.refreshError = {message:'network fixture'};
  await assert.rejects(send(`${media}/upload.php`, {method:'POST', body:new FormData()}), /Verbindung/);
  assert.ok(state.current); assert.equal(state.required,0); assert.equal(state.calls.length,1);
});

test('account change cannot transfer an existing job under the new owner', async () => {
  const {state, send} = setup(); state.current = session(1,'owner-b');
  await assert.rejects(send(`${media}/upload.php`, {method:'POST', body:new FormData()}), SessionAccountChangedError);
  assert.equal(state.calls.length,0);
});

test('account change after rejection cannot replay with another user', async () => {
  const {state, send} = setup(async (_u,_i,s) => { s.current = session(1,'owner-b'); return mediaExpired(); });
  await assert.rejects(send(`${media}/upload.php`, {method:'POST', body:new FormData()}), SessionAccountChangedError);
  assert.equal(state.calls.length,1); assert.equal(state.refreshes,0);
});

test('media, REST credentials never go to unconfigured or unrelated endpoints', async () => {
  const {state, send} = setup();
  for (const url of [`https://other.invalid/upload.php`, `${media}/upload.php.evil`, `${media}/videos/file.mp4`, `${rest}/rest/v1/user_roles`, `${rest}/rest/v1/rpc/delete_account`, `${rest}/rest/v1/boulders`]) {
    await assert.rejects(send(url,{method:'POST',body:'{}'}), /nicht freigegeben/);
  }
  await assert.rejects(send(`${rest}/rest/v1/boulders`,{method:'PATCH',body:'{}'}), /nicht freigegeben/);
  assert.equal(state.calls.length,0); assert.equal(state.reads,0);
});

test('consumable Request body is rejected before session/transport', async () => {
  const {state, send} = setup();
  await assert.rejects(send(new Request(`${media}/upload.php`, {method:'POST', body:'fixture'})), /wiederverwendbaren Body/);
  assert.equal(state.calls.length,0);
});

test('abort during shared renewal cancels only that upload, other upload completes', async () => {
  let begin, finish;
  const begun = new Promise(resolve => {begin=resolve;});
  const renewed = new Promise(resolve => {finish=resolve;});
  const {state, send} = setup(async (_u,init) => init.headers.get('X-Upload-Auth') === `Bearer ${session().access_token}` ? mediaExpired() : json({}), {
    auth:{getSession:async () => ({data:{session:session()},error:null}), refreshSession:() => {begin();return renewed;}},
  });
  const controller = new AbortController();
  const canceled = assert.rejects(send(`${media}/upload.php`,{method:'POST',body:new FormData(),signal:controller.signal}),{name:'AbortError'});
  await begun;
  const other = send(`${media}/upload.php`,{method:'POST',body:new FormData()});
  controller.abort(); await canceled;
  finish({data:{session:session(2)},error:null}); await other;
  assert.equal(state.calls.length,3); assert.equal(state.required,0);
});

const browserEvents = new EventTarget();
globalThis.window = browserEvents;
Object.defineProperty(globalThis.navigator, 'onLine', {value:true, configurable:true});

for (const native of [false,true]) test(`${native ? 'iOS filesystem' : 'web file'} upload survives expiry between parts and at thumbnail save`, async () => {
  const parts = new Map();
  let queuedJobs = 0;
  let rejectedLastPart = false;
  let saved = 0;
  const {state, send} = setup(async (input, init, s) => {
    const url = new URL(input);
    if (url.pathname === '/upload-status.php') return json({session_id:'stable',uploaded_chunks:[]});
    if (url.pathname === '/upload.php') {
      const index = Number(init.headers.get('X-Chunk-Number'));
      assert.equal(init.headers.get('X-Upload-Session-Id'),'stable');
      assert.equal(init.headers.get('X-Boulder-Id'),'boulder-fixture');
      if (index === 1 && !rejectedLastPart) { rejectedLastPart=true; return mediaExpired(); }
      const bytes = new Uint8Array(await init.body.get('chunk').arrayBuffer());
      assert.equal(parts.has(index),false,'no accepted chunk retransmitted');
      parts.set(index,bytes);
      s.current.expires_at=1; // Background delay / long preparation fixture.
      if (index === 0) return json({});
      queuedJobs++;
      return json({status:'queued',job_id:'one-job'});
    }
    assert.equal(url.pathname,'/rest/v1/boulders');
    saved++;
    return new Response(null,{status:204});
  });
  const chunkSize = native ? getNativeUploadChunkSize() : CHUNK_SIZE;
  const bytes = new Uint8Array(chunkSize+32).fill(7);
  if (native) setChunks([Buffer.from(bytes.subarray(0,chunkSize)).toString('base64'),Buffer.from(bytes.subarray(chunkSize)).toString('base64')]);
  const source = native ? {kind:'native-path',path:'file:///fixture.mp4',fileName:'fixture.mp4',fileSize:bytes.length,mimeType:'video/mp4'} : new File([bytes],'fixture.mp4',{type:'video/mp4'});
  const result = await resumableUpload(source,media,{sessionId:'stable',boulderId:'boulder-fixture',fetch:send});
  assert.equal(result.jobId,'one-job');
  assert.equal(queuedJobs,1); assert.deepEqual([...parts.keys()],[0,1]);
  assert.equal(parts.get(0).length+parts.get(1).length,bytes.length);
  await send(`${rest}/rest/v1/boulders?id=eq.boulder-fixture`,{method:'PATCH',body:'{"thumbnail_url":"fixture"}'});
  assert.equal(saved,1); assert.equal(state.refreshes,3); assert.equal(state.required,0);
});

test('status authentication failure never falls through into a new upload', async () => {
  const {state, send} = setup(mediaExpired);
  const file = new File(['fixture'],'fixture.mp4',{type:'video/mp4'});
  await assert.rejects(resumableUpload(file,media,{sessionId:'stable',fetch:send}),SessionRequiredError);
  assert.equal(state.calls.length,2); assert.equal(file.size,7);
  assert.ok(state.calls.every(call => call.url.includes('/upload-status.php')));
});

test('chunk reauthentication failure is not retried five times or swallowed', async () => {
  const {state, send} = setup(async input => String(input).includes('upload-status') ? json({uploaded_chunks:[]}) : mediaExpired());
  state.refreshError={code:'refresh_token_not_found'};
  const file = new File(['fixture'],'fixture.mp4',{type:'video/mp4'});
  await assert.rejects(resumableUpload(file,media,{sessionId:'stable',fetch:send}),SessionRequiredError);
  assert.equal(state.calls.length,2); assert.equal(state.refreshes,1); assert.equal(file.size,7);
});

test('forbidden status does not start a fresh job or refresh a valid session', async () => {
  const {state, send} = setup(async () => new Response('{}',{status:403}));
  await assert.rejects(resumableUpload(new File(['fixture'],'fixture.mp4'),media,{sessionId:'stable',fetch:send}),/nicht erlaubt/);
  assert.equal(state.calls.length,1); assert.equal(state.refreshes,0);
});

test('production upload caller wires fresh-token transport into both media uploads and final save', async () => {
  const source = await readFile(new URL('../src/contexts/UploadContext.tsx',import.meta.url),'utf8');
  assert.equal((source.match(/fetch: uploadFetch/g) ?? []).length,2);
  assert.match(source,/const updateResponse = await uploadFetch/);
  assert.match(source,/const beginResponse = await uploadFetch/);
  assert.doesNotMatch(source,/authToken: currentSession|window\.fetch|supabase\.auth\.getSession/);
  const logger = await readFile(new URL('../src/utils/uploadLogger.ts',import.meta.url),'utf8');
  assert.doesNotMatch(logger,/window\.fetch|private accessToken/);
});
