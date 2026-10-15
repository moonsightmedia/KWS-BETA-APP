import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('./public/ops/dashboard.js',import.meta.url),'utf8');
const html=readFileSync(new URL('./public/index.html',import.meta.url),'utf8');
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
function element(){return {textContent:'',className:'',hidden:false,disabled:false,children:[],
  append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items},
  addEventListener(type,callback){this[type]=callback}}}
function snapshot(overrides={}) {
  return {schema_version:1,generated_at:new Date().toISOString(),errors:[],
    database:{users:44,boulders:104,sectors:19,storage_objects:2389,storage_bytes:440125701,public_tables:35,database_bytes:32943251,latest_boulder_change:'2026-09-13T19:13:46Z'},
    services:[{label:'Datenbank',running:true,healthy:true}],
    server:{cpu_percent:3,ram_used_bytes:2,ram_total_bytes:16,disk_used_bytes:25,disk_total_bytes:200,disk_free_bytes:175,cpu_cores:4,uptime_seconds:86400},
    backups:{latest:{created_at:new Date().toISOString(),files_verified:4236,bytes:2724474472},timer_active:true,last_job_result:'success',restore_test:{created_at:'2026-10-09T14:33:59Z',tables_verified:73},independent_location_verified:false},
    videos:{video_files:316,thumbnail_files:0,total_bytes:2018004038,jobs:{}},...overrides};
}
async function page(first) {
  const nodes=Object.fromEntries(ids.map(id=>[id,element()]));
  const fetches=[]; let response=first;
  const context=vm.createContext({document:{getElementById:id=>nodes[id],createElement:element},
    Intl,Date,Number,AbortSignal,setInterval(){},
    fetch:async(...args)=>{fetches.push(args);if(response instanceof Error)throw response;
      return {ok:true,json:async()=>structuredClone(response)}}});
  vm.runInContext(script,context);
  await new Promise(setImmediate);
  return {nodes,fetches,respond(value){response=value},async refresh(){await nodes.refresh.click()}};
}
test('real counts, legitimate zero thumbnails, and off-server gap are visible',async()=>{
  const {nodes,fetches}=await page(snapshot());
  assert.equal(nodes.users.textContent,'44');assert.equal(nodes.storage.textContent,'2.389');
  assert.equal(nodes['thumbnail-count'].textContent,'0');
  assert.match(nodes.uptime.textContent,/1 Tag\./);
  assert.match(nodes.offsite.textContent,/nicht bestätigt/);
  assert.equal(nodes['service-badge'].textContent,'Alle Dienste laufen');
  assert.equal(fetches[0][0],'/ops/status.json');assert.equal(fetches[0][1].credentials,'same-origin');
});
test('first failed load never shows invented zero counts',async()=>{
  const {nodes}=await page(new Error('network-unavailable'));
  assert.equal(nodes.users.textContent,''); // HTML contains a dash, not a fabricated count.
  assert.equal(nodes.notice.hidden,false);assert.match(nodes.notice.textContent,/nicht erreichbar/);
  assert.equal(nodes.refresh.disabled,false);
});
test('failed refresh retains last readings and explicitly labels them',async()=>{
  const app=await page(snapshot());app.respond(new Error('network-unavailable'));await app.refresh();
  assert.equal(app.nodes.users.textContent,'44');assert.match(app.nodes.notice.textContent,/letzten erfolgreichen Abruf/);
  assert.equal(app.nodes.notice.hidden,false);assert.equal(app.nodes.refresh.disabled,false);
});
test('stale snapshot is disclosed even after successful HTTP response',async()=>{
  const {nodes}=await page(snapshot({generated_at:new Date(Date.now()-240000).toISOString()}));
  assert.equal(nodes.notice.hidden,false);assert.match(nodes.notice.textContent,/älter als drei Minuten/);
});
test('partial collection shows unknown sections and no false healthy state',async()=>{
  const {nodes}=await page(snapshot({errors:['database','services','server','backups','videos'],database:null,services:null,server:null,backups:null,videos:null}));
  assert.equal(nodes.users.textContent,'—');assert.equal(nodes['video-count'].textContent,'—');
  assert.equal(nodes['service-badge'].textContent,'Nicht verfügbar');assert.equal(nodes['ram-bar'].hidden,true);
  assert.match(nodes.notice.textContent,/Einzelne Bereiche/);assert.match(nodes.offsite.textContent,/nicht bestätigt/);
});
test('stopped service and overdue backup require attention',async()=>{
  const sample=snapshot();sample.services[0]={label:'Datenbank',running:false,healthy:false};
  sample.backups.latest.created_at=new Date(Date.now()-48*3600000).toISOString();
  const {nodes}=await page(sample);
  assert.equal(nodes['service-badge'].textContent,'Dienst prüfen');
  assert.equal(nodes.services.children[0].children[1].textContent,'Gestoppt');
  assert.equal(nodes['backup-badge'].textContent,'Sicherung prüfen');
});
test('invalid snapshot cannot overwrite a previously valid reading',async()=>{
  const app=await page(snapshot());app.respond({schema_version:999});await app.refresh();
  assert.equal(app.nodes.users.textContent,'44');assert.match(app.nodes.notice.textContent,/fehlgeschlagen/);
});
