import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/sectorAreas.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {resolveSectorArea,LEGACY_SECTOR_AREA_MAPPING}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const cases=JSON.parse(await readFile(new URL('./fixtures/notification-sector-labels.json',import.meta.url),'utf8'));
test('database parity cases cover every legacy sector and match the current app resolver',()=>{
  for(const mapping of LEGACY_SECTOR_AREA_MAPPING) assert.ok(cases.some(c=>c.source.name===mapping.legacyName&&!c.source.area));
  for(const c of cases)assert.equal(resolveSectorArea(c.source).publicName,c.expected,JSON.stringify(c.source));
});
