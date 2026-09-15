import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/personalProgress.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { readPersonalRows, readTrackedBoulders, buildPersonalProgress, homeFocusBoulders, validSessionDay, gradeKey } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const now = new Date(2026, 8, 15, 12);
const entry = (id, status = 'attempted', grade = 4, patch = {}) => ({
  boulder: { id, name: id, color: 'Grün', difficulty: grade, status: 'haengt' },
  tick: { id: `tick-${id}`, boulder_id: id, user_id: 'me', status, attempt_count: 0, is_favorite: false, is_project: false, updated_at: '2026-09-15', ...patch },
});
const session = (id, boulder_id, session_date, result = 'top', patch = {}) => ({ id, boulder_id, session_date, result, user_id: 'me', attempt_count: 2, updated_at: '2026-09-15', ...patch });

test('loads beyond 12 and 1000 rows, even with a server cap below the requested page size', async () => {
  const rows = Array.from({ length: 1234 }, (_, i) => ({ id: String(i).padStart(5, '0'), user_id: 'me' }));
  let calls = 0;
  const result = await readPersonalRows('boulder_ticks', 'me', '*', async path => {
    const q = new URL(path, 'https://example.invalid').searchParams; calls++;
    assert.equal(q.get('user_id'), 'eq.me'); assert.equal(q.get('order'), 'id.asc');
    return rows.filter(row => !q.has('id') || row.id > q.get('id').slice(3)).slice(0, 87);
  });
  assert.equal(result.length, 1234); assert.equal(calls, 16);
});
test('later-page errors and repeated/foreign rows never produce partial success', async () => {
  let n = 0;
  await assert.rejects(readPersonalRows('boulder_ticks', 'me', '*', async () => { if (n++) throw new Error('offline'); return [{ id: 'a', user_id: 'me' }]; }), /offline/);
  await assert.rejects(readPersonalRows('boulder_ticks', 'me', '*', async () => [{ id: 'a', user_id: 'other' }]));
  await assert.rejects(readPersonalRows('boulder_ticks', 'me', '*', async () => [{ id: 'a', user_id: 'me' }]));
});
test('metadata is batched and paginated; missing boulders remain safe null entries', async () => {
  const ticks = Array.from({ length: 215 }, (_, i) => entry(String(i).padStart(4, '0')).tick).sort((a, b) => a.id.localeCompare(b.id));
  const result = await readTrackedBoulders('me', async path => {
    const url = new URL(path, 'https://example.invalid'); const q = url.searchParams;
    if (url.pathname.endsWith('/boulder_ticks')) return ticks.filter(t => !q.has('id') || t.id > q.get('id').slice(3)).slice(0, 37);
    const ids = q.get('id').slice(4, -1).split(','); assert.ok(ids.length <= 100);
    const cursor = q.get('and')?.slice(7, -1) ?? '';
    return ids.filter(id => id > cursor && id !== '0001').sort().slice(0, 17).map(id => ({ id }));
  });
  assert.equal(result.length, 215); assert.equal(result.filter(e => !e.boulder).length, 1);
  assert.equal(result.find(e => e.boulder)?.boulder.status, 'haengt');
});
test('bookmarks are not activity; flashes are tops; days are distinct; high attempted grade is excluded', () => {
  const entries = [entry('a', 'flash', 3), entry('b', 'top', 5), entry('c', 'attempted', 8, { is_favorite: true })];
  const rows = [session('1', 'a', '2026-09-15', 'flash', { attempt_count: 1 }), session('2', 'b', '2026-09-15'), session('3', 'c', '2026-09-14', 'attempted', { attempt_count: 0 })];
  const stats = buildPersonalProgress(entries, rows, { days: 7, now });
  assert.equal(stats.tops, 2); assert.equal(stats.flashes, 1); assert.equal(stats.days, 1); assert.equal(stats.attempts, 3); assert.equal(stats.highestGrade, 5);
});
test('a repeat top on another day counts once; duplicate day uses latest result', () => {
  const rows = [session('1', 'a', '2026-09-15', 'flash', { updated_at: 'a' }), session('2', 'a', '2026-09-15', 'top', { updated_at: 'b' }), session('3', 'a', '2026-09-14')];
  const result = buildPersonalProgress([entry('a', 'top')], rows, { days: 7, now });
  assert.equal(result.tops, 1); assert.equal(result.flashes, 0); assert.equal(result.days, 2); assert.equal(result.attempts, 4);
});
test('seven-day window includes today and six preceding calendar days, excludes future and invalid dates', () => {
  const rows = ['2026-09-08', '2026-09-09', '2026-09-15', '2026-09-16', '2026-02-30'].map((day, i) => session(String(i), String(i), day));
  const result = buildPersonalProgress([], rows, { days: 7, now });
  assert.equal(result.from, '2026-09-09'); assert.equal(result.tops, 2); assert.equal(result.days, 2);
  assert.equal(validSessionDay('2026-02-30'), false); assert.equal(validSessionDay('2024-02-29'), true);
});
test('legacy tops have no invented dates; removed/unknown boulders are included in overall history', () => {
  const a = entry('a', 'flash', 3); a.boulder.status = 'abgeschraubt';
  const b = entry('b', 'top', null); b.boulder = null;
  const all = buildPersonalProgress([a, b], [], { now });
  const week = buildPersonalProgress([a, b], [], { now, days: 7 });
  assert.equal(all.tops, 2); assert.equal(all.legacySuccesses, 2); assert.equal(all.highestGrade, 3); assert.equal(all.days, 0);
  assert.equal(all.distribution.find(r => r.grade === '?').tops, 1); assert.equal(week.tops, 0);
});
test('grade filter scopes metrics and days, not the comparison chart; zero grade and fractional grades are unknown', () => {
  const entries = [entry('a', 'top', 4), entry('b', 'flash', 7)];
  const stats = buildPersonalProgress(entries, [session('1', 'a', '2026-09-15'), session('2', 'b', '2026-09-14', 'flash')], { now, grade: '4' });
  assert.equal(stats.tops, 1); assert.equal(stats.days, 1); assert.equal(stats.highestGrade, 4); assert.equal(stats.distribution.find(r => r.grade === '7').tops, 1);
  assert.equal(gradeKey(0), '?'); assert.equal(gradeKey(4.5), '?');
});
test('Home uses complete display data, excludes missing/removed/successful boulders and prioritizes projects', () => {
  const entries = [entry('a', 'attempted', 4, { is_project: true }), entry('b', 'attempted', 3, { is_favorite: true }), entry('gone', 'attempted', 4, { is_project: true }), entry('removed', 'attempted', 4, { is_project: true })];
  const full = [{ id: 'a', sector: 'Bug A', thumbnailUrl: '/thumb.jpg', status: 'haengt' }, { id: 'b', sector: 'Grotte B', status: 'haengt' }, { id: 'removed', status: 'abgeschraubt' }];
  const result = homeFocusBoulders(entries, full, new Set(['b']));
  assert.equal(result.length, 1); assert.equal(result[0].boulder, full[0]); assert.equal(result[0].boulder.sector, 'Bug A');
});
