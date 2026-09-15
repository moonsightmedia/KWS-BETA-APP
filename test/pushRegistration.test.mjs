import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const source = await readFile(new URL('../src/utils/pushNotifications.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const session = { user: { id: 'owner-a' }, access_token: 'synthetic-session' };
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness({ native = true, permission = 'granted', failSave = false } = {}) {
  const listeners = new Map(), timers = new Set(), requests = [], events = [], logs = [], storage = new Map();
  let calls = 0;
  const plugin = {
    checkPermissions: async () => ({ receive: permission }), requestPermissions: async () => ({ receive: permission }),
    addListener: async (name, callback) => { listeners.set(name, callback); return { remove: async () => listeners.delete(name) }; },
    register: async () => { calls++; }, unregister: async () => {},
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => name === '@capacitor/push-notifications' ? { PushNotifications: plugin }
      : name === '@capacitor/core' ? { Capacitor: { isNativePlatform: () => native, getPlatform: () => 'ios' } }
      : name.endsWith('authenticatedFetch') ? { getCurrentSession: async () => session }
      : name.endsWith('notifications') ? { notificationDestination: url => url === '/boulders' ? url : null }
      : { notificationRequest: async (path, token, options) => { requests.push({ path, token, options }); if (failSave) throw new Error('offline'); return { data: [JSON.parse(options.body)] }; } },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    crypto: { randomUUID: () => 'synthetic-device' },
    window: { dispatchEvent: event => events.push(event) }, Event, CustomEvent, URLSearchParams,
    setTimeout: callback => { timers.add(callback); return callback; }, clearTimeout: timer => timers.delete(timer),
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
  });
  return { api: exports, listeners, requests, events, logs, timers, calls: () => calls };
}
test('register() is not success: wait for native event and confirmed token persistence; concurrent calls share work', async () => {
  const h = harness(); let finished = false;
  const first = h.api.initializePushNotifications(session).then(value => { finished = true; return value; });
  const second = h.api.initializePushNotifications(session);
  await flush(); assert.equal(h.calls(), 1); assert.equal(finished, false); assert.equal(h.requests.length, 0);
  h.listeners.get('registration')({ value: 'synthetic-device-token' });
  assert.equal(await first, true); assert.equal(await second, true); assert.equal(h.requests.length, 1);
  const body = JSON.parse(h.requests[0].options.body);
  assert.equal(body.user_id, 'owner-a'); assert.equal(body.device_id, 'ios_synthetic-device');
  assert.equal(h.logs.length, 0); assert.equal(h.timers.size, 0);
});
test('persistence failure rejects and later registration events do not write after failure', async () => {
  const h = harness({ failSave: true }); const pending = h.api.initializePushNotifications(session);
  const rejection = assert.rejects(pending, /nicht gespeichert/);
  await flush(); h.listeners.get('registration')({ value: 'synthetic' }); await rejection;
  h.listeners.get('registration')({ value: 'late' }); await flush(); assert.equal(h.requests.length, 1);
});
test('registration error and timeout reject without false success or late writes', async () => {
  for (const timeout of [false, true]) {
    const h = harness(); const pending = h.api.initializePushNotifications(session); const rejection = assert.rejects(pending);
    await flush();
    if (timeout) [...h.timers][0](); else h.listeners.get('registrationError')({ error: 'native failure' });
    await rejection; h.listeners.get('registration')({ value: 'late' }); await flush(); assert.equal(h.requests.length, 0);
  }
});
test('unmount/account reset cancels in-flight registration and removes listeners', async () => {
  const h = harness(); const pending = h.api.initializePushNotifications(session); const rejection = assert.rejects(pending, /abgebrochen/);
  await flush(); const late = h.listeners.get('registration'); await h.api.stopPushListeners(); await rejection;
  late({ value: 'late' }); await flush(); assert.equal(h.requests.length, 0); assert.equal(h.listeners.size, 0);
});
test('native receipt refreshes only; opening allows validated route and notification ID', async () => {
  const h = harness(); const pending = h.api.initializePushNotifications(session); await flush();
  h.listeners.get('registration')({ value: 'synthetic' }); await pending;
  h.listeners.get('pushNotificationReceived')({ title: 'sample' });
  assert.equal(h.events[0].type, 'kws:notification-received'); assert.equal(h.requests.length, 1);
  h.listeners.get('pushNotificationActionPerformed')({ notification: { data: { action_url: '/boulders', notification_id: 'id-1' } } });
  assert.equal(h.events[1].detail.target, '/boulders'); assert.equal(h.events[1].detail.id, 'id-1');
  h.listeners.get('pushNotificationActionPerformed')({ notification: { data: { action_url: 'https://outside.invalid', notification_id: 'injection,or' } } });
  assert.equal(h.events[2].detail.target, null); assert.equal(h.events[2].detail.id, undefined);
});
test('browser and denied permission do not register or persist tokens', async () => {
  for (const options of [{ native: false }, { permission: 'denied' }]) {
    const h = harness(options); assert.equal(await h.api.initializePushNotifications(session), false);
    assert.equal(h.calls(), 0); assert.equal(h.requests.length, 0);
  }
});
