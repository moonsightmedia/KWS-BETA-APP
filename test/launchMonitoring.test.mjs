import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { launchDashboardFixture } from './fixtures/launchMonitoring-data.mjs';

const source = await readFile(new URL('../src/lib/launchMonitoring.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const api = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const connection = { url: 'https://fixture.invalid/', key: 'fixture-public', token: 'fixture-session' };
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });

test('validates the complete v1 contract and retains unknown rather than inventing zero counts', () => {
  const fixture = launchDashboardFixture();
  fixture.summary.new_accounts = null;
  const parsed = api.parseLaunchDashboard(fixture);
  assert.equal(parsed.summary.new_accounts, null);
  assert.equal(parsed.summary.first_opens, 24);
  assert.equal(parsed.sources.stores.state, 'unconfigured');
  for (const corrupt of [value => { value.schema_version = 2; }, value => { delete value.summary.sessions; }, value => { value.summary.errors = -1; }, value => { value.activity[0].last_seen_at = 'wrong'; }, value => { value.sources.collector.state = 'healthy'; }, value => { value.issues[0].occurrences = '8'; }, value => { value.daily = {}; }]) {
    const invalid = launchDashboardFixture(); corrupt(invalid);
    assert.throws(() => api.parseLaunchDashboard(invalid), error => error.kind === 'invalid');
  }
});

test('dashboard uses authenticated POST RPC, exact filter payload and a bounded server response', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://fixture.invalid/rest/v1/rpc/kws_monitoring_dashboard');
    assert.equal(init.method, 'POST'); assert.equal(init.headers.Authorization, 'Bearer fixture-session');
    assert.deepEqual(JSON.parse(init.body), { p_days: 7, p_platform: 'ios', p_release: 'ios@1.0.24' });
    return new Response(JSON.stringify(launchDashboardFixture()));
  };
  assert.equal((await api.loadLaunchDashboard(connection, { days: 7, platform: 'ios', release: 'ios@1.0.24' })).summary.sessions, 81);
  assert.throws(() => api.launchFilterPayload({ days: 365, platform: 'all', release: 'all' }), /unbekanntes Format/);
  const oversized = launchDashboardFixture(); oversized.issues = Array(201).fill(oversized.issues[0]);
  assert.throws(() => api.parseLaunchDashboard(oversized), /unbekanntes Format/);
});

test('unconfigured, denied, invalid and unavailable sources remain errors, never successful empty metrics', async () => {
  for (const [status, kind] of [[404, 'unconfigured'], [403, 'permission'], [503, 'network']]) {
    globalThis.fetch = async () => new Response('', { status });
    await assert.rejects(api.loadLaunchDashboard(connection, api.defaultLaunchFilters), error => error.kind === kind);
  }
  globalThis.fetch = async () => new Response('not JSON');
  await assert.rejects(api.loadLaunchDashboard(connection, api.defaultLaunchFilters), error => error.kind === 'invalid');
  await assert.rejects(api.loadLaunchDashboard({ ...connection, key: '' }, api.defaultLaunchFilters), error => error.kind === 'unconfigured');
});

test('cancellation propagates to the fetch and does not become a successful empty response', async () => {
  const controller = new AbortController();
  globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    queueMicrotask(() => controller.abort());
  });
  await assert.rejects(api.loadLaunchDashboard(connection, api.defaultLaunchFilters, controller.signal), error => error.name === 'AbortError');
});

test('RPC requests abort after fifteen seconds and report timeout separately', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  const pending = api.loadLaunchDashboard(connection, api.defaultLaunchFilters);
  const result = assert.rejects(pending, error => error.kind === 'timeout');
  context.mock.timers.tick(15_000);
  await result;
});

test('issue details are lazy by fingerprint and a write succeeds only after status confirmation', async () => {
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    const payload = JSON.parse(init.body);
    if (url.endsWith('kws_monitoring_issue_events')) { assert.deepEqual(payload, { p_fingerprint: 'fixture-video' }); return new Response('[]'); }
    assert.deepEqual(payload, { p_fingerprint: 'fixture-video', p_status: 'resolved', p_fixed_release: 'android@1.0.68' });
    return new Response(JSON.stringify({ fingerprint: 'fixture-video', status: 'resolved', fixed_release: 'android@1.0.68' }));
  };
  assert.deepEqual(await api.loadLaunchIssueEvents(connection, 'fixture-video'), []);
  assert.equal((await api.updateLaunchIssueStatus(connection, 'fixture-video', 'resolved', ' android@1.0.68 ')).status, 'resolved');
  assert.equal(calls, 2);
  await assert.rejects(api.updateLaunchIssueStatus(connection, 'fixture-video', 'resolved', ''), error => error.kind === 'invalid');
  globalThis.fetch = async () => new Response('{}');
  await assert.rejects(api.updateLaunchIssueStatus(connection, 'fixture-video', 'open', null), /nicht bestätigt/);
});

test('foreground activity expires after three minutes and external links reject unsafe schemes', () => {
  const now = Date.now();
  const activity = launchDashboardFixture(now).activity[0];
  assert.equal(api.visibleLaunchActivity([activity], now + 180_001).length, 0);
  assert.equal(api.visibleLaunchActivity([activity], now).length, 1);
  for (const unsafe of ['javascript:alert(1)', 'http://insecure.test', 'https://user:pass@example.test', null]) assert.equal(api.safeMonitoringLink(unsafe), undefined);
  assert.equal(api.safeMonitoringLink('https://sentry.example.test/issues/1'), 'https://sentry.example.test/issues/1');
});
