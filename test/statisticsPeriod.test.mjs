import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const compile = source => ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleUrl = source => 'data:text/javascript;base64,'+Buffer.from(compile(source)).toString('base64');
const progressUrl = moduleUrl(await readFile(new URL('../src/lib/personalProgress.ts',import.meta.url),'utf8'));
const periodSource = (await readFile(new URL('../src/lib/statisticsPeriod.ts',import.meta.url),'utf8')).replace(/['"]\.\/personalProgress['"]/,JSON.stringify(progressUrl));
const {resolveStatisticsPeriod,rangeDayCount,shiftLocalDay,validStatisticsRange} = await import(moduleUrl(periodSource));
const {buildPersonalProgress} = await import(progressUrl);
const now = new Date(2026,9,19,12);
const resolve = query => resolveStatisticsPeriod(new URLSearchParams(query),now);
test('default and historical windows contain exactly seven inclusive local days',()=>{
 assert.deepEqual(resolve(''),{period:'7',from:'2026-10-13',to:'2026-10-19',days:7,invalid:false});
 assert.deepEqual(resolve('period=7&end=2026-10-12'),{period:'7',from:'2026-10-06',to:'2026-10-12',days:7,invalid:false});
 assert.equal(resolve('period=30').from,'2026-09-20');
 assert.equal(resolve('period=all').from,null);
});
test('custom windows count both boundaries, including single days, month and DST changes',()=>{
 assert.equal(resolve('period=custom&from=2026-09-30&to=2026-10-19').days,20);
 assert.equal(resolve('period=custom&from=2026-10-19&to=2026-10-19').days,1);
 for(const [start,end,days] of [['2026-03-28','2026-03-30',3],['2026-10-24','2026-10-26',3],['2024-02-28','2024-03-01',3]])assert.equal(rangeDayCount(start,end),days);
 assert.equal(shiftLocalDay('2026-10-26',-7),'2026-10-19');
 assert.equal(shiftLocalDay('2026-03-30',-7),'2026-03-23');
});
test('invalid, reversed, missing and future dates fall back explicitly instead of showing false empty data',()=>{
 for(const query of ['period=custom','period=custom&from=2026-10-20&to=2026-10-19','period=custom&from=2026-02-30&to=2026-10-19','period=custom&from=2026-10-18&to=2026-10-20','period=7&end=garbage','period=7&end=2026-10-20']){
  assert.equal(resolve(query).invalid,true,query);assert.equal(resolve(query).from,'2026-10-13');
 }
 assert.equal(validStatisticsRange('2026-10-01','2026-10-19','2026-10-19'),true);
});
test('selected dates bound all activity, deduplicate tops, retain attempts, and exclude undated legacy tops',()=>{
 const entries=['a','b','c','legacy'].map(id=>({boulder:{id,difficulty:4},tick:{boulder_id:id,status:'top'}}));
 const row=(id,day,result='top',attempts=2)=>({id,boulder_id:id==='repeat'?'a':id,session_date:day,result,attempt_count:attempts,updated_at:day});
 const rows=[row('b','2026-09-29'),row('a','2026-09-30'),row('repeat','2026-10-02'),row('c','2026-10-19','flash',1),row('later','2026-10-20')];
 const summary=buildPersonalProgress(entries,rows,{now,from:'2026-09-30',to:'2026-10-19'});
 assert.equal(summary.tops,2);assert.equal(summary.flashes,1);assert.equal(summary.days,3);assert.equal(summary.attempts,5);assert.equal(summary.legacySuccesses,0);
 assert.deepEqual(summary.topsByDate,[{date:'2026-09-30',tops:1},{date:'2026-10-19',tops:1}]);
 const earlier=buildPersonalProgress(entries,rows,{now,from:'2026-09-29',to:'2026-09-30'});
 assert.equal(earlier.tops,2);assert.equal(earlier.days,2);assert.equal(earlier.flashes,0);
 assert.equal(buildPersonalProgress(entries,rows,{now}).tops,4);
});
