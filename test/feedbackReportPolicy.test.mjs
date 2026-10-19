import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = (await readFile(new URL('../src/utils/feedbackUtils.ts', import.meta.url), 'utf8'))
  .replace("import { backendConfig, backendStorageKey } from '@/lib/backendConfig';", "const backendConfig={supabaseUrl:'https://fixture.invalid',publicKey:'fixture-public'};const backendStorageKey=key=>key;")
  .replace("import html2canvas from 'html2canvas';", 'const html2canvas=fixture.canvas;')
  .replace("import { confirmMonitoringReport, isMonitoringEnabled, reportMonitoringError } from '@/utils/monitoring';", 'const {confirmMonitoringReport,isMonitoringEnabled,reportMonitoringError}=fixture;')
  .replaceAll('import.meta.env', '({DEV:false})');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

function setup(enabled = false) {
  const state = { captures: 0, requests: [], collectorReports: 0 };
  const fixture = {
    canvas: async () => { state.captures++; return { toDataURL: () => 'data:image/png;base64,AA==' }; },
    isMonitoringEnabled: () => enabled,
    reportMonitoringError: () => { state.collectorReports++; return 'fixture-report'; },
    confirmMonitoringReport: async () => true,
  };
  const window = { screen: { width: 400, height: 800 }, innerWidth: 400, innerHeight: 800,
    scrollX: 0, scrollY: 0, location: { href: 'https://fixture.invalid/app' },
    fetch: async (url, init) => { state.requests.push({ url, init }); return new Response(null, { status: 201 }); } };
  const exports = {};
  const timer = (callback, duration) => { const handle = setTimeout(callback, duration); handle.unref(); return handle; };
  new Function('exports', 'fixture', 'window', 'document', 'navigator', 'fetch', 'setTimeout', 'console', compiled)(
    exports, fixture, window, { fonts: {}, body: {} },
    { userAgent: 'fixture', platform: 'fixture', language: 'de', cookieEnabled: false, onLine: true },
    async () => new Response(new Uint8Array([0]), { headers: { 'Content-Type': 'image/png' } }), timer,
    { log() {}, warn() {}, error() {} },
  );
  return { ...exports, state };
}

test('disabled automatic diagnostics never capture a screen or use legacy feedback transport', async () => {
  const api = setup();
  assert.equal((await api.reportError(new Error('fixture crash'))).success, false);
  assert.equal(api.state.captures, 0);
  assert.deepEqual(api.state.requests, []);
  assert.equal(api.state.collectorReports, 0);
});

test('an automatically supplied upload description does not count as a user reporting action', async () => {
  const api = setup();
  await api.reportError(new Error('fixture upload'), undefined, 'Automatically assembled file information');
  assert.equal(api.state.captures, 0);
  assert.deepEqual(api.state.requests, []);
});

test('enabled automatic diagnostics use the collector without screenshots or legacy feedback', async () => {
  const api = setup(true);
  assert.equal((await api.reportError(new Error('fixture crash'))).success, true);
  assert.equal(api.state.collectorReports, 1);
  assert.equal(api.state.captures, 0);
  assert.deepEqual(api.state.requests, []);
});

test('an explicit manual action can send a report even without a description', async () => {
  const api = setup();
  const result = await api.reportError(new Error('fixture crash'), undefined, '', null, { userInitiated: true });
  assert.equal(result.success, true);
  assert.equal(api.state.captures, 1);
  assert.equal(api.state.collectorReports, 0);
  assert.equal(api.state.requests.length, 2);
  const feedback = api.state.requests.find(request => request.url.endsWith('/rest/v1/feedback'));
  assert.equal(JSON.parse(feedback.init.body).metadata.autoReported, false);
});
