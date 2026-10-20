import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const compile = async file => ts.transpileModule(await readFile(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const uri = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const areas = uri(await compile('../src/lib/sectorAreas.ts'));
const reset = uri((await compile('../src/lib/resetSchedule.ts')).replace("'./sectorAreas'", JSON.stringify(areas)));
const { buildResetSequence, latestNewBoulderSectors } = await import(uri((await compile('../src/lib/hallMapStatus.ts')).replace("'./resetSchedule'", JSON.stringify(reset))));
const now = new Date('2026-10-20T12:00:00Z');
const boulder = (sectorId, createdAt, status = 'haengt', sector2Id) => ({ sectorId, sector2Id, createdAt: new Date(createdAt), status });
test('map sequence orders real instants, stable ties and one earliest appointment per logical sector', () => {
  const appointment = (when, sectors) => ({ when: new Date(when), day: when.slice(0, 10), sectors });
  const input = [appointment('2026-10-26T09:00:00Z', [{ name: 'Bug A', ids: ['a'] }]), appointment('2026-10-23T09:00:00Z', [{ name: 'Grotte B', ids: ['g'] }, { name: 'Bug A', ids: ['a', 'a2'] }]), appointment('2026-10-29T09:00:00Z', [{ name: 'Kurze Platte', ids: ['k'] }])];
  const before = JSON.stringify(input);
  const result = buildResetSequence(input);
  assert.deepEqual(result.map(({ number, name, ids }) => ({ number, name, ids })), [
    { number: 1, name: 'Bug A', ids: ['a', 'a2'] }, { number: 2, name: 'Grotte B', ids: ['g'] }, { number: 3, name: 'Kurze Platte', ids: ['k'] },
  ]);
  assert.equal(result[0].when.getTime(), result[1].when.getTime());
  assert.equal(JSON.stringify(input), before);
});
test('NEU includes latest Berlin day ties, physical secondary sectors, not older active dates', () => {
  const result = latestNewBoulderSectors([
    boulder('a', '2026-10-19T22:30:00Z'), boulder('b', '2026-10-20T10:00:00Z', 'haengt', 'c'),
    boulder('old', '2026-10-19T14:00:00Z'), boulder('gone', '2026-10-20T11:00:00Z', 'abgeschraubt'),
    boulder('future', '2026-10-26T10:00:00Z'), boulder('invalid', 'invalid'),
  ], now);
  assert.equal(result.day, '2026-10-20');
  assert.deepEqual(result.ids, ['a', 'b', 'c']);
});
test('no current valid setup data means no badge; stale dates never perpetually read NEU', () => {
  for (const input of [[], [boulder('a', '2026-10-12T12:00:00Z')], [boulder('a', '2026-10-21T12:00:00Z')], [boulder(undefined, '2026-10-20T12:00:00Z')]]) {
    assert.deepEqual(latestNewBoulderSectors(input, now), { day: undefined, ids: [] });
  }
});
