import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/liveMonitoringSubscription.ts', import.meta.url), 'utf8');
const transpiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const executable = transpiled.replace(/import \{ createClient \} from ['"]@supabase\/supabase-js['"];?/, 'const createClient = (...args) => globalThis.liveSDKFixture(...args);');
const { subscribeLiveMonitoring } = await import('data:text/javascript;base64,' + Buffer.from(executable).toString('base64'));
const connection = { url: 'https://fixture.invalid', key: 'public-fixture', token: 'admin-fixture' };

function fixture(context, failure = false) {
  const calls = [];
  let resolveAuth;
  let eventHandler;
  let stateHandler;
  const channel = { on: (type, filter, handler) => { calls.push({ type, filter }); eventHandler = handler; return channel; }, subscribe: handler => { stateHandler = handler; return channel; } };
  const client = {
    realtime: { setAuth: token => { calls.push({ auth: token }); return failure ? Promise.reject(new Error('rejected')) : new Promise(resolve => { resolveAuth = resolve; }); }, disconnect: () => calls.push('disconnect') },
    channel: name => { calls.push(name); return channel; }, removeChannel: async () => { calls.push('remove'); },
  };
  context.mock.method(globalThis, 'liveSDKFixture', (url, key, options) => { assert.equal(url, connection.url); assert.equal(key, connection.key); assert.equal(options.auth.persistSession, false); return client; });
  return { calls, authorize: () => resolveAuth(), event: payload => eventHandler(payload), state: status => stateHandler(status) };
}
globalThis.liveSDKFixture = () => { throw new Error('No fixture'); };

test('admin JWT is set before joining; only real row updates invalidate; errors and cleanup are distinct', async context => {
  const sdk = fixture(context);
  const statuses = [];
  let invalidations = 0;
  const stop = subscribeLiveMonitoring(connection, () => invalidations++, status => statuses.push(status));
  assert.deepEqual(sdk.calls, [{ auth: 'admin-fixture' }]);
  sdk.authorize(); await Promise.resolve();
  assert.equal(sdk.calls[1], 'admin-monitoring-live');
  assert.deepEqual(sdk.calls[2], { type: 'postgres_changes', filter: { event: 'UPDATE', schema: 'public', table: 'monitoring_live_revision' } });
  sdk.state('SUBSCRIBED');
  assert.deepEqual(statuses, [true]); assert.equal(invalidations, 1);
  sdk.event({ errors: ['Error 401: Unauthorized'], new: {} });
  assert.equal(statuses.at(-1), false); assert.equal(invalidations, 1);
  sdk.event({ errors: [], new: { revision: crypto.randomUUID() } });
  assert.equal(invalidations, 2);
  stop(); sdk.event({ new: { revision: crypto.randomUUID() } }); sdk.state('SUBSCRIBED');
  assert.equal(invalidations, 2); assert.equal(statuses.at(-1), false);
  assert.deepEqual(sdk.calls.slice(-2), ['remove', 'disconnect']);
});

test('unmount while authenticating never joins and failed auth cannot appear connected', async context => {
  const sdk = fixture(context);
  const statuses = [];
  const stop = subscribeLiveMonitoring(connection, () => assert.fail('Invalidation after stop'), value => statuses.push(value));
  stop(); sdk.authorize(); await Promise.resolve();
  assert.deepEqual(sdk.calls, [{ auth: 'admin-fixture' }, 'disconnect']);
  assert.deepEqual(statuses, []);
  fixture(context, true);
  const finish = subscribeLiveMonitoring(connection, () => assert.fail('Invalidation after auth failure'), value => statuses.push(value));
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(statuses, [false]); finish();
});
