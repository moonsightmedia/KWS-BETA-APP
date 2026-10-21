import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const { outputText } = ts.transpileModule(await readFile(new URL('../src/lib/monitoringTransport.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { createMonitoringTransport } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const event = (name = 'app_error') => ({ event_id: crypto.randomUUID(), installation_id: crypto.randomUUID(), session_id: crypto.randomUUID(), name, consent: 'granted', boulder_id: crypto.randomUUID(), props: { code: 'AuthenticationSessionLost', report_id: crypto.randomUUID() } });
function fixture() {
  const state = { identity: { id: 'owner', token: 'invalid-session' }, calls: [], failUsage: true, lostAck: false };
  const committed = new Map();
  const transport = createMonitoringTransport({ url: 'https://fixture.invalid', publicKey: 'public', identity: () => state.identity, request: async (_url, init) => {
    const events = JSON.parse(init.body).events; state.calls.push({ events, token: init.headers.Authorization });
    if (init.headers.Authorization !== 'Bearer public' && state.failUsage) return new Response('', { status: 401 });
    events.forEach(item => committed.set(item.event_id, item));
    if (state.lostAck) { state.lostAck = false; throw Error('response lost'); }
    return Response.json({ accepted_ids: events.map(item => item.event_id), rejected_ids: [] });
  } });
  return { state, committed, transport };
}
test('session-loss diagnostics are acknowledged even when usage authentication fails', async () => {
  const { state, transport } = fixture(); const diagnostic = event(); const usage = event('screen_view');
  assert.deepEqual(await transport([diagnostic, usage], 'owner'), { accepted_ids: [diagnostic.event_id], rejected_ids: [] });
  assert.equal(state.calls[0].token, 'Bearer public');
  const sent = state.calls[0].events[0];
  assert.equal(sent.consent, 'denied'); assert.equal(sent.boulder_id, null);
  assert.equal(sent.session_id, diagnostic.session_id);
  assert.equal(sent.props.report_id, diagnostic.props.report_id); assert.equal(sent.user_id, undefined);
  assert.equal(state.calls[1].token, 'Bearer invalid-session');
});
test('diagnostic retries retain stable IDs after lost response', async () => {
  const { state, committed, transport } = fixture(); const diagnostic = event(); state.lostAck = true;
  await assert.rejects(transport([diagnostic], 'owner'), /response lost/);
  assert.deepEqual(await transport([diagnostic], 'owner'), { accepted_ids: [diagnostic.event_id], rejected_ids: [] });
  assert.equal(committed.size, 1); assert.deepEqual(state.calls[0], state.calls[1]);
});
test('usage does not downgrade to guest and another account cannot send the previous queue', async () => {
  const { state, transport } = fixture();
  await assert.rejects(transport([event('screen_view')], 'owner'), /not acknowledged/);
  assert.equal(state.calls.length, 1);
  state.identity = { id: 'different', token: 'different-token' };
  await assert.rejects(transport([event()], 'owner'), /session unavailable/);
  assert.equal(state.calls.length, 1);
});
test('forged acknowledgements cannot discard queued diagnostics', async () => {
  const transport = createMonitoringTransport({ url: 'https://fixture.invalid', publicKey: 'public', identity: () => null, request: async () => Response.json({ accepted_ids: [crypto.randomUUID()], rejected_ids: [] }) });
  await assert.rejects(transport([event()], null), /Invalid monitoring acknowledgement/);
});
