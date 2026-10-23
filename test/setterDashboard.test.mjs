import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
async function load(file) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}
const { summarizeDashboard } = await load('../src/lib/setterDashboard.ts');
const { readDashboardRows } = await load('../src/lib/setterDashboardReader.ts');
const boulder = (id, difficulty, areas) => ({ id, name: id, difficulty, areas, sector: areas.join(' · ') });
const data = { boulders: [boulder('a', 5, ['Bug', 'Grotte']), boulder('b', 7, ['Grotte']), boulder('c', null, ['Bug'])],
  ratings: [{ id: 'r1', boulder_id: 'a', rating: 5 }, { id: 'r2', boulder_id: 'a', rating: 3 }, { id: 'r3', boulder_id: 'b', rating: 1 }, { id: 'r4', boulder_id: 'old', rating: 5 }],
  grades: [{ id: 'g1', boulder_id: 'a', feedback: 'too_hard' }], comments: [{ id: 'c1', boulder_id: 'b' }] };
test('weighted stars, separate contribution types, coverage and unknown grades', () => {
  const s = summarizeDashboard(data);
  assert.equal(s.average, 3); assert.equal(s.ratingCount, 3); assert.equal(s.covered, 2);
  assert.deepEqual(s.stars, [1, 0, 1, 0, 1]); assert.equal(s.comments, 1); assert.equal(s.gradeCount, 1);
  assert.equal(s.distribution.find(d => d.grade === null).count, 1);
  assert.equal(s.rows.find(r => r.id === 'a').feedbackCount, 3);
});
test('two-sector boulders counted once and filtered with either area', () => {
  assert.equal(summarizeDashboard({ ...data, boulders: [...data.boulders, data.boulders[0]] }).rows.length, 3);
  const s = summarizeDashboard(data, 'Bug');
  assert.deepEqual(s.rows.map(r => r.id), ['a', 'c']); assert.equal(s.ratingCount, 2); assert.equal(s.comments, 0);
  assert.equal(summarizeDashboard(data, 'Grotte').rows.length, 2);
});
test('unrated is null, invalid stars and orphan feedback are excluded', () => {
  const s = summarizeDashboard({ ...data, ratings: [...data.ratings, { id: 'bad', boulder_id: 'c', rating: 0 }] });
  assert.equal(s.rows.find(r => r.id === 'c').average, null); assert.equal(s.ratingCount, 3);
  const empty = summarizeDashboard({ boulders: [], ratings: [], grades: [], comments: [] });
  assert.equal(empty.average, null); assert.equal(empty.covered, 0);
});
test('server-capped pages are fully read through an empty page', async () => {
  const calls = []; const pages = [[{ id: 'a' }], [{ id: 'b' }], []];
  const result = await readDashboardRows('/rows?select=id', async path => { calls.push(path); return pages.shift(); });
  assert.deepEqual(result, [{ id: 'a' }, { id: 'b' }]); assert.match(calls[1], /id=gt.a/); assert.match(calls[2], /id=gt.b/);
});
test('failed later pages reject partial totals and repeated cursors abort', async () => {
  let count = 0;
  await assert.rejects(readDashboardRows('/rows?select=id', async () => { if (++count > 1) throw new Error('503'); return [{ id: 'a' }]; }), /503/);
  await assert.rejects(readDashboardRows('/rows?select=id', async () => [{ id: 'a' }]), /vollständig/);
  await assert.rejects(readDashboardRows('/rows?select=id', async () => null), /Ungültige/);
});
