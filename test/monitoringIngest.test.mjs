import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/monitoring-events/handler.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { createMonitoringHandler, normalizeMonitoringEvent, scrubMonitoringText } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const user = '00000000-0000-4000-8000-000000000001';
const eventId = '00000000-0000-4000-8000-000000000002';
const installation = '00000000-0000-4000-8000-000000000003';
const session = '00000000-0000-4000-8000-000000000004';
const config = { supabaseUrl: 'https://private.example.test', anonKey: 'test-public', serviceKey: 'test-service' };
const event = (overrides = {}) => ({ event_id: eventId, installation_id: installation, session_id: session, occurred_at: new Date().toISOString(), name: 'first_open', platform: 'android', app_version: '1.0.244', release: 'kws-beta-app@1.0.244+abc123', channel: 'apk', consent: 'granted', props: {}, ...overrides });
function fixture({ invalidSession = false, dbStatus = 200, dbCode, dbBody } = {}) {
  const calls = [];
  const handler = createMonitoringHandler(config, async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return Response.json(invalidSession ? {} : { id: user }, { status: invalidSession ? 401 : 200 });
    assert.equal(url, config.supabaseUrl + '/rest/v1/rpc/kws_ingest_monitoring_events');
    assert.equal(options.headers.Authorization, 'Bearer test-service');
    return Response.json(dbBody || (dbStatus === 200 ? { accepted_ids: [eventId], rejected_ids: [] } : { code: dbCode, message: 'PRIVATE DATABASE FAILURE' }), { status: dbStatus });
  });
  return { calls, handler };
}
const invoke = (fixture, events = [event()], bearer = 'test-public', extra = {}) => fixture.handler(new Request('https://api.example.test/functions/v1/monitoring-events', { method: 'POST', headers: { ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}), ...extra }, body: JSON.stringify({ events }) }));

test('anonymous first starts use only the service-only ingest path', async () => {
  const current = fixture();
  assert.deepEqual(await (await invoke(current)).json(), { accepted_ids: [eventId], rejected_ids: [] });
  assert.equal(current.calls.length, 1);
  assert.equal(JSON.parse(current.calls[0].options.body).p_user_id, null);
});

test('authenticated identity comes from auth service, never event payload', async () => {
  const current = fixture();
  assert.equal((await invoke(current, [event({ user_id: 'forged' })], 'session-jwt')).status, 200);
  const body = JSON.parse(current.calls[1].options.body);
  assert.equal(body.p_user_id, user);
  assert.equal(body.p_events[0].user_id, undefined);
});

test('forged sessions and service keys cannot submit public events', async () => {
  for (const bearer of [null, 'fake-jwt', 'test-service']) {
    const current = fixture({ invalidSession: true });
    assert.equal((await invoke(current, [event()], bearer)).status, 401);
    assert.equal(current.calls.filter(call => call.url.includes('/rest/')).length, 0);
  }
});

test('diagnostics remain available without usage permission; usage is rejected', async () => {
  const current = fixture();
  assert.deepEqual(await (await invoke(current, [event({ consent: 'denied' })])).json(), { accepted_ids: [], rejected_ids: [eventId] });
  assert.equal(current.calls.length, 0);
  assert.ok(normalizeMonitoringEvent(event({ name: 'app_error', consent: 'denied', props: { code: 'VIDEO_UNAVAILABLE' } })));
});

test('safe schema removes content, identity, URLs, tokens and unknown props', () => {
  const normalized = normalizeMonitoringEvent(event({ name: 'app_error', props: { code: 'REQUEST_FAILED', message: 'test@example.com password=hunter2 Bearer secret-key https://api.test/path?token=value', stack: 'Error at https://api.test/private.js?jwt=secret C:\\Users\\PrivateName\\source.ts /home/PrivateName/secret.ts /Users/PrivateName/source.ts /private/tmp/file', screen: 'boulder', email: 'test@example.com', password: 'secret', search: 'private query', unknown: { nested: 'content' }, filter_count: -1, duration_ms: 34.5 } }));
  assert.equal(normalized.props.message.includes('hunter2'), false);
  assert.equal(normalized.props.message.includes('secret-key'), false);
  assert.equal(normalized.props.message.includes('test@example.com'), false);
  assert.equal(normalized.props.stack.includes('api.test'), false);
  assert.equal(normalized.props.stack.includes('PrivateName'), false);
  assert.equal(normalized.props.email, undefined);
  assert.equal(normalized.props.unknown, undefined);
  assert.equal(normalized.props.filter_count, undefined);
  assert.equal(normalized.props.duration_ms, 35);
  assert.ok(scrubMonitoringText('x'.repeat(8000), 500).length <= 500);
});

test('strict timestamps, identifiers, versions and enum values are enforced', () => {
  for (const changes of [{ event_id: 'fake' }, { platform: 'windows' }, { channel: 'private' }, { release: 'private user content' }, { app_version: '?' }, { consent: 'unknown' }, { occurred_at: new Date(Date.now() - 73 * 3600000).toISOString() }, { occurred_at: new Date(Date.now() + 6 * 60000).toISOString() }, { boulder_id: 'private' }, { props: [] }]) assert.equal(normalizeMonitoringEvent(event(changes)), null);
});

test('unbounded or malformed batches never reach storage', async () => {
  for (const events of [[], Array.from({ length: 21 }, () => event()), [event({ event_id: null })]]) {
    const current = fixture();
    assert.equal((await invoke(current, events)).status, 400);
    assert.equal(current.calls.length, 0);
  }
  const current = fixture();
  assert.equal((await invoke(current, [event({ props: { message: 'x'.repeat(128000) } })])).status, 413);
  assert.equal(current.calls.length, 0);
});

test('database failures, malformed acknowledgements and rate limits never acknowledge persistence', async () => {
  for (const [options, expected] of [[{ dbStatus: 500 }, 503], [{ dbStatus: 400, dbCode: 'P4290' }, 429], [{ dbBody: { accepted_ids: ['invalid'], rejected_ids: [] } }, 503], [{ dbBody: { accepted_ids: [user], rejected_ids: [] } }, 503], [{ dbBody: { accepted_ids: [eventId], rejected_ids: [eventId] } }, 503]]) {
    const current = fixture(options);
    const response = await invoke(current);
    assert.equal(response.status, expected);
    const body = await response.json();
    assert.equal(body.accepted_ids, undefined);
    assert.equal(JSON.stringify(body).includes('PRIVATE'), false);
  }
});
