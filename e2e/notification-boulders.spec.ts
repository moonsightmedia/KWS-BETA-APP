import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output='test-results/notification-boulders-20261014';
test.use({trace:'off',video:'off'});
async function open(page:Page, start='/', data:Record<string,unknown>={boulder_ids:['b-1','b-5']}, oldBoulders=false) {
  const row={id:'note-batch',user_id:'fixture-setter',type:'boulder_new',title:'Neue Boulder in Bug und Grotte',message:'Zwei neue Linien warten auf dich.',action_url:'/boulders',data,read:false,read_at:null,created_at:'2026-10-14T08:00:00Z'};
  const state={fail:false,delay:false};
  const reads:string[]=[];
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  for(const hook of ['useAuth','useColors','useSectors','useBoulders','useBoulderCommunity','useSectorSchedule','useHallMaps','useHasRole','useIsAdmin']) {
    await page.route(`**/src/hooks/${hook}.ts*`,r=>r.fulfill({contentType:'application/javascript',body:"export * from '/test/fixtures/continuity-hooks.ts';"}));
  }
  await page.route('**/src/contexts/UploadContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:"export {useUpload} from '/test/fixtures/setter-hooks.ts';"}));
  await page.route('**/src/components/boulder/BoulderDetailSections.tsx*',r=>r.fulfill({contentType:'application/javascript',body:"import React from '/node_modules/.vite/deps/react.js';export const BoulderInfoTab=()=>React.createElement('p',null,'Bewertung und Kommentare');export const BoulderTrackTab=()=>null;export const BoulderBetaTab=()=>null;"}));
  await page.route('**/src/integrations/supabase/client.ts*',r=>r.fulfill({contentType:'application/javascript',body:"const c={on(_t,_f,cb){window.notificationEmit=cb;return c},subscribe(){return c}};export const supabase={channel(){return c},removeChannel(){},auth:{getSession:async()=>({data:{session:{access_token:'isolated-test-token',user:{id:'fixture-setter'}}},error:null})}};"}));
  await page.route('**/rest/v1/**',async r=>{
    const url=new URL(r.request().url()),q=url.searchParams;
    if(url.pathname.endsWith('notification_preferences'))return r.fulfill({json:[{user_id:row.user_id,updated_at:'',in_app_enabled:true,push_enabled:false,boulder_new:true,competition_update:true,feedback_reply:true,admin_announcement:true,schedule_reminder:true}]});
    reads.push(url.search);
    if(q.has('id') && r.request().method()==='GET') {
      if(state.delay) await new Promise(resolve=>setTimeout(resolve,600));
      if(state.fail)return r.fulfill({status:503,json:{}});
    }
    const rows=q.get('user_id')==='eq.'+row.user_id && (!q.has('id')||q.get('id')==='eq.'+row.id)?[row]:[];
    if(r.request().method()==='PATCH')Object.assign(row,r.request().postDataJSON());
    return r.fulfill({json:rows,headers:{'content-range':`0-0/${row.read?0:1}`,'access-control-expose-headers':'content-range'}});
  });
  await page.addInitScript(()=>localStorage.setItem('boulder_collapsed_areas_v1',JSON.stringify(['Bug','Grotte'])));
  await page.goto('/test/fixtures/boulder-continuity.html?notify=1&start='+encodeURIComponent(start)+(oldBoulders?'&oldBoulders=1':''));
  return {row,state,reads};
}

for(const width of [375,768,1280,1920]) {
  test(`Ansehen opens exactly the notified Boulders and expands their areas (${width})`,async({page})=>{
    await page.setViewportSize({width,height:900});
    const ctx=await open(page);
    await page.getByRole('button',{name:'Benachrichtigungen',exact:true}).click();
    await expect(page.getByText(ctx.row.title,{exact:true})).toBeVisible();
    await mkdir(output,{recursive:true});
    await page.screenshot({path:`${output}/inbox-${width}.png`,animations:'disabled'});
    await page.getByRole('button',{name:'Ansehen',exact:true}).click();
    await expect(page.getByTestId('route')).toHaveText('/boulders?notification=note-batch');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('2 Boulder aus dieser Mitteilung',{exact:true})).toBeVisible();
    const results=page.locator('#boulder-results');
    await expect(results.getByRole('button',{name:/^Bug/})).toHaveAttribute('aria-expanded','true');
    await expect(results.getByRole('button',{name:/^Grotte/})).toHaveAttribute('aria-expanded','true');
    await expect(results.locator('button').filter({has:page.locator('img')})).toHaveCount(2);
    await expect(results.getByText('Kleine Kante',{exact:true})).toBeVisible();
    await expect(results.getByText('Kleine Kante 6',{exact:true})).toBeVisible();
    await expect(results.getByText('Blauer Horizont',{exact:true})).toHaveCount(0);
    expect(ctx.row.read).toBe(true);
    expect(ctx.reads.filter(s=>new URLSearchParams(s).has('id')).every(s=>new URLSearchParams(s).get('user_id')==='eq.fixture-setter')).toBe(true);
    await page.mouse.move(width-2,500);
    await page.screenshot({path:`${output}/opened-${width}.png`,animations:'disabled'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    await results.locator('button').filter({has:page.locator('img')}).first().click();
    await page.getByRole('button',{name:'Zurück zur Boulderübersicht'}).click();
    await expect(page.getByTestId('route')).toHaveText('/boulders?notification=note-batch');
    await expect(results.locator('button').filter({has:page.locator('img')})).toHaveCount(2);
    await page.getByRole('button',{name:'Mitteilungsfilter entfernen'}).click();
    await expect(page.getByTestId('route')).toHaveText('/boulders');
    await expect(results.locator('button').filter({has:page.locator('img')})).toHaveCount(8);
  });
}

test('cold push URL handles an 800-ID batch with a short link and no 7-day cutoff',async({page})=>{
  const ids=Array.from({length:798},(_,i)=>'removed-'+i).concat(['b-1','b-5']);
  await open(page,'/boulders?notification=note-batch',{boulder_ids:ids},true);
  await expect(page.getByText('2 Boulder aus dieser Mitteilung',{exact:true})).toBeVisible();
  await expect(page.locator('#boulder-results button').filter({has:page.locator('img')})).toHaveCount(2);
  await expect(page.getByTestId('route')).toHaveText('/boulders?notification=note-batch');
});

test('native open event uses the same selected overview and confirms read',async({page})=>{
  const ctx=await open(page);
  await expect.poll(()=>page.evaluate(()=>typeof (window as any).notificationEmit)).toBe('function');
  await page.getByRole('button',{name:'Benachrichtigungen',exact:true}).click();
  await expect(page.getByText(ctx.row.title,{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('kws:notification-open',{detail:{target:'/boulders?notification=note-batch',id:'note-batch'}})));
  await expect(page.getByText('2 Boulder aus dieser Mitteilung',{exact:true})).toBeVisible();
  await expect.poll(()=>ctx.row.read).toBe(true);
});

test('missing/foreign notification shows a recoverable error, never unrelated Boulders',async({page})=>{
  await open(page,'/boulders?notification=foreign-note');
  await expect(page.getByText('Verknüpfte Boulder nicht verfügbar',{exact:true})).toBeVisible();
  await expect(page.locator('#boulder-results')).toHaveCount(0);
  await page.getByRole('button',{name:'Alle Boulder anzeigen'}).click();
  await page.getByRole('button',{name:'Alle Gruppen ausklappen'}).click();
  await expect(page.locator('#boulder-results button').filter({has:page.locator('img')})).toHaveCount(8);
});

test('realtime toast Ansehen opens the exact notification selection',async({page})=>{
  const ctx=await open(page);
  await page.getByRole('button',{name:'Benachrichtigungen',exact:true}).click();
  await expect(page.getByText(ctx.row.title,{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(row=>(window as any).notificationEmit({eventType:'INSERT',new:row}),ctx.row);
  await page.getByRole('button',{name:'Ansehen',exact:true}).click();
  await expect(page.getByText('2 Boulder aus dieser Mitteilung',{exact:true})).toBeVisible();
});

test('legacy single upload opens its area even when saved as collapsed',async({page})=>{
  await open(page,'/boulders?notification=note-batch',{boulder_id:'b-1'});
  await expect(page.getByText('1 Boulder aus dieser Mitteilung',{exact:true})).toBeVisible();
  await expect(page.locator('#boulder-results').getByRole('button',{name:/^Grotte/})).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#boulder-results button').filter({has:page.locator('img')})).toHaveCount(1);
});

test('unavailable/deleted batch stays empty and offers the whole catalog explicitly',async({page})=>{
  await open(page,'/boulders?notification=note-batch',{boulder_ids:['deleted-boulder']});
  await expect(page.getByText(/Keine passenden Boulder mehr an der Wand/)).toBeVisible();
  await expect(page.locator('#boulder-results button').filter({has:page.locator('img')})).toHaveCount(0);
});

test('a failed selection read stays separate from the catalog and retries safely',async({page})=>{
  await page.setViewportSize({width:375,height:900});
  const ctx=await open(page);
  ctx.state.fail=true;
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('kws:notification-open',{detail:{target:'/boulders?notification=note-batch'}})));
  await expect(page.getByText('Verknüpfte Boulder nicht verfügbar',{exact:true})).toBeVisible();
  await expect(page.locator('#boulder-results')).toHaveCount(0);
  await page.screenshot({path:`${output}/loop2-error-375.png`,animations:'disabled'});
  ctx.state.fail=false;
  await page.getByRole('button',{name:'Erneut versuchen'}).click();
  await expect(page.getByText('2 Boulder aus dieser Mitteilung',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Gridansicht'}).click();
  await page.screenshot({path:`${output}/loop2-grid-375.png`,animations:'disabled'});
});

test('delayed notification read never flashes the unfiltered catalog',async({page})=>{
  const ctx=await open(page);
  ctx.state.delay=true;
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('kws:notification-open',{detail:{target:'/boulders?notification=note-batch'}})));
  await expect(page.locator('#boulder-results .animate-pulse').first()).toBeVisible();
  await expect(page.locator('#boulder-results button').filter({has:page.locator('img')})).toHaveCount(0);
  await expect(page.getByText('2 Boulder aus dieser Mitteilung',{exact:true})).toBeVisible();
});
