import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const output='test-results/personal-progress-20260915';
const phase=process.env.KWS_PERSONAL_PHASE || 'after';
test.use({trace:'off',video:'off'});

test('comparison images resolve for every view and viewport',async({page})=>{
  test.skip(!existsSync(`${output}/comparison.html`), 'Local comparison artifacts are optional and not committed.');
  await page.goto('/test-results/personal-progress-20260915/comparison.html');
  for(const width of ['375','768','1280','1920']) {
    await page.locator('#width').selectOption(width);
    for(const view of ['statistics','projects','saved','home','404','error','report']) {
      await page.locator('#view').selectOption(view);
      await expect.poll(()=>page.locator('img:visible').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
    }
  }
});
async function open(page:Page, route='/statistics', extra='', beforeNavigate?: () => Promise<void>) {
  await page.clock.setFixedTime(new Date('2026-09-15T12:00:00Z'));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  for(const hook of ['useAuth','useBoulders','useSectors','useColors', ...(extra.includes('realTracking') ? [] : ['useBoulderCommunity']), 'useSectorSchedule','useHasRole','useIsAdmin'])
    await page.route(`**/src/hooks/${hook}.ts*`,r=>r.fulfill({contentType:'application/javascript',body:"export * from '/test/fixtures/personal-hooks.ts';"}));
  await page.route('**/src/hooks/useNotifications.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const useUnreadCount=()=>({data:0});export const useNotifications=()=>({data:[]});export const useMarkAsRead=()=>({mutate(){}});export const useMarkAllAsRead=useMarkAsRead;'}));
  await page.route('**/src/hooks/usePreloadBoulderThumbnails.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const usePreloadBoulderThumbnails=()=>{};'}));
  await page.route('**/src/utils/feedbackUtils.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const reportError=async()=>({success:!location.search.includes("reportFail")});'}));
  await page.route('**/src/utils/sentry.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const captureSentryException=()=>{};'}));
  await page.route('**/src/lib/profileCompat.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const fetchProfileRecord=async()=>({first_name:"Alex"});'}));
  await beforeNavigate?.();
  await page.goto(`/test/fixtures/personal-workspace.html?route=${encodeURIComponent(route)}&${extra}`);
  await page.evaluate(()=>document.fonts.ready);await mkdir(output,{recursive:true});
}
for(const width of [375,768,1280,1920]) test(`visual personal workspace ${width}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:1000});await open(page);
  await expect(page.getByRole('heading',{name:'Statistiken',exact:true})).toBeVisible();
  await page.screenshot({path:`${output}/${phase}-statistics-${width}.png`,fullPage:true,animations:'disabled'});
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
});

test('real personal hooks paginate and only patch the requested marker, scoped to the signed-in owner', async ({page}) => {
  const ticks=Array.from({length:24},(_,i)=>({id:`tick-${String(i).padStart(3,'0')}`,boulder_id:`b-${String(i).padStart(3,'0')}`,user_id:'personal-user',status:i<14?'top':'attempted',attempt_count:i<14?2:0,is_project:i>=14,is_favorite:true,note:'Notiz bleibt',created_at:'2026-09-01',updated_at:'2026-09-15'}));
  const sessions=ticks.slice(0,14).map((t,i)=>({id:`session-${String(i).padStart(3,'0')}`,boulder_id:t.boulder_id,user_id:t.user_id,session_date:'2026-09-15',result:'top',attempt_count:2,note:null,created_at:'2026-09-15',updated_at:'2026-09-15'}));
  const metadata=ticks.map((t,i)=>({id:t.boulder_id,name:`Testboulder ${i}`,color:'Grün',difficulty:4,status:'haengt',created_at:'2026-09-01',thumbnail_url:null}));
  const patches:unknown[]=[];let tickPages=0;let failPatch=false;
  await open(page,'/statistics?period=all','realTracking',async()=>{
    await page.route('**/rest/v1/**',async r=>{
      const q=new URL(r.request().url()).searchParams;const table=new URL(r.request().url()).pathname.split('/').pop();
      if(table==='boulder_ticks' || table==='boulder_tracking_sessions') expect(q.get('user_id')).toBe('eq.personal-user');
      if(r.request().method()==='PATCH') {
        patches.push(r.request().postDataJSON());
        expect(r.request().postDataJSON()).toEqual({is_project:false});expect(q.get('is_project')).toBe('eq.true');
        if(failPatch) return r.fulfill({status:403,json:{message:'isolated denied'}});
        const row=ticks.find(t=>t.id===q.get('id')?.slice(3))!;row.is_project=false;
        return r.fulfill({json:[row]});
      }
      if(table==='boulder_ticks') tickPages++;
      if(table==='boulders') {
        const ids=q.get('id')!.slice(4,-1).split(',');const cursor=q.get('and')?.slice(7,-1)??'';
        return r.fulfill({json:metadata.filter(b=>ids.includes(b.id)&&b.id>cursor).slice(0,6)});
      }
      const rows=table==='boulder_ticks'?ticks:table==='boulder_tracking_sessions'?sessions:[];
      return r.fulfill({json:rows.filter(t=>!q.has('id')||t.id>q.get('id')!.slice(3)).slice(0,5)});
    });
  });
  await expect(page.locator('[data-metric="tops"]')).toHaveText('14');
  await expect(page.locator('[data-metric="days"]')).toHaveText('1');expect(tickPages).toBeGreaterThan(4);
  await page.getByRole('button',{name:'Meine Boulder',exact:true}).click();
  await expect(page.getByRole('button',{name:'Projekte · 10',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Projektmarkierung entfernen:/}).first().click();
  await expect(page.getByRole('button',{name:'Projekte · 9',exact:true})).toBeVisible();expect(patches).toHaveLength(1);
  expect(ticks.every(t=>t.is_favorite&&t.note==='Notiz bleibt')).toBe(true);
  failPatch=true;await page.getByRole('button',{name:/Projektmarkierung entfernen:/}).first().click();
  await expect(page.getByRole('alert')).toContainText('nicht entfernt');await expect(page.getByRole('button',{name:'Projekte · 9',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Fortschritt',exact:true}).click();await expect(page.locator('[data-metric="tops"]')).toHaveText('14');
});

for (const width of [375,768,1280,1920]) test(`collection, Home and error layouts ${width}`, async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:900}); await open(page);
  await page.getByRole('button',{name:'Meine Boulder',exact:true}).click();
  await expect(page.getByRole('button',{name:'Projekte · 8',exact:true})).toBeVisible();
  await expect(page.getByText('5 Boulder an der Wand',{exact:true})).toBeVisible();
  await page.screenshot({path:`${output}/${phase}-projects-${width}.png`,fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Gespeichert · 18',exact:true}).click();
  await page.getByRole('group',{name:'Wandstatus'}).getByRole('button',{name:'Alle',exact:true}).click();
  await expect(page.getByText('18 Boulder',{exact:true})).toBeVisible();
  await page.getByRole('textbox',{name:'In meinen Bouldern suchen'}).fill('Darstellung 32');
  await expect(page.getByText('1 Boulder',{exact:true})).toBeVisible();
  await expect(page.getByText('Grad ? · Abgeschraubt')).toBeVisible();
  await page.screenshot({path:`${output}/${phase}-saved-${width}.png`,fullPage:true,animations:'disabled'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  await open(page,'/');
  await expect(page.getByRole('heading',{name:'Letzte 7 Tage'})).toBeVisible();
  await expect(page.getByText('16 Boulder geschafft',{exact:true})).toBeVisible();
  await page.screenshot({path:`${output}/${phase}-home-${width}.png`,fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Projekte',exact:true}).click();
  await expect(page.getByRole('button',{name:'Projekte · 8',exact:true})).toBeVisible();
  await open(page,'/unbekannte-seite');
  await expect(page.getByRole('heading',{name:'Hier geht’s nicht weiter.'})).toBeVisible();
  await page.screenshot({path:`${output}/${phase}-404-${width}.png`,fullPage:true,animations:'disabled'});
  await page.getByRole('link',{name:'Zur Startseite',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Letzte 7 Tage'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('profile summary shares the same counts; controls work by keyboard with reduced motion', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});await open(page,'/profile');
  await expect(page.getByText('12',{exact:true})).toBeVisible();await expect(page.getByText('Klettertage',{exact:true})).toBeVisible();
  await page.getByRole('button').filter({hasText:'Klettertage'}).click();
  await expect(page.getByRole('button',{name:'Gesamt',exact:true})).toHaveAttribute('aria-pressed','true');
  const period=page.getByRole('button',{name:'7 Tage',exact:true});await period.focus();await page.keyboard.press('Space');
  await expect(period).toHaveAttribute('aria-pressed','true');
  const grade=page.getByRole('button',{name:/^Grad 1:/});await grade.focus();await page.keyboard.press('Enter');
  await expect(grade).toHaveAttribute('aria-pressed','true');
  expect((await grade.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await open(page,'/statistics?view=collection');
  const remove=page.getByRole('button',{name:/Projektmarkierung entfernen:/}).first();expect((await remove.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('periods, grade filter, daily details and older history', async ({page}) => {
  await open(page); await expect(page.locator('[data-metric="tops"]')).toHaveText('16');
  await expect(page.locator('[data-metric="days"]')).toHaveText('12');
  await page.getByRole('button',{name:'7 Tage',exact:true}).click();
  await expect(page.locator('[data-metric="tops"]')).toHaveText('11');
  await expect(page.locator('[data-metric="days"]')).toHaveText('7');
  await page.getByRole('button',{name:/^Grad 1:/}).click();
  await expect(page.locator('[data-metric="tops"]')).toHaveText('1');
  await expect(page.locator('[data-metric="highest"]')).toHaveText('1');
  await page.getByRole('button',{name:'Gradfilter entfernen'}).click();
  await page.getByRole('button',{name:/Ältere Klettertage anzeigen/}).click();
  await expect(page.locator('details').filter({has:page.getByText('9. Sept.',{exact:true})})).toBeVisible();
  await page.locator('summary').filter({hasText:'15. Sept.'}).click();
  await expect(page.getByRole('link',{name:'Grüne Kante 1',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Grüne Kante 1',exact:true}).click();
  await expect(page.getByText('Boulder-Detail geöffnet')).toBeVisible();
});

test('removing a marker does not delete progress; failures stay visible', async ({page}) => {
  await open(page,'/statistics?view=collection&collection=projects');
  const remove=page.getByRole('button',{name:/^Projektmarkierung entfernen:/});
  await expect(remove).toHaveCount(5);await remove.first().click();await expect(remove).toHaveCount(4);
  await page.getByRole('button',{name:'Fortschritt',exact:true}).click();await expect(page.locator('[data-metric="tops"]')).toHaveText('16');
  await open(page,'/statistics?view=collection&collection=saved','writeError');
  const saved=page.getByRole('button',{name:/^Speicherung entfernen:/});const count=await saved.count();
  await saved.first().click();await expect(page.getByRole('alert')).toContainText('nicht entfernt');await expect(saved).toHaveCount(count);
});

test('loading, legitimate empty and failed personal queries never pretend successful zero data', async ({page}) => {
  await open(page,'/statistics','state=loading');await expect(page.getByText('Dein Fortschritt wird geladen …')).toBeVisible();await expect(page.locator('[data-metric]')).toHaveCount(0);
  await open(page,'/statistics','state=empty');await expect(page.locator('[data-metric="tops"]')).toHaveText('0');
  await expect(page.getByText('Noch keine Klettereinträge in dieser Auswahl.')).toBeVisible();
  await page.screenshot({path:`${output}/empty-statistics.png`,fullPage:true});
  await open(page,'/statistics','state=error');await expect(page.getByText('Fortschritt gerade nicht verfügbar')).toBeVisible();await expect(page.locator('[data-metric]')).toHaveCount(0);
  await page.getByRole('button',{name:'Erneut versuchen',exact:true}).click();await expect(page.locator('[data-metric="tops"]')).toHaveText('16');
  await open(page,'/','state=error');await expect(page.getByText('Fortschritt gerade nicht verfügbar')).toBeVisible();await expect(page.getByText('0 Boulder geschafft',{exact:true})).toHaveCount(0);
  await open(page,'/boulders?show=saved','state=error');await expect(page.getByText('Fortschritt gerade nicht verfügbar')).toBeVisible();
});

for(const width of [375,1280]) test(`error boundary retains description and does not reset itself ${width}`, async ({page}) => {
  await page.setViewportSize({width,height:850});await open(page,'/test-error','reportFail');
  await page.getByRole('button',{name:'Testfehler auslösen'}).click();
  await expect(page.getByRole('heading',{name:'Kurz den Halt verloren.'})).toBeVisible();
  await page.screenshot({path:`${output}/${phase}-error-${width}.png`});
  await page.getByRole('button',{name:'Fehler beschreiben'}).click();
  await page.getByLabel('Deine Beschreibung',{exact:true}).fill('Beim Öffnen meiner Projekte.');
  await page.getByRole('button',{name:'Beschreibung senden'}).click();
  await expect(page.getByRole('alert')).toContainText('nicht bestätigt');
  await page.getByRole('button',{name:'Schließen',exact:true}).click();
  await page.getByRole('button',{name:'Fehler beschreiben'}).click();
  await expect(page.getByLabel('Deine Beschreibung',{exact:true})).toHaveValue('Beim Öffnen meiner Projekte.');
  await page.clock.install();await page.clock.fastForward(31000);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({path:`${output}/${phase}-report-${width}.png`,animations:'disabled'});
  await page.getByRole('button',{name:'Schließen',exact:true}).click();
  await page.getByRole('button',{name:'Erneut versuchen',exact:true}).click();await expect(page.getByRole('button',{name:'Testfehler auslösen'})).toBeVisible();
});
