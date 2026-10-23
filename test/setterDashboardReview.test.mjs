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
const { dashboardAreas, reviewDashboard, selectDashboardRows } = await load('../src/lib/setterDashboardReview.ts');
const now = Date.parse('2026-10-23T12:00:00Z');
const day = 86_400_000;
const boulder = (id, days = 10, difficulty = 5) => ({ id, name: id, difficulty, sector: 'Bug A', areas: ['Bug'], createdAt: new Date(now - days * day).toISOString() });
function review(boulders, ratings = [], grades = [], comments = []) {
  return reviewDashboard(summarizeDashboard({ boulders, ratings, grades, comments }), now);
}
const gradeVotes = (id, count, hard) => Array.from({ length: count }, (_, i) => ({ id: `${id}-g${i}`, boulder_id: id, feedback: i < hard ? 'too_hard' : 'just_right' }));
const ratings = (id, values) => values.map((rating, i) => ({ id: `${id}-r${i}`, boulder_id: id, rating }));

test('grade signal requires five votes and at least sixty percent in one direction', () => {
  const s = review([boulder('exact'), boulder('thin'), boulder('below')], [], [...gradeVotes('exact', 5, 3), ...gradeVotes('thin', 4, 4), ...gradeVotes('below', 5, 2)]);
  assert.deepEqual(s.attention.map(r => r.id), ['exact']);
  assert.match(s.attention[0].signals[0].evidence, /3 von 5/);
});
test('low star score is separate from grade feedback and needs five star votes', () => {
  const s = review([boulder('low'), boulder('thin'), boulder('fine')], [
    ...ratings('low', [2, 2, 3, 2, 3]), ...ratings('thin', [1, 1, 1, 1]), ...ratings('fine', [3, 3, 3, 2, 3]),
  ]);
  assert.deepEqual(s.attention.map(r => r.id), ['low']);
  assert.equal(s.attention[0].signals[0].kind, 'rating');
});
test('feedback absence is a data gap only after seven days; comments count as feedback', () => {
  const s = review([boulder('old', 7), boulder('fresh', 6), boulder('comment', 20)], [], [], [{ id: 'c', boulder_id: 'comment' }]);
  assert.equal(s.attention.length, 0); assert.equal(s.missingFeedback, 1);
  assert.equal(s.rows.find(r => r.id === 'old').signals[0].kind, 'missing');
  assert.equal(s.withoutFeedback, 2); assert.equal(s.newCount, 1);
});
test('missing, future and invalid creation dates do not invent an age or urgency', () => {
  const s = review([{ ...boulder('missing'), createdAt: undefined }, { ...boulder('invalid'), createdAt: 'not-a-date' }, boulder('future', -3)]);
  assert.equal(s.attention.length, 0); assert.equal(s.newCount, 0);
  assert.ok(s.rows.every(r => r.ageDays === null));
});
test('best ranking excludes a lone five-star vote and uses count as tie-breaker', () => {
  const s = review([boulder('one'), boulder('five'), boulder('six')], [...ratings('one', [5]), ...ratings('five', [4, 4, 4, 4, 4]), ...ratings('six', [4, 4, 4, 4, 4, 4])]);
  const rows = selectDashboardRows(s.rows, { view: 'all', grade: 'all', search: '', sort: 'best' });
  assert.deepEqual(rows.map(r => r.id), ['six', 'five']);
});
test('search, unknown grade and feedback view intersect without changing overview', () => {
  const s = review([boulder('Unknown', 20, null), boulder('Known', 20, 5)]);
  const rows = selectDashboardRows(s.rows, { view: 'none', grade: null, search: 'bug', sort: 'oldest' });
  assert.deepEqual(rows.map(r => r.id), ['Unknown']); assert.equal(s.rows.length, 2);
  assert.equal(s.totalFeedback, 0);
});
test('known empty hall areas remain selectable and do not invent boulders', () => {
  const data = { knownAreas: ['Kurze Platte', 'Bug'], boulders: [boulder('one')], ratings: [], grades: [], comments: [] };
  assert.deepEqual(dashboardAreas(data), ['Bug', 'Kurze Platte']);
  assert.equal(summarizeDashboard(data, 'Kurze Platte').rows.length, 0);
});
