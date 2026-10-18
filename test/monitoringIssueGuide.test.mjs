import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { launchDashboardFixture } from './fixtures/launchMonitoring-data.mjs';

const source = await readFile(new URL('../src/lib/monitoringIssueGuide.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const api = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const issue = { ...launchDashboardFixture().issues[0], title: 'App-Daten konnten nicht geladen werden', release: 'kws-beta-app@1.0.246+5086e1f42b61', platform: 'web' };
const event = { event_id: 'test-event', props: { code: 'QueryNetwork', component: 'query', private_note: 'must-not-copy' }, user_ref: 'private-account', installation_ref: 'private-installation' };

test('human-readable release and platform preserve raw details elsewhere without leaking build strings', () => {
  assert.equal(api.monitoringVersionName(issue.release), '1.0.246');
  assert.equal(api.monitoringVersionName('android@1.0.67'), '1.0.67');
  assert.equal(api.monitoringVersionName(null), 'Nicht angegeben');
  assert.equal(api.monitoringVersionName('private-build'.repeat(20)), 'Nicht angegeben');
  assert.equal(api.monitoringPlatformName('web'), 'Webbrowser');
  assert.equal(api.monitoringPlatformName('ios'), 'iPhone / iPad');
  assert.equal(api.monitoringPlatformName(null), 'Nicht eindeutig zugeordnet');
});

test('query diagnosis uses evidence and never turns a load failure into a proven crash or server outage', () => {
  const guide = api.monitoringIssueGuide(issue, [event]);
  assert.equal(guide.heading, 'App-Daten wurden nicht geladen');
  assert.match(guide.impact, /nicht automatisch ein Absturz/);
  assert.match(guide.reason, /nicht bestätigt/);
  assert.match(api.monitoringIssueGuide(issue).reason, /noch nicht bestätigt/);
  assert.match(api.monitoringIssueGuide(issue, [{ ...event, props: { code: 'QueryTimeout' } }]).reason, /zu lange/);
  assert.match(api.monitoringIssueGuide(issue, [{ ...event, props: { code: 'QueryServer503' } }]).reason, /Server hat einen Fehler/);
});

test('mutation, upload and unknown errors receive safe next steps, never blind retries or invented causes', () => {
  const mutation = api.monitoringIssueGuide({ ...issue, title: 'Änderung konnte nicht gespeichert werden' });
  assert.match(mutation.steps[0], /zuerst den gespeicherten Stand/);
  const upload = api.monitoringIssueGuide({ ...issue, title: 'Uploadfehler' });
  assert.match(upload.steps[0], /nicht ungeprüft/);
  const unknown = api.monitoringIssueGuide({ ...issue, title: 'RuntimeException' });
  assert.match(unknown.impact, /nicht eindeutig bekannt/);
  assert.match(unknown.reason, /nicht bestätigt/);
});

test('support copy preserves diagnosis references but excludes identities, arbitrary props and raw stacks', () => {
  const report = api.monitoringSupportReport(issue, [event]);
  assert.match(report, /test-event/);
  assert.match(report, /QueryNetwork/);
  assert.match(report, /kws-beta-app@1.0.246\+5086e1f42b61/);
  for (const excluded of ['private-account', 'private-installation', 'must-not-copy']) assert.ok(!report.includes(excluded));
  assert.match(api.monitoringSupportReport({ ...issue, source: 'sentry' }), /gesamter Problemverlauf/);
});
