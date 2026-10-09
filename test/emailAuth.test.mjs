import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/emailAuth.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { emailRedirectUrl, safeNextPath, completeEmailSession } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
function fixture(session = { user: { id: 'test-user' } }) {
  const calls = [];
  return { calls, auth: {
    exchangeCodeForSession: async value => { calls.push(['code', value]); return { error: null }; },
    setSession: async value => { calls.push(['tokens', value]); return { error: null }; },
    getSession: async () => ({ data: { session }, error: null }),
  } };
}
test('native mail links use the public site while web links keep their own environment', () => {
  assert.equal(emailRedirectUrl('/reset-password', true, 'https://localhost'), 'https://beta.kletterwelt-sauerland.de/reset-password');
  assert.equal(emailRedirectUrl('/auth/callback?next=/', false, 'http://127.0.0.1:9090'), 'http://127.0.0.1:9090/auth/callback?next=/');
  assert.throws(() => emailRedirectUrl('/reset-password', true, 'https://localhost', 'http://private.test'));
  assert.throws(() => emailRedirectUrl('/reset-password', true, 'https://localhost', 'https://user:password@private.test'));
});
test('confirmation exchanges both implicit tokens before checking the resulting session', async () => {
  const f = fixture();
  assert.equal(await completeEmailSession(f.auth, '', '#access_token=test-access&refresh_token=test-refresh&type=signup'), false);
  assert.deepEqual(f.calls, [['tokens', { access_token: 'test-access', refresh_token: 'test-refresh' }]]);
});
test('recovery and PKCE links exchange credentials without falling through to email confirmation', async () => {
  const f = fixture();
  assert.equal(await completeEmailSession(f.auth, '?code=test-code&type=recovery', ''), true);
  assert.deepEqual(f.calls, [['code', 'test-code']]);
  assert.equal(await completeEmailSession(f.auth, '', '#access_token=test-access&refresh_token=test-refresh&type=recovery'), true);
});
test('expired, incomplete and sessionless links fail without exposing link credentials', async () => {
  const f = fixture(null);
  for (const hash of ['#error=access_denied&error_description=private-token', '#access_token=private-token', '']) {
    await assert.rejects(completeEmailSession(f.auth, '', hash), error => !error.message.includes('private-token'));
  }
  assert.equal(f.calls.length, 0);
});
test('a rejected exchange cannot fall back to an unrelated persisted session', async () => {
  const f = fixture(); f.auth.exchangeCodeForSession = async () => ({ error: new Error('private-token') });
  await assert.rejects(completeEmailSession(f.auth, '?code=test', ''), error => !error.message.includes('private-token'));
});
test('callback navigation stays within the app', () => {
  for (const value of ['//outside.test', '/\\outside.test', 'https://outside.test', null]) assert.equal(safeNextPath(value), '/');
  assert.equal(safeNextPath('/boulders?grade=6'), '/boulders?grade=6');
});
