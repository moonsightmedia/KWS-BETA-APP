import {test,expect,type Page} from '@playwright/test';
const url='/test/fixtures/thumbnail-setter.html?state=hierarchy';
const output='output/thumbnail-setter';
async function open(page:Page,focus=false,fail=false,confirm=true){
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.route('**/qa-thumbnail/api/analyze',async route=>{
  if(fail){await route.fulfill({status:503,json:{error:'Isolierter Dienstfehler'}});return;}
  const body=route.request().postDataJSON();
  const candidates=body.point?[{id:'manual',polygon:[[140,190],[190,190],[190,245],[140,245]],box:[140,190,50,55],area:2750,source:'point_correction'}]:[
   {id:'one',polygon:[[40,70],[120,70],[120,135],[40,135]],box:[40,70,80,65],area:5200,source:'automatic'},
   {id:'two',polygon:[[210,290],[300,290],[300,360],[210,360]],box:[210,290,90,70],area:6300,source:'automatic'},
  ];
  const raw=Buffer.from(body.image,'base64'),hash=await import('node:crypto').then(c=>c.createHash('sha256').update(raw).digest('hex'));
  await route.fulfill({json:{version:'isolated-synthetic-v1',image_hash:hash,image:`data:image/png;base64,${body.image}`,width:360,height:480,candidates,selected:body.point?['manual']:['one','two']}});
 });
 await page.goto(url+(focus?'&focus':''));await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('[data-thumbnail-focus]')).toBeVisible();
 if(!fail)await expect(page.locator('[data-thumbnail-focus]')).toHaveAttribute('data-selected-count','2');
 if(!fail&&confirm)await page.getByRole('button',{name:'Vorschau bestätigen',exact:true}).click();
}
async function state(page:Page){return JSON.parse(await page.locator('[data-fixture-state]').textContent()||'{}');}
async function point(page:Page,x:number,y:number){const canvas=page.locator('[data-thumbnail-focus] canvas');const rect=(await canvas.boundingBox())!;await canvas.click({position:{x:rect.width*x,y:rect.height*y}});}

for(const width of [375,768,1280,1920])test(`integrated thumbnail editor and portrait map at ${width}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:1000});await open(page,false,false,false);
 const focus=page.locator('[data-thumbnail-focus]');
 expect(await page.getByRole('heading',{name:'Farbe',exact:true}).evaluate(e=>Boolean(e.compareDocumentPosition(document.querySelector('[data-thumbnail-focus]')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 await focus.scrollIntoViewIfNeeded();await page.waitForTimeout(300);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await page.screenshot({path:`${output}/loop1-editor-${width}.png`,animations:'disabled'});
 await page.getByRole('button',{name:'Griffe antippen',exact:true}).click();
 await point(page,.22,.21);await expect(focus).toHaveAttribute('data-selected-count','1');
 await page.getByRole('button',{name:'Rückgängig',exact:true}).click();await expect(focus).toHaveAttribute('data-selected-count','2');
 await focus.scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/loop2-editor-${width}.png`,animations:'disabled'});
 await page.getByRole('button',{name:'Karte',exact:true}).click();
 const map=page.locator('svg[data-map-orientation]');await expect(map).toHaveAttribute('data-map-orientation','portrait');await map.scrollIntoViewIfNeeded();
 const marker=page.locator('[data-sector-marker-group]').first();await marker.focus();await page.keyboard.press('Enter');
 await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(1);
 await page.screenshot({path:`${output}/map-${width}.png`,animations:'disabled'});
 expect(errors).toEqual([]);
});

test('multiple selections, point correction, undo and original fallback',async({page})=>{
 await open(page,true);const focus=page.locator('[data-thumbnail-focus]');await page.getByRole('button',{name:'Griffe antippen',exact:true}).click();
 await point(page,.22,.21);await expect(focus).toHaveAttribute('data-selected-count','1');
 await point(page,.70,.68);await expect(focus).toHaveAttribute('data-selected-count','0');expect((await state(page)).original).toBe(true);
 await point(page,.46,.45);await expect(focus).toHaveAttribute('data-selected-count','1');
 await page.getByRole('button',{name:'Rückgängig',exact:true}).click();await expect(focus).toHaveAttribute('data-selected-count','0');
 await page.getByRole('button',{name:'Vorschau-Optionen'}).click();await page.getByRole('menuitem',{name:'Original verwenden',exact:true}).click();
 expect((await state(page)).original).toBe(true);await page.getByRole('button',{name:'Test speichern'}).click();await expect(page.locator('[data-fixture-result]')).toHaveText('Original gespeichert');
});

test('unsupported color permits local contour and incomplete contour blocks saving',async({page})=>{
 await open(page,true);await page.getByRole('button',{name:'Farbe wechseln'}).click();
 await page.getByRole('button',{name:'Griffe antippen',exact:true}).click();await page.getByRole('button',{name:'Kontur nachzeichnen',exact:true}).click();
 await expect(page.getByRole('button',{name:'Test speichern'})).toBeDisabled();
 await point(page,.05,.10);await point(page,.90,.10);await expect(page.getByRole('button',{name:'Kontur übernehmen'})).toBeDisabled();
 await point(page,.90,.50);await page.getByRole('button',{name:'Punkt zurück'}).click();await expect(page.getByRole('button',{name:'Kontur übernehmen'})).toBeDisabled();
 await point(page,.90,.50);await page.getByRole('button',{name:'Kontur übernehmen'}).click();
 await expect(page.locator('[data-thumbnail-focus]')).toHaveAttribute('data-selected-count','1');expect((await state(page)).original).toBe(true);
 await page.getByRole('button',{name:'Vorschau bestätigen',exact:true}).click();expect((await state(page)).original).toBe(false);
 await page.getByRole('button',{name:'Rückgängig',exact:true}).click();expect((await state(page)).original).toBe(true);
});

test('failed detector retains original and manual contour stays available',async({page})=>{
 await open(page,true,true);await expect(page.getByRole('alert')).toContainText('Isolierter Dienstfehler');
 await expect(page.getByRole('button',{name:'Test speichern'})).toBeEnabled();expect((await state(page)).original).toBe(true);
 await page.getByRole('button',{name:'Griffe antippen',exact:true}).click();await page.getByRole('button',{name:'Kontur nachzeichnen',exact:true}).click();
 await point(page,.1,.1);await point(page,.3,.1);await point(page,.3,.3);await page.getByRole('button',{name:'Kontur übernehmen'}).click();
 await expect(page.locator('[data-thumbnail-focus]')).toHaveAttribute('data-selected-count','1');
});

test('volume mode invalidates focus and cannot reactivate a focused thumbnail',async({page})=>{
 await open(page,true);expect((await state(page)).original).toBe(false);await page.getByRole('button',{name:'Volumen wechseln'}).click();
 await expect(page.locator('[data-thumbnail-focus]')).toHaveAttribute('data-output-mode','original');
 await expect(page.getByRole('button',{name:'Griffe antippen',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Rückgängig',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Vorschau-Optionen'}).click();await expect(page.getByRole('menuitem',{name:'Automatik zurücksetzen'})).toHaveAttribute('aria-disabled','true');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Test speichern'}).click();await expect(page.locator('[data-fixture-result]')).toHaveText('Original gespeichert');
});

test('real editor blocks an unfinished contour and comparison does not choose original',async({page})=>{
 await open(page);const focus=page.locator('[data-thumbnail-focus]');
 await page.getByRole('button',{name:'Vorschau-Optionen'}).click();await page.getByRole('menuitem',{name:'Original',exact:true}).click();
 await expect(focus.getByRole('status')).toHaveText('Originalvergleich');expect((await state(page)).original).toBe(false);
 await page.getByRole('button',{name:'Griffe antippen',exact:true}).click();await page.getByRole('button',{name:'Kontur nachzeichnen',exact:true}).click();
 const submit=page.getByRole('button',{name:'Griffvorschau läuft …',exact:true});await expect(submit).toBeDisabled();
 await point(page,.12,.12);await point(page,.32,.12);await expect(page.getByRole('button',{name:'Kontur übernehmen'})).toBeDisabled();
 await page.getByRole('button',{name:'Zeichnen abbrechen'}).click();
 await expect(page.getByRole('button',{name:'Zum Stapel hinzufügen',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Zum Stapel hinzufügen',exact:true}).click();await expect(page.locator('[data-fixture-result]')).toHaveText('Fokus gespeichert: 2');
});

test('creation dialog requires inline confirmation and invalidates it after a correction',async({page})=>{
 await open(page,false,false,false);
 const submit=page.getByRole('button',{name:'Zum Stapel hinzufügen',exact:true});
 await expect(submit).toBeDisabled();expect((await state(page)).original).toBe(true);
 await page.getByRole('button',{name:'Vorschau bestätigen',exact:true}).click();
 await expect(submit).toBeEnabled();expect((await state(page)).original).toBe(false);
 await expect(page.getByRole('button',{name:'Vorschau bestätigt',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Griffe antippen',exact:true}).click();await point(page,.22,.21);
 await expect(submit).toBeDisabled();expect((await state(page)).original).toBe(true);
 await page.getByRole('button',{name:'Vorschau bestätigen',exact:true}).click();await submit.click();
 await expect(page.locator('[data-fixture-result]')).toHaveText('Fokus gespeichert: 1');
 await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('creation dialog can explicitly keep the original without a separate review page',async({page})=>{
 await open(page,false,false,false);const submit=page.getByRole('button',{name:'Zum Stapel hinzufügen',exact:true});
 await expect(submit).toBeDisabled();await page.getByRole('button',{name:'Original behalten',exact:true}).click();
 await expect(submit).toBeEnabled();await submit.click();
 await expect(page.locator('[data-fixture-result]')).toHaveText('Original gespeichert');
 await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('undo and returning to an earlier route color do not reuse an old confirmation',async({page})=>{
 await open(page,true);const submit=page.getByRole('button',{name:'Test speichern',exact:true});
 await page.getByRole('button',{name:'Farbe wechseln',exact:true}).click();
 await page.getByRole('button',{name:'Farbe wechseln',exact:true}).click();
 await expect(submit).toBeDisabled();expect((await state(page)).original).toBe(true);
 await page.getByRole('button',{name:'Vorschau bestätigen',exact:true}).click();
 await page.getByRole('button',{name:'Griffe antippen',exact:true}).click();await point(page,.22,.21);
 await page.getByRole('button',{name:'Rückgängig',exact:true}).click();
 await expect(submit).toBeDisabled();expect((await state(page)).original).toBe(true);
 await page.getByRole('button',{name:'Vorschau bestätigen',exact:true}).click();await submit.click();
 await expect(page.locator('[data-fixture-result]')).toHaveText('Fokus gespeichert: 2');
});
