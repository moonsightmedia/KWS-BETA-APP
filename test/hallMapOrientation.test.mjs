import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/hallMapOrientation.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
const { getHallMapDisplayGeometry, toHallMapDisplayPoint } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('only mobile landscape maps swap display dimensions', () => {
  assert.deepEqual(getHallMapDisplayGeometry(735, 466, true), { width: 466, height: 735, rotateClockwise: true });
  assert.deepEqual(getHallMapDisplayGeometry(735, 466, false), { width: 735, height: 466, rotateClockwise: false });
  assert.deepEqual(getHallMapDisplayGeometry(466, 735, true), { width: 466, height: 735, rotateClockwise: false });
  assert.deepEqual(getHallMapDisplayGeometry(466, 466, true), { width: 466, height: 466, rotateClockwise: false });
});

test('clockwise display rotation maps all four corners and a label consistently', () => {
  const input = Object.freeze({ x: 20, y: 30 });
  assert.deepEqual(toHallMapDisplayPoint(input, true), { x: 70, y: 20 });
  assert.deepEqual(input, { x: 20, y: 30 });
  assert.deepEqual(toHallMapDisplayPoint(input, false), input);
  for (const [point, expected] of [
    [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    [{ x: 100, y: 0 }, { x: 100, y: 100 }],
    [{ x: 100, y: 100 }, { x: 0, y: 100 }],
    [{ x: 0, y: 100 }, { x: 0, y: 0 }],
  ]) assert.deepEqual(toHallMapDisplayPoint(point, true), expected);
});

test('rotation preserves real-space distances, polygon order and source points', () => {
  const width = 735, height = 466;
  const a = Object.freeze({ x: 17, y: 82 });
  const b = Object.freeze({ x: 65, y: 30 });
  const turnedA = toHallMapDisplayPoint(a, true), turnedB = toHallMapDisplayPoint(b, true);
  const originalDistance = Math.hypot((a.x - b.x) * width / 100, (a.y - b.y) * height / 100);
  const rotatedDistance = Math.hypot((turnedA.x - turnedB.x) * height / 100, (turnedA.y - turnedB.y) * width / 100);
  assert.ok(Math.abs(originalDistance - rotatedDistance) < 1e-9);
  const points = Object.freeze([a, b]);
  assert.deepEqual(points.map(point => toHallMapDisplayPoint(point, true)), [turnedA, turnedB]);
  assert.deepEqual(points, [{ x: 17, y: 82 }, { x: 65, y: 30 }]);
});
