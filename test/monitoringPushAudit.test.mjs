import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/send-push-notification/handler.ts', import.meta.url),'utf8');
const output = ts.transpileModule(source,{ compilerOptions: { target: ts.ScriptTarget.ES2022,module: ts.ModuleKind.ESNext } }).outputText;
const { createPushHandler } = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
const user = '00000000-0000-4000-8000-000000000001';
const notification = '00000000-0000-4000-8000-000000000002';
const key = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5',modulusLength: 2048,publicExponent: new Uint8Array([1,0,1]),hash: 'SHA-256' },true,['sign','verify']);
const privateKey = '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(await crypto.subtle.exportKey('pkcs8',key.privateKey)).toString('base64') + '\n-----END PRIVATE KEY-----';
const config = { supabaseUrl: 'https://fixture.test',anonKey: 'test-public',serviceKey: 'test-service',serviceAccount: JSON.stringify({ type: 'service_account',project_id: 'kws-beta-app',client_email: 'test@example.test',private_key: privateKey,token_uri: 'https://oauth2.googleapis.com/token' }) };
function fixture({ providerStatus = 200,platform = 'android',enabled = true,providerThrows = false,auditFailsAt = null,auditMalformedAt = null,authFails = false,providerMissingProof = false } = {}) {
  const audits = [];
  let providerCalls = 0;
  const handler = createPushHandler(config,async (url,options) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: user });
    if (url.includes('/user_roles?')) return Response.json([]);
    if (url.includes('/push_tokens?')) return Response.json([{ token: 'private-device-token',platform,user_id: user }]);
    if (url.includes('/notification_preferences?')) return Response.json([{ user_id: user,push_enabled: enabled }]);
    if (url.endsWith('/rpc/kws_monitoring_record_delivery')) {
      assert.equal(options.headers.Authorization,'Bearer test-service');
      const audit = JSON.parse(options.body);
      audits.push(audit);
      if (audit.p_status === auditFailsAt) return Response.json({ message: 'PRIVATE DATABASE FAILURE' },{ status: 503 });
      if (audit.p_status === auditMalformedAt) return Response.json({ accepted: true });
      return Response.json(crypto.randomUUID());
    }
    if (url === 'https://oauth2.googleapis.com/token') return Response.json(authFails ? { error: 'PRIVATE AUTH FAILURE' } : { access_token: 'fixture-provider-token',expires_in: 3600 },{ status: authFails ? 403 : 200 });
    if (url.includes('fcm.googleapis.com')) {
      providerCalls++;
      if (providerThrows) throw Error('PRIVATE PROVIDER DETAILS');
      return Response.json(providerStatus === 200 ? (providerMissingProof ? {} : { name: 'accepted' }) : { error: { details: [{ errorCode: 'UNREGISTERED' }],message: 'PRIVATE PROVIDER DETAILS' } },{ status: providerStatus });
    }
    throw Error('Unexpected request');
  });
  const invoke = () => handler(new Request('https://fixture.test/functions/v1/send-push-notification',{ method: 'POST',headers: { Authorization: 'Bearer verified-session' },body: JSON.stringify({ tokens: [{ token: 'private-device-token',platform }],payload: { title: 'Private notification title',body: 'Private notification body',data: { notification_id: notification } } }) }));
  return { audits,invoke,providerCalls: () => providerCalls };
}

test('push acceptance records attempt and provider acceptance without inventing client arrival',async () => {
  const current = fixture();
  assert.equal((await current.invoke()).status,200);
  assert.deepEqual(current.audits.map(row => row.p_status),['dispatch_attempt','provider_accepted']);
  assert.equal(current.audits[0].p_notification_id,notification);
  assert.equal(JSON.stringify(current.audits).includes('private-device-token'),false);
  assert.equal(JSON.stringify(current.audits).includes('Private notification'),false);
});

test('provider rejection, failed authentication and ambiguous message transport retain distinct states',async () => {
  for (const [options,expected] of [[{ providerStatus: 400 },'provider_rejected'],[{ providerThrows: true },'uncertain'],[{ authFails: true },'failed']]) {
    const current = fixture(options);
    await current.invoke();
    assert.deepEqual(current.audits.map(row => row.p_status),['dispatch_attempt',expected]);
    assert.equal(JSON.stringify(current.audits).includes('PRIVATE PROVIDER'),false);
  }
});

test('missing or malformed dispatch audit confirmation prevents provider access',async () => {
  for (const options of [{ auditFailsAt: 'dispatch_attempt' },{ auditMalformedAt: 'dispatch_attempt' }]) {
    const current = fixture(options);
    const result = await (await current.invoke()).json();
    assert.equal(current.providerCalls(),0);
    assert.equal(result.success,false);
    assert.equal(result.results[0].error,'AUDIT_UNAVAILABLE');
    assert.equal(JSON.stringify(result).includes('PRIVATE DATABASE'),false);
  }
});

test('failed terminal audit preserves provider acceptance and does not imply safe retry',async () => {
  for (const options of [{ auditFailsAt: 'provider_accepted' },{ auditMalformedAt: 'provider_accepted' }]) {
    const current = fixture(options);
    const result = await (await current.invoke()).json();
    assert.equal(current.providerCalls(),1);
    assert.equal(result.success,true);
    assert.equal(result.results[0].success,true);
    assert.equal(result.results[0].audit_status,'unconfirmed');
    assert.equal(result.results[0].error,undefined);
    assert.deepEqual(current.audits.map(audit => audit.p_status),['dispatch_attempt','provider_accepted']);
  }
});

test('timeout after a send or missing acceptance proof remains uncertain without retry permission',async () => {
  for (const options of [{ providerThrows: true },{ providerMissingProof: true }]) {
    const current = fixture(options);
    const result = await (await current.invoke()).json();
    assert.equal(current.providerCalls(),1);
    assert.equal(result.results[0].success,false);
    assert.equal(result.results[0].retryable,false);
    assert.equal(result.results[0].error,'PROVIDER_ACCEPTANCE_UNCERTAIN');
    assert.deepEqual(current.audits.map(audit => audit.p_status),['dispatch_attempt','uncertain']);
  }
});

test('unsupported platforms and disabled push are explicit and never reach provider',async () => {
  for (const [options,expected] of [[{ platform: 'ios' },'unsupported'],[{ enabled: false },'disabled']]) {
    const current = fixture(options);
    await current.invoke();
    assert.deepEqual(current.audits.map(row => row.p_status),[expected]);
    assert.equal(current.providerCalls(),0);
  }
});
