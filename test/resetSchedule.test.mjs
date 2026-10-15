import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const compile = async file => ts.transpileModule(await readFile(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const uri = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const areas = uri(await compile('../src/lib/sectorAreas.ts'));
const lib = await import(uri((await compile('../src/lib/resetSchedule.ts')).replace("'./sectorAreas'", JSON.stringify(areas))));
const now = new Date('2026-10-12T10:00:00Z');
const row = (id, sector_id, scheduled_at = '2026-10-13T08:00:00Z', note = null) => ({ id, sector_id, scheduled_at, note });
test('groups equal instants, deduplicates notes and public subareas without mutating input', () => {
  const sectors = [{ id: 'a', name: 'Atta-Höhle' }, { id: 'b', name: 'Atta-Höhle' }, { id: 'c', name: 'Felsenmeer' }];
  const rows = [row('later', 'c', '2026-10-14T08:00:00Z'), row('1', 'a', undefined, '  Matten frei halten  '), row('2', 'b', '2026-10-13T10:00:00+02:00', 'Matten frei halten'), row('3', 'c')];
  const before = JSON.stringify([rows, sectors]);
  const result = lib.buildResetAppointments(rows, sectors, now);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].notes, ['Matten frei halten']);
  assert.deepEqual(result[0].sectors, [{ name: 'Bug A', ids: ['a', 'b'] }, { name: 'Kurze Platte', ids: ['c'] }]);
  assert.equal(JSON.stringify([rows, sectors]), before);
});
test('past and invalid times disappear; missing references never become clickable', () => {
  const result = lib.buildResetAppointments([row('past', 'a', '2026-10-11T08:00:00Z'), row('bad', 'a', 'invalid'), row('1', 'missing1'), row('2', 'missing2')], [], now);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].sectors, [{ name: 'Teilbereich nicht zugeordnet', ids: [] }]);
});
test('Berlin calendar days and daylight-saving change use hall time', () => {
  assert.equal(lib.hallDayKey(new Date('2026-10-12T23:00:00Z')), '2026-10-13');
  assert.equal(lib.formatHallDate(new Date('2026-10-25T00:30:00Z'), { hour: '2-digit', minute: '2-digit' }), '02:30');
  assert.equal(lib.formatHallDate(new Date('2026-10-25T01:30:00Z'), { hour: '2-digit', minute: '2-digit' }), '02:30');
  const date = lib.calendarDate('2026-10-25');
  assert.equal(date.getDate(), 25); assert.equal(date.getMonth(), 9); assert.equal(date.getHours(), 12);
});

test('relative labels use Berlin days across midnight and both DST changes', () => {
  assert.equal(lib.relativeResetDay('2026-10-13', new Date('2026-10-12T23:00:00Z')), 'Heute');
  assert.equal(lib.relativeResetDay('2026-10-14', new Date('2026-10-12T23:00:00Z')), 'Morgen');
  assert.equal(lib.relativeResetDay('2026-03-30', new Date('2026-03-29T00:00:00Z')), 'Morgen');
  assert.equal(lib.relativeResetDay('2026-10-26', new Date('2026-10-25T00:00:00Z')), 'Morgen');
  assert.equal(lib.relativeResetDay('2026-10-14', now), 'Übermorgen');
  assert.equal(lib.relativeResetDay('2026-10-16', now), null);
});

test('view state restores only valid public UI preferences', () => {
  const choice = { version: 1, view: 'calendar', selectedDay: '2026-11-17', month: '2026-11-01', hasSelection: true };
  let requestedKey;
  const restored = lib.readResetPlanView({ getItem(key) { requestedKey = key; return JSON.stringify({ ...choice, extraneous: 'must not restore' }); } }, now);
  assert.equal(requestedKey, lib.RESET_PLAN_VIEW_KEY);
  assert.deepEqual(restored, choice);
  assert.equal(lib.localCalendarDayKey(lib.calendarDate(restored.selectedDay)), '2026-11-17');
});

test('broken, blocked, obsolete and impossible storage values fall back without crashing', () => {
  const fallback = lib.defaultResetPlanView(now);
  const valid = { ...fallback, view: 'calendar', hasSelection: true };
  for (const text of [null, '{', JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, view: 'unknown' }),
    JSON.stringify({ ...valid, selectedDay: '2026-02-30' }), JSON.stringify({ ...valid, month: '2026-11-17' }),
    JSON.stringify({ ...valid, hasSelection: 'yes' })]) {
    assert.deepEqual(lib.readResetPlanView({ getItem: () => text }, now), fallback);
  }
  assert.deepEqual(lib.readResetPlanView({ getItem: () => { throw new Error('denied'); } }, now), fallback);
});
