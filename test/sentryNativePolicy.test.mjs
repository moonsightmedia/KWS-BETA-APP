import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/sentry.ts', import.meta.url), 'utf8');

async function fixture(dsn) {
  const calls = { users: [], tags: [], initializations: 0 };
  const mock = { init: options => { calls.options = options; calls.initializations++; }, setTag: (...value) => calls.tags.push(value), setUser: value => calls.users.push(value) };
  const stripped = source.replace(/^import .*;\r?\n/gm, '')
    .replaceAll('import.meta.env.VITE_SENTRY_DSN', JSON.stringify(dsn))
    .replaceAll('import.meta.env.VITE_MONITORING_ENABLED', '"true"')
    .replaceAll('import.meta.env.VITE_MONITORING_CHANNEL', '"testflight"')
    .replaceAll('import.meta.env.VITE_SENTRY_ENVIRONMENT', '""')
    .replaceAll('import.meta.env.MODE', '"production"')
    .replaceAll('import.meta.env.VITE_RELEASE_REVISION', '"abcdef1234567890"');
  const { outputText } = ts.transpileModule(`const Sentry = __mock; const sentryReactInit = () => {}; const Capacitor = {isNativePlatform: () => true, getPlatform: () => 'ios'}; const APP_VERSION = '1.0.246'; const scrubMonitoringText = value => value.replace(/private@example.invalid/g, '[email]');\n${stripped}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  const factory = new Function('__mock', `${outputText.replace(/^export /gm, '')}; return {initSentry,setSentryUser,isSentryEnabled};`);
  return { calls, api: factory(mock) };
}

test('native capture remains off without a DSN and initializes once when configured', async () => {
  const disabled = await fixture('');
  disabled.api.initSentry(); assert.equal(disabled.api.isSentryEnabled(), false); assert.equal(disabled.calls.options, undefined);
  const enabled = await fixture('https://abcd@o1.ingest.de.sentry.io/1');
  enabled.api.initSentry();
  enabled.api.initSentry(); assert.equal(enabled.calls.initializations, 1);
  assert.equal(enabled.calls.options.enableNativeCrashHandling, true);
  assert.equal(enabled.calls.options.enableWatchdogTerminationTracking, true);
  assert.equal(enabled.calls.options.enableCaptureFailedRequests, false);
  assert.equal(enabled.calls.options.enableLogs, false);
  assert.equal(enabled.calls.options.enableAutoSessionTracking, false);
  assert.equal(enabled.calls.options.sendDefaultPii, false);
  assert.equal(enabled.calls.options.tracesSampleRate, 0);
  assert.equal(enabled.calls.options.beforeBreadcrumb({message:'private'}), null);
  assert.equal(enabled.calls.options.maxBreadcrumbs, 0);
  assert.equal(enabled.calls.options.release, 'kws-beta-app@1.0.246+abcdef123456');
});

test('native symbol upload is mandatory before sending an instrumented build to Apple', async () => {
  const workflow = await readFile(new URL('../.github/workflows/ios-testflight.yml', import.meta.url), 'utf8');
  assert.ok(workflow.indexOf('- name: Upload dSYMs to Sentry') < workflow.indexOf('- name: Upload to TestFlight'));
  assert.ok(workflow.includes('Native crash capture requires explicit Sentry symbol-upload credentials and project'));
  assert.ok(!workflow.includes('curl -sL https://sentry.io/get-cli/ | bash'));
});

test('native project receives no account identities, requests, extras or JavaScript breadcrumbs', async () => {
  const { api, calls } = await fixture('https://abcd@o1.ingest.de.sentry.io/1'); api.initSentry();
  api.setSentryUser({id:'private-account',email:'private@example.invalid'});
  assert.deepEqual(calls.users, [null]);
  const event = calls.options.beforeSend({user:{id:'private-account'},request:{url:'private-url'},extra:{password:'private'},breadcrumbs:[{message:'private'}],message:'private@example.invalid',exception:{values:[{value:'private@example.invalid'}]}});
  assert.equal(event.user, undefined); assert.equal(event.request, undefined); assert.equal(event.extra, undefined); assert.deepEqual(event.breadcrumbs, []);
  assert.equal(event.message, '[email]'); assert.equal(event.exception.values[0].value, '[email]');
  assert.deepEqual(calls.options.integrations(['Replay','ReplayCanvas','Breadcrumbs','HttpContext','BrowserSession','GlobalHandlers','BrowserApiErrors','TryCatch','NativeRelease'].map(name=>({name}))), [{name:'NativeRelease'}]);
});
