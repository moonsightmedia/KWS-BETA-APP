import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/monitoringClient.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { MonitoringClient, MONITORING_STORAGE_KEY, MONITORING_CONSENT_KEY, safeMonitoringProps, monitoringScreen } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

function setup(overrides = {}) {
  const values = new Map();
  let clock = Date.parse('2026-10-17T12:00:00Z');
  const sent = [];
  const dependencies = {
    storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    now: () => clock, uuid: randomUUID, platform: 'android', version: '1.0.244', release: 'kws-beta-app@1.0.244+test', channel: 'development',
    transport: async (events, owner) => { sent.push({ events, owner }); return { accepted_ids: events.map(event => event.event_id), rejected_ids: [] }; },
    ...overrides,
  };
  return { dependencies, values, sent, advance: milliseconds => { clock += milliseconds; }, create: () => new MonitoringClient(dependencies) };
}

test('usage is opt-in, diagnostic errors remain bounded and never contain arbitrary props', () => {
  const fixture = setup(); const client = fixture.create();
  assert.equal(client.getConsent(), 'unknown');
  client.startSession();
  assert.equal(client.record('boulder_detail_view'), null);
  const id = client.record('app_error', { message: 'Test', password: 'not-allowed', token: 'not-allowed' });
  assert.ok(id); assert.equal(client.getPendingCount(), 1);
  const stored = JSON.parse(fixture.values.get(MONITORING_STORAGE_KEY));
  assert.deepEqual(stored.queue[0].event.props, { message: 'Test' });
});

test('first observed instance survives restarts and is sent with its original id', async () => {
  const fixture = setup(); const initial = fixture.create();
  initial.setConsent('granted');
  const installation = initial.getInstallationId();
  const before = JSON.parse(fixture.values.get(MONITORING_STORAGE_KEY));
  const firstOpen = before.queue.find(item => item.event.name === 'first_open').event;
  const restored = fixture.create(); restored.startSession();
  assert.equal(restored.getInstallationId(), installation);
  await restored.flush();
  assert.equal(fixture.sent[0].events.filter(event => event.name === 'first_open').length, 1);
  assert.deepEqual(fixture.sent[0].events.find(event => event.name === 'first_open'), firstOpen);
});

test('unacknowledged batches persist, back off and survive process restart', async () => {
  let calls = 0;
  const fixture = setup({ transport: async events => { calls++; if (calls === 1) throw Error('offline'); return { accepted_ids: events.map(event => event.event_id), rejected_ids: [] }; } });
  const client = fixture.create(); client.setConsent('granted');
  const count = client.getPendingCount();
  assert.equal(await client.flush(), false);
  assert.equal(client.getPendingCount(), count);
  assert.equal(await client.flush(), false); assert.equal(calls, 1);
  const restored = fixture.create(); assert.equal(restored.getPendingCount(), count);
  assert.equal(await restored.flush(), true); assert.equal(restored.getPendingCount(), 0);
});

test('retry after response loss reuses event IDs so server deduplication can work', async () => {
  const committed = new Set(); let call = 0; const seen = [];
  const fixture = setup({ transport: async events => {
    seen.push(events.map(event => event.event_id));
    events.forEach(event => committed.add(event.event_id));
    if (++call === 1) throw Error('response lost after commit');
    return { accepted_ids: events.map(event => event.event_id), rejected_ids: [] };
  } });
  const client = fixture.create(); client.setConsent('granted');
  await client.flush(); fixture.advance(60_000); await client.flush();
  assert.deepEqual(seen[0], seen[1]); assert.equal(committed.size, seen[0].length);
});

test('only explicit committed IDs clear queue; forged acknowledgement preserves it', async () => {
  const fixture = setup({ transport: async () => ({ accepted_ids: [randomUUID()], rejected_ids: [] }) });
  const client = fixture.create(); client.setConsent('granted');
  const count = client.getPendingCount();
  assert.equal(await client.flush(), false); assert.equal(client.getPendingCount(), count);
});

test('permanent rejection clears only the specified event and does not confirm an error report', async () => {
  const report = randomUUID();
  const fixture = setup({ transport: async events => ({ accepted_ids: [], rejected_ids: [events[0].event_id] }) });
  const client = fixture.create(); client.record('app_error', { report_id: report });
  await client.flush();
  assert.equal(client.getPendingCount(), 0); assert.equal(client.isReportAcknowledged(report), false);
});

test('overlapping or duplicate acknowledgement IDs preserve the pending batch', async () => {
  for (const invalid of ['overlap', 'duplicate']) {
    const fixture = setup({ transport: async events => ({ accepted_ids: invalid === 'overlap' ? [events[0].event_id] : [events[0].event_id, events[0].event_id], rejected_ids: invalid === 'overlap' ? [events[0].event_id] : [] }) });
    const client = fixture.create(); client.setConsent('granted');
    const count = client.getPendingCount();
    assert.equal(await client.flush(), false); assert.equal(client.getPendingCount(), count);
  }
});

test('real client events satisfy the edge contract for unknown consent, heartbeat and fatal errors', async () => {
  const handlerSource = await readFile(new URL('../supabase/functions/monitoring-events/handler.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(handlerSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const { normalizeMonitoringEvent } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const fixture = setup({ now: () => Date.now() }); const client = fixture.create();
  client.record('app_error', { code: 'AppFailure', severity: 'fatal', report_id: randomUUID() });
  await client.flush(); client.setConsent('granted');
  client.record('foreground_heartbeat', { screen: 'boulder' });
  await client.flush();
  const events = fixture.sent.flatMap(batch => batch.events);
  assert.equal(events[0].consent, 'denied');
  for (const event of events) assert.ok(normalizeMonitoringEvent(event), event.name);
  assert.ok(events.some(event => event.name === 'foreground_heartbeat'));
});

test('critical errors are delivered before usage backlog and require their own acknowledgement', async () => {
  const fixture = setup(); const client = fixture.create(); client.setConsent('granted');
  for (let index = 0; index < 30; index++) client.record('screen_view', { screen: 'home' });
  const reportId = randomUUID(); client.record('app_error', { report_id: reportId, message: 'Test' });
  await client.flush();
  assert.equal(fixture.sent[0].events[0].name, 'app_error');
  assert.equal(client.isReportAcknowledged(reportId), true);
  assert.ok(client.getPendingCount() > 0);
});

test('consent withdrawal immediately purges queued usage while retaining technical errors', async () => {
  const fixture = setup(); const client = fixture.create(); client.setConsent('granted');
  client.record('boulder_detail_view'); client.record('app_error', { message: 'Test' });
  client.setConsent('denied');
  assert.equal(fixture.values.get(MONITORING_CONSENT_KEY), 'denied');
  assert.equal(client.getPendingCount(), 1); assert.equal(client.record('heartbeat'), null);
  await client.flush(); assert.deepEqual(fixture.sent[0].events.map(event => event.name), ['app_error']);
});

test('account changes never reassign queued events from one account to another', async () => {
  const fixture = setup(); const client = fixture.create(); client.setConsent('granted');
  const firstOwner = randomUUID(); const secondOwner = randomUUID();
  client.setOwner(firstOwner); client.record('app_error', { message: 'First owner' });
  client.setOwner(secondOwner); client.record('app_error', { message: 'Second owner' });
  await client.flush();
  assert.equal(fixture.sent[0].owner, secondOwner);
  assert.ok(fixture.sent[0].events.every(event => event.props.message !== 'First owner'));
  assert.ok(fixture.sent[0].events.every(event => !('owner' in event) && !('user_id' in event)));
});

test('session identifiers rotate after inactivity and preserve installation identity', () => {
  const fixture = setup(); const client = fixture.create(); client.setConsent('granted');
  client.record('screen_view'); const first = JSON.parse(fixture.values.get(MONITORING_STORAGE_KEY));
  fixture.advance(31 * 60_000); client.record('screen_view');
  const second = JSON.parse(fixture.values.get(MONITORING_STORAGE_KEY));
  assert.equal(first.installation, second.installation); assert.notEqual(first.session, second.session);
  assert.equal(second.queue.filter(item => item.event.session_id === second.session && item.event.name === 'session_start').length, 1);
});

test('queue is bounded, expires after 72 hours and retains errors before expendable usage', () => {
  const fixture = setup(); const client = fixture.create(); client.setConsent('granted');
  client.record('app_error', { message: 'Keep this error' });
  for (let index = 0; index < 250; index++) client.record('screen_view', { screen: 'home' });
  assert.equal(client.getPendingCount(), 200);
  assert.ok(JSON.parse(fixture.values.get(MONITORING_STORAGE_KEY)).queue.some(item => item.event.name === 'app_error'));
  fixture.advance(73 * 60 * 60_000);
  assert.equal(fixture.create().getPendingCount(), 0);
});

test('secret-like values, contacts, local paths and URLs are removed before persistence', () => {
  const safe = safeMonitoringProps({
    message: 'fetch https://example.test/reset?token=private user@example.test Bearer abc123 password=hidden',
    stack: 'at C:\\Users\\Private\\file.ts:42; at /home/private/test.ts',
    unknown: 'not allowed', status_code: 500, duration_ms: Number.NaN,
  });
  assert.ok(!JSON.stringify(safe).includes('private')); assert.ok(!JSON.stringify(safe).includes('abc123'));
  assert.ok(!JSON.stringify(safe).includes('hidden')); assert.ok(!JSON.stringify(safe).includes('@'));
  assert.equal(safe.status_code, 500); assert.equal(safe.duration_ms, undefined); assert.equal(safe.unknown, undefined);
});

test('malformed storage and unavailable storage do not break the app', () => {
  const fixture = setup(); fixture.values.set(MONITORING_STORAGE_KEY, '{broken');
  assert.ok(fixture.create().getInstallationId());
  const unavailable = setup({ storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() {} } }).create();
  assert.doesNotThrow(() => unavailable.record('app_error', { message: 'Test' }));
});

test('parallel flush calls share one request and batches contain at most twenty events', async () => {
  let complete; let calls = 0;
  const fixture = setup({ transport: events => { calls++; assert.ok(events.length <= 20); return new Promise(resolve => { complete = () => resolve({ accepted_ids: events.map(event => event.event_id), rejected_ids: [] }); }); } });
  const client = fixture.create(); client.setConsent('granted');
  const first = client.flush(); const second = client.flush();
  assert.equal(first, second); assert.equal(calls, 1); complete(); await first;
});

test('separate browser tabs preserve each other offline reports and never resurrect acknowledged events', async () => {
  const fixture = setup(); fixture.dependencies.storageKeys = () => [...fixture.values.keys()];
  const first = fixture.create(); const second = fixture.create();
  const firstId = first.record('app_error', { code: 'FirstTab' });
  const secondId = second.record('app_error', { code: 'SecondTab' });
  const restored = fixture.create(); assert.equal(restored.getPendingCount(), 2);
  await restored.flush();
  assert.deepEqual(new Set(fixture.sent[0].events.map(event => event.event_id)), new Set([firstId, secondId]));
  const thirdId = first.record('app_error', { code: 'LaterEvent' });
  await first.flush();
  assert.deepEqual(fixture.sent[1].events.map(event => event.event_id), [thirdId]);
  await second.flush(); assert.equal(fixture.sent.length, 2);
});

test('shared per-event storage retains bounded reports in memory when storage is unavailable', async () => {
  const fixture = setup(); fixture.dependencies.storageKeys = () => [];
  fixture.dependencies.storage.setItem = () => { throw Error('unavailable'); };
  const client = fixture.create(); client.record('app_error', { code: 'StorageUnavailable' });
  assert.equal(client.getPendingCount(), 1);
  await client.flush(); assert.equal(fixture.sent[0].events[0].props.code, 'StorageUnavailable');
});

test('screen labels never include query strings or raw route identifiers', () => {
  assert.equal(monitoringScreen('/boulder/' + randomUUID()), 'boulder');
  assert.equal(monitoringScreen('/boulders/' + randomUUID()), 'boulder');
  assert.equal(monitoringScreen('/auth/callback'), 'auth');
  assert.equal(monitoringScreen('/profile/edit'), 'profile');
  assert.equal(monitoringScreen('/some-private-route'), 'other');
});
