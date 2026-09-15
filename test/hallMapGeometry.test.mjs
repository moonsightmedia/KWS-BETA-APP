import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/hallMapGeometry.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
const { insertPolygonPoint } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const square = [{x:10,y:10},{x:90,y:10},{x:90,y:90},{x:10,y:90}];
test('inserts at the tapped edge, preserving existing point order and input', () => {
  const p = {x:40,y:12};
  assert.deepEqual(insertPolygonPoint(square,p,1471,930),[square[0],p,...square.slice(1)]);
  assert.equal(square.length,4);
});
test('handles closing edge and unfinished drawing', () => {
  const p = {x:12,y:40};
  assert.deepEqual(insertPolygonPoint(square,p,1471,930),[...square,p]);
  assert.deepEqual(insertPolygonPoint([],p,1471,930),[p]);
});
test('uses real map aspect ratio, including duplicate points', () => {
  const p = {x:20,y:30};
  assert.equal(insertPolygonPoint(square,p,4000,100)[1],p);
  const result = insertPolygonPoint([square[0],square[0],...square.slice(1)],p,1471,930);
  assert.equal(result.length,6);
  assert.ok(result.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
});
