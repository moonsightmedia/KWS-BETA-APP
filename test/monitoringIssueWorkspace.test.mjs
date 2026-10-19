import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { launchDashboardFixture } from './fixtures/launchMonitoring-data.mjs';

const transpile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const dataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const guide = dataUrl(transpile(await readFile(new URL('../src/lib/monitoringIssueGuide.ts', import.meta.url), 'utf8')));
const workspace = transpile(await readFile(new URL('../src/lib/monitoringIssueWorkspace.ts', import.meta.url), 'utf8')).replace("'./monitoringIssueGuide'", JSON.stringify(guide));
const api = await import(dataUrl(workspace));
const base = launchDashboardFixture(Date.parse('2026-10-19T08:00:00Z')).issues[0];
const issue = overrides => ({ ...base, ...overrides });
const select = (issues, options = {}) => api.filterWorkspaceIssues(issues, { ...api.defaultIssueWorkspace, ...options });

test('active inbox excludes resolved and ignored, while explicit status filters retain access', () => {
  const issues = ['open', 'unresolved', 'acknowledged', 'regressed', 'resolved', 'ignored'].map(status => issue({ fingerprint: status, status, regression: status === 'regressed' }));
  assert.equal(select(issues).length, 4);
  assert.equal(select(issues, { status: 'open' }).length, 3);
  assert.equal(select(issues, { status: 'resolved' })[0].status, 'resolved');
  assert.equal(select(issues, { status: 'all' }).length, 6);
  assert.equal(select(issues, { status: 'regressed' })[0].fingerprint, 'regressed');
});

test('priority uses regression, reported severity, recency and stable fingerprint, not incomparable source counts', () => {
  const issues = [issue({ fingerprint: 'lots', source: 'sentry', severity: 'warning', occurrences: 900000 }), issue({ fingerprint: 'fatal', severity: 'fatal', occurrences: 1 }), issue({ fingerprint: 'regression', severity: 'info', regression: true }), issue({ fingerprint: 'older', last_seen_at: '2026-10-18T08:00:00Z' })];
  assert.deepEqual(select(issues).map(row => row.fingerprint), ['regression', 'fatal', 'older', 'lots']);
  assert.equal(issues[0].fingerprint, 'lots');
  const dated = [issue({ fingerprint: 'new', first_seen_at: '2026-10-19T08:00:00Z' }), issue({ fingerprint: 'old', first_seen_at: '2026-10-01T08:00:00Z' })];
  assert.deepEqual(select(dated, { sort: 'oldest' }).map(row => row.fingerprint), ['old', 'new']);
  assert.equal(select(issues, { sort: 'latest' }).at(-1).fingerprint, 'older');
});

test('search combines readable platform/version with original technical references and source', () => {
  const sentry = issue({ source: 'sentry', title: 'AbortError (JAVASCRIPT-REACT-J)', platform: 'cocoa', release: 'kws-beta-app@1.0.246+5086e1f42b61' });
  assert.equal(select([sentry], { search: 'iphone 1.0.246 Sentry' }).length, 1);
  assert.equal(select([sentry], { search: 'javascript-react-j' }).length, 1);
  assert.equal(select([sentry], { search: 'abgebrochener vorgang' }).length, 1);
  assert.equal(select([sentry], { search: 'android' }).length, 0);
  assert.equal(select([sentry], { source: 'app' }).length, 0);
});

test('unknown Sentry impact stays unknown and lifetime totals are never presented as devices or selected-period counts', () => {
  const display = api.issueListPresentation(issue({ source: 'sentry', title: 'AbortError (JAVASCRIPT-REACT-J)', affected_devices: 0, platform: null, release: null }));
  assert.equal(display.title, 'Abgebrochener Vorgang gemeldet');
  assert.match(display.context, /ungeklärt/);
  assert.equal(display.reach, 'Betroffene Geräte unbekannt');
  assert.equal(display.basis, 'Gesamter Problemverlauf');
  assert.equal(display.platform, 'Plattform nicht gemeldet');
  assert.equal(display.version, 'Version nicht gemeldet');
  assert.equal(api.issueListPresentation(issue({ source: 'sentry', affected_devices: 8 })).reach, '8 Nutzerreferenzen');
});

test('normal app titles remain intact, technical or unbounded titles move to the detail workflow', () => {
  assert.equal(api.issueListPresentation(base).title, base.title);
  for (const title of ['Sentry-Problem (JAVASCRIPT-REACT-H)', 'TypeError: failed', 'UnunterbrocheneTechnischeFehlermeldung'.repeat(8)]) assert.equal(api.issueListPresentation(issue({ title })).title, 'Technischer Fehler gemeldet');
  const display = api.issueListPresentation(base);
  assert.equal(display.reach, '3 betroffene Geräte');
  assert.equal(display.volume, '8 Meldungen');
  assert.equal(display.basis, 'Gewählter Zeitraum');
});
