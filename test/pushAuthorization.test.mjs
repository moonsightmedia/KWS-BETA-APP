import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/send-push-notification/handler.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { createPushHandler } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const own = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const pem = '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64') + '\n-----END PRIVATE KEY-----';
const config = { supabaseUrl: 'https://private.example.test', anonKey: 'test-public', serviceKey: 'test-service', serviceAccount: JSON.stringify({ type: 'service_account', project_id: 'kws-beta-app', client_email: 'test@example.test', private_key: pem, token_uri: 'https://oauth2.googleapis.com/token' }) };
function fixture({ owner = own, admin = false, registered = true, enabled = true, invalid = false, providerStatus = 200 } = {}) {
  const called = [];
  const mock = async (url, options) => {
    called.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return Response.json(invalid ? {} : { id: own }, { status: invalid ? 401 : 200 });
    if (url.includes('/rest/v1/')) {
      assert.equal(options.headers.Authorization, 'Bearer test-service');
      if (url.includes('/user_roles?')) return Response.json(admin ? [{ role: 'admin' }] : []);
      if (url.includes('/push_tokens?')) return Response.json(registered ? [{ token: 'registered-device', platform: 'android', user_id: owner }] : []);
      if (url.includes('/notification_preferences?')) return Response.json([{ user_id: owner, push_enabled: enabled }]);
    }
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'mock-provider-access', expires_in: 3600 });
    if (url === 'https://fcm.googleapis.com/v1/projects/kws-beta-app/messages:send') return Response.json(providerStatus === 200 ? { name: 'mock-accepted' } : { error: { details: [{ errorCode: 'UNREGISTERED' }], message: 'Sensitive upstream text must not escape' } }, { status: providerStatus });
    throw new Error('Unexpected test request');
  };
  return { called, handler: createPushHandler(config, mock) };
}
const body = { tokens: [{ token: 'registered-device', platform: 'android' }], payload: { title: 'Test', body: 'Test', action_url: '/' } };
const invoke = (f, bearer = 'user-session', value = body, headers = {}) => f.handler(new Request('https://api.example.test/functions/v1/send-push-notification', { method: 'POST', headers: { ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}), ...headers }, body: JSON.stringify(value) }));
const providerCalls = f => f.called.filter(c => c.url.includes('googleapis.com')).length;
test('missing, public and forged sessions cannot access devices or provider', async () => {
  for (const bearer of [null, 'test-public', 'forged-session']) {
    const f = fixture({ invalid: true });
    assert.equal((await invoke(f, bearer)).status, 401);
    assert.equal(providerCalls(f), 0);
    assert.equal(f.called.filter(c => c.url.includes('/rest/v1/')).length, 0);
  }
});
test('ordinary users cannot target another user or unregistered device', async () => {
  for (const options of [{ owner: other }, { registered: false }]) {
    const f = fixture(options);
    assert.equal((await invoke(f)).status, 403); assert.equal(providerCalls(f), 0);
  }
});
test('own registered device reaches authenticated FCM once', async () => {
  const f = fixture(); const result = await invoke(f);
  assert.equal(result.status, 200); assert.equal((await result.json()).results[0].success, true);
  assert.equal(providerCalls(f), 2);
  assert.equal(f.called.find(c => c.url.endsWith('/auth/v1/user')).options.headers.Authorization, 'Bearer user-session');
});
test('verified administrators and internal service can target registered users', async () => {
  for (const bearer of ['user-session', 'test-service']) {
    const f = fixture({ admin: true, owner: other });
    assert.equal((await (await invoke(f, bearer)).json()).success, true);
  }
});
test('disabled push preferences never contact provider', async () => {
  const f = fixture({ enabled: false }); const result = await (await invoke(f)).json();
  assert.equal(result.success, false); assert.equal(result.results[0].error, 'PUSH_DISABLED'); assert.equal(providerCalls(f), 0);
});
test('provider rejection remains rejection and sensitive text is omitted', async () => {
  const f = fixture({ providerStatus: 404 }); const result = await invoke(f);
  const text = await result.text(); assert.equal(JSON.parse(text).success, false);
  assert.equal(JSON.parse(text).results[0].error, 'UNREGISTERED'); assert.ok(!text.includes('Sensitive upstream'));
});
test('invalid body, token syntax and external action URLs are rejected', async () => {
  for (const value of [null, {}, { ...body, tokens: [{ token: 'bad\",injection', platform: 'android' }] }, { ...body, payload: { ...body.payload, action_url: '//evil.example.test' } }]) {
    const f = fixture(); assert.equal((await invoke(f, 'user-session', value)).status, 400); assert.equal(providerCalls(f), 0);
  }
});
test('oversized bodies are rejected even without content-length', async () => {
  const f = fixture(); assert.equal((await invoke(f, 'user-session', { ...body, extra: 'x'.repeat(65_000) })).status, 413); assert.equal(providerCalls(f), 0);
});
test('duplicate device entries are sent only once', async () => {
  const f = fixture(); const result = await (await invoke(f, 'user-session', { ...body, tokens: [body.tokens[0], body.tokens[0]] })).json();
  assert.equal(result.results.length, 1); assert.equal(providerCalls(f), 2);
});
test('ordinary caller rate limit bounds repeated sends', async () => {
  const f = fixture({ enabled: false });
  for (let i=0;i<20;i++) assert.equal((await invoke(f)).status, 200);
  assert.equal((await invoke(f)).status, 429); assert.equal(providerCalls(f), 0);
});
