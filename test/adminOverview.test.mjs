import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { adminOverviewFixture } from './fixtures/adminOverview-data.mjs';

const compilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext };
const rpcSource = await readFile(new URL('../src/lib/launchMonitoring.ts', import.meta.url), 'utf8');
const rpcModule = `data:text/javascript;base64,${Buffer.from(ts.transpileModule(rpcSource, { compilerOptions }).outputText).toString('base64')}`;
const source = await readFile(new URL('../src/lib/adminOverview.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions }).outputText.replace("'@/lib/launchMonitoring'", JSON.stringify(rpcModule));
const api = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const connection = { url: 'https://fixture.invalid/', key: 'fixture-public', token: 'fixture-session' };
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });

test('admin overview validates every domain and preserves confirmed zero and unknown counts separately', () => {
  const fixture = adminOverviewFixture();
  fixture.users.new_24h = 0;
  fixture.sources.sentry.state = 'unconfigured';
  fixture.monitoring.sentry_active = null;
  const parsed = api.parseAdminOverview(fixture);
  assert.equal(parsed.users.new_24h, 0);
  assert.equal(parsed.users.total, 248);
  assert.equal(parsed.hall.sectors_active, 19);
  assert.equal(parsed.moderation.comments_pending, 4);
  assert.equal(parsed.feedback.people_active, 5);
  assert.equal(parsed.monitoring.sentry_active, null);
  assert.equal(parsed.uploads.processing_now, 1);
  assert.equal(parsed.notifications.provider_accepted_24h, 46);
  assert.equal(parsed.sources.stores.state, 'unconfigured');
  assert.equal('downloads' in parsed, false);
});

test('missing, negative, nonnumeric and unsafe domain counts never turn into zero', () => {
  const fixture = adminOverviewFixture();
  for (const group of ['users', 'hall', 'moderation', 'feedback', 'uploads', 'notifications']) {
    for (const key of Object.keys(fixture[group])) {
      for (const value of [undefined, null, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1, Infinity]) {
        const invalid = adminOverviewFixture();
        invalid[group][key] = value;
        assert.throws(() => api.parseAdminOverview(invalid), error => error.kind === 'invalid', `${group}.${key}`);
      }
    }
  }
  for (const value of [undefined, null, -1, 1.5, '1']) {
    const invalid = adminOverviewFixture(); invalid.monitoring.app_active = value;
    assert.throws(() => api.parseAdminOverview(invalid), error => error.kind === 'invalid');
  }
});

test('all non-ready Sentry states require an unknown count, including stale cached providers', () => {
  for (const state of ['unconfigured', 'empty', 'stale', 'error']) {
    const fixture = adminOverviewFixture(); fixture.sources.sentry.state = state; fixture.monitoring.sentry_active = null;
    assert.equal(api.parseAdminOverview(fixture).monitoring.sentry_active, null);
    fixture.monitoring.sentry_active = 0;
    assert.throws(() => api.parseAdminOverview(fixture), error => error.kind === 'invalid');
  }
  const invalid = adminOverviewFixture(); invalid.monitoring.sentry_active = null;
  assert.throws(() => api.parseAdminOverview(invalid), error => error.kind === 'invalid');
});

test('malformed schema, missing providers, invalid source states and timestamps fail closed', () => {
  for (const corrupt of [
    value => { value.schema_version = 2; }, value => { delete value.sources; }, value => { delete value.sources.alerts; },
    value => { value.sources.collector.state = 'healthy'; }, value => { value.sources.alerts.status = ''; },
    value => { value.sources.stores.last_success_at = 'yesterday'; }, value => { delete value.sources.stores.last_updated_at; },
    value => { value.sources.alerts.status = 'x'.repeat(161); }, value => { value.generated_at = '2026'; },
    value => { value.period_start = value.period_end; }, value => { value.period_end = '2999-01-01T00:00:00Z'; },
    value => { value.users = []; }, value => { value.monitoring.sentry_active = '2'; },
  ]) {
    const invalid = adminOverviewFixture(); corrupt(invalid);
    assert.throws(() => api.parseAdminOverview(invalid), error => error.kind === 'invalid');
  }
});

test('overview uses authenticated POST and an empty bounded RPC payload', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://fixture.invalid/rest/v1/rpc/kws_admin_overview');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer fixture-session');
    assert.equal(init.headers.apikey, 'fixture-public');
    assert.deepEqual(JSON.parse(init.body), {});
    return new Response(JSON.stringify(adminOverviewFixture()));
  };
  assert.equal((await api.loadAdminOverview(connection)).users.total, 248);
});

test('missing server migration, denied session and failed connection remain distinct errors', async () => {
  for (const [status, kind] of [[404, 'unconfigured'], [501, 'unconfigured'], [401, 'permission'], [403, 'permission'], [503, 'network']]) {
    globalThis.fetch = async () => new Response('', { status });
    await assert.rejects(api.loadAdminOverview(connection), error => error.kind === kind);
  }
  globalThis.fetch = async () => new Response('not JSON');
  await assert.rejects(api.loadAdminOverview(connection), error => error.kind === 'invalid');
  await assert.rejects(api.loadAdminOverview({ ...connection, token: '' }), error => error.kind === 'permission');
  await assert.rejects(api.loadAdminOverview({ ...connection, key: '' }), error => error.kind === 'unconfigured');
});

test('overview forwards cancellation without presenting empty successful statistics', async () => {
  const controller = new AbortController();
  globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    queueMicrotask(() => controller.abort());
  });
  await assert.rejects(api.loadAdminOverview(connection, controller.signal), error => error.name === 'AbortError');
});

test('overview inherits the fifteen second timeout', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  const pending = api.loadAdminOverview(connection);
  const result = assert.rejects(pending, error => error.kind === 'timeout');
  context.mock.timers.tick(15_000);
  await result;
});
