import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function load(name) {
  const source = await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { loadMonitoring } = await load('adminMonitoring');
const { ADMIN_TABS, OPERATIONS_TABS, resolveAdminTab, adminTabPath } = await load('adminNavigation');
const { makeProfileDraft, parseBirthDate, profileDraftPayload } = await load('userProfileForm');
const metrics = ['activeDevices', 'sessionsToday', 'feedbackErrors', 'uploadFails', 'uploadOom'];

test('successful empty monitoring is zero; unavailable monitoring is never zero', async () => {
  const empty = await loadMonitoring(async () => []);
  const failed = await loadMonitoring(async () => { throw new Error('offline'); });
  assert.deepEqual(empty.unavailable, []);
  assert.equal(failed.unavailable.length, 8);
  for (const key of metrics) { assert.equal(empty[key], 0); assert.equal(failed[key], null); }
});
test('each monitoring query can fail independently, and recovery clears its failure', async () => {
  for (let failedIndex = 0; failedIndex < 8; failedIndex++) {
    let index = 0;
    const result = await loadMonitoring(async () => { if (index++ === failedIndex) throw new Error('503'); return []; });
    assert.equal(result.unavailable.length, 1);
    if (failedIndex < 5) assert.equal(result[metrics[failedIndex]], null);
  }
  assert.deepEqual((await loadMonitoring(async () => [])).unavailable, []);
});
test('invalid responses are unavailable, while valid devices and views are aggregated', async () => {
  assert.equal((await loadMonitoring(async () => ({ error: 'bad response' }))).unavailable.length, 8);
  const result = await loadMonitoring(async path => path.includes('telemetry_sessions') ? [{ device_id: 'one' }, { device_id: 'one' }, { device_id: 'two' }] : path.includes('name=eq.boulder_view') ? [{ boulder_id: 'a' }, { boulder_id: 'b' }, { boulder_id: 'a' }] : []);
  assert.equal(result.sessionsToday, 2);
  assert.deepEqual(result.topBoulders, [{ boulderId: 'a', views: 2 }, { boulderId: 'b', views: 1 }]);
});
test('time windows are recalculated for every refresh', async () => {
  const requests = [];
  const now = Date.parse('2026-09-13T20:00:00Z');
  await loadMonitoring(async path => { requests.push(path); return []; }, now);
  assert.match(requests[0], /2026-09-13T19:55:00.000Z/);
  assert.match(requests[1], /2026-09-12T20:00:00.000Z/);
  await loadMonitoring(async path => { requests.push(path); return []; }, now + 60000);
  assert.match(requests[8], /2026-09-13T19:56:00.000Z/);
});
test('date-only parsing rejects invalid, future and rolling dates without UTC conversion', () => {
  const today = new Date(2026, 8, 13, 12);
  assert.equal(parseBirthDate('29.02.2000', today), '2000-02-29');
  assert.equal(parseBirthDate('13.09.2026', today), '2026-09-13');
  assert.equal(parseBirthDate('   ', today), null);
  for (const value of ['29.02.2001', '31.04.2000', '00.01.2000', '01.13.2000', '14.09.2026', '2020-01-01', '1.1.2000', '01.01.0000']) assert.equal(parseBirthDate(value, today), undefined, value);
});
test('profile payload trims names, clears optional fields and preserves existing birthdays', () => {
  const draft = makeProfileDraft({ full_name: 'Alexandra von Berg', birth_date: '1994-06-12' });
  assert.deepEqual(draft, { firstName: 'Alexandra', lastName: 'von Berg', birthDate: '12.06.1994' });
  assert.deepEqual(profileDraftPayload({ ...draft, firstName: ' Alexandra ' }), { first_name: 'Alexandra', last_name: 'von Berg', full_name: 'Alexandra von Berg', birth_date: '1994-06-12' });
  assert.deepEqual(profileDraftPayload({ firstName: ' ', lastName: '', birthDate: '' }), { first_name: null, last_name: null, full_name: null, birth_date: null });
  assert.throws(() => profileDraftPayload({ ...draft, birthDate: '31.02.2000' }));
});
test('navigation contains every admin page once, with safe fallbacks', () => {
  assert.equal(new Set(ADMIN_TABS.map(tab => tab.value)).size, 6);
  assert.deepEqual(OPERATIONS_TABS.map(tab => tab.value), ['monitoring', 'logs', 'tests']);
  for (const tab of ADMIN_TABS) { assert.equal(resolveAdminTab(tab.value), tab.value); assert.equal(adminTabPath(tab.value), '/admin?tab=' + tab.value); }
  for (const value of [null, '', 'invalid']) assert.equal(resolveAdminTab(value), 'users');
});
