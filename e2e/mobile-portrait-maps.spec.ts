import {test,expect,type Page} from '@playwright/test';
const output='output/mobile-maps';
async function open(page:Page,path:string){
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto(path);await page.evaluate(()=>document.fonts.ready);
}
async function check(page:Page,name:string,width:number,portrait:boolean){
 const svg=page.locator('svg[data-map-orientation]');await expect(svg).toHaveAttribute('data-map-orientation',portrait?'portrait':'landscape');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await expect(page.getByRole('button',{name:'Karte verschieben',exact:true})).toHaveCount(0);
 await svg.scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/loop1-${name}-${width}.png`,animations:'disabled'});
}
for(const width of [375,768,1280,1920]){
 test(`all map consumers and setter flows at ${width}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:1000});
  for(const route of ['create','edit','status','schedule']){
   await open(page,`/test/fixtures/setter-desktop.html?route=/setter/${route}&state=hierarchy`);
   if(route==='create')await page.getByRole('button',{name:'Boulder hinzufügen',exact:true}).click();
   if(route==='edit')await page.getByRole('button',{name:'Grüne Welle bearbeiten',exact:true}).click();
   if(route==='schedule')await page.getByRole('button',{name:'Neuer Termin',exact:true}).click();
   await page.getByRole('button',{name:route==='status'?'Hallenkarte':'Karte',exact:true}).click();
   await check(page,route,width,route==='status'?width<768:true);
   const marker=page.locator('[data-sector-marker-group]').first();await marker.focus();await page.keyboard.press('Enter');
   await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]').first()).toBeVisible();
   await page.screenshot({path:`${output}/loop2-${route}-${width}.png`,animations:'disabled'});
  }
  for(const [name,url] of [['boulders','/test/fixtures/maps-feedback.html?view=boulders&state=hierarchy'],['reset','/test/fixtures/maps-feedback.html?state=hierarchy'],['admin','/test/fixtures/mobile-map-views.html?state=hierarchy'],['tv','/test/fixtures/mobile-map-views.html?view=tv&state=hierarchy']]){
   await open(page,url);await check(page,name,width,width<768);
   if(name==='admin'){
    if(width<1024)await page.getByRole('button',{name:'Sektoren',exact:true}).click();
    await page.getByRole('button',{name:'Kurze Platte · Felsenmeer',exact:true}).click();
    await expect(page.getByRole('button',{name:'Sektorfläche speichern',exact:true})).toBeVisible();
   }else if(name!=='tv'){
    const marker=page.locator('[data-sector-marker-group]').first();await marker.focus();await page.keyboard.press('Space');
   }
   await page.screenshot({path:`${output}/loop2-${name}-${width}.png`,animations:'disabled'});
  }
  expect(errors).toEqual([]);
 });
}
test('desktop wheel focal zoom, background drag, reset and sector taps',async({page})=>{
 await page.setViewportSize({width:1280,height:1000});await open(page,'/test/fixtures/maps-feedback.html?view=boulders&state=hierarchy');
 const stage=page.locator('[data-map-viewport]'),transform=page.locator('[data-map-transform]');await expect(stage).toBeVisible();
 const box=(await stage.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-240);
 await expect(transform).not.toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
 const before=await transform.getAttribute('style');await page.mouse.move(box.x+8,box.y+8);await page.mouse.down();await page.mouse.move(box.x+80,box.y+48,{steps:8});await page.mouse.up();
 expect(await transform.getAttribute('style')).not.toBe(before);await page.getByRole('button',{name:'Kartenansicht zurücksetzen',exact:true}).click();
 await expect(transform).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
 await page.locator('[data-sector-marker-group]').first().click();await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(1);
});
test('phone native single-finger scroll and two-finger pinch/pan never select a sector',async({browser})=>{
 const context=await browser.newContext({viewport:{width:375,height:900},isMobile:true,hasTouch:true});const page=await context.newPage();
 await open(page,'http://127.0.0.1:5234/test/fixtures/maps-feedback.html?state=hierarchy');
 const stage=page.locator('[data-map-viewport]');await stage.scrollIntoViewIfNeeded();const box=(await stage.boundingBox())!;
 await expect(page.getByRole('button',{name:'Karte vergrößern',exact:true})).not.toBeVisible();
 const cdp=await context.newCDPSession(page);const x=box.x+box.width/2,y=Math.min(620,box.y+box.height/2);
 const touch=async(type:string,points:number[][])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id}))});
 const scroll=await page.evaluate(()=>scrollY);await touch('touchStart',[[x,y]]);for(let i=1;i<=8;i++)await touch('touchMove',[[x,y-i*20]]);await touch('touchEnd',[]);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(scroll);
 await stage.scrollIntoViewIfNeeded();const b=(await stage.boundingBox())!,cy=Math.min(550,b.y+b.height/2),cx=b.x+b.width/2;
 const transform=page.locator('[data-map-transform]');await touch('touchStart',[[cx-30,cy],[cx+30,cy]]);for(let i=1;i<=6;i++)await touch('touchMove',[[cx-30-i*5,cy+i*5],[cx+30+i*5,cy+i*5]]);await touch('touchEnd',[]);
 await expect.poll(()=>transform.getAttribute('style')).not.toContain('scale(1)');await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(0);
 await page.screenshot({path:`${output}/phone-pinch-pan.png`});await context.close();
});
test('mobile rotated drawing edits only the intended original-space point',async({page})=>{
 await page.setViewportSize({width:375,height:900});await open(page,'/test/fixtures/mobile-map-views.html?state=hierarchy');
 await page.getByRole('button',{name:'Sektoren',exact:true}).click();await page.getByRole('button',{name:'Kurze Platte · Felsenmeer',exact:true}).click();
 const svg=page.getByTestId('hall-map-editor');await svg.scrollIntoViewIfNeeded();
 const handles=svg.locator('circle[data-map-handle]');await expect(handles.nth(3)).toBeVisible();
 await handles.nth(3).evaluate(e=>e.scrollIntoView({block:'center'}));
 await expect(page.locator('div.fixed.inset-0[data-state=closed]')).toHaveCount(0);
 await handles.nth(3).hover();
 const point=await handles.nth(3).evaluate((handle:SVGCircleElement)=>{
  const group=handle.closest('svg')!.querySelector(':scope > g') as SVGGElement;
  const x=Number(handle.getAttribute('cx')),y=Number(handle.getAttribute('cy')),matrix=group.getScreenCTM()!;
  const rect=handle.getBoundingClientRect();
  const before={x:rect.x+rect.width/2,y:rect.y+rect.height/2},after={x:before.x+5*matrix.a+5*matrix.c,y:before.y+5*matrix.b+5*matrix.d};
  return {x:before.x,y:before.y,targetX:after.x,targetY:after.y,sourceX:x+5,sourceY:y+5};
 });

 await page.mouse.move(point.x,point.y);await page.mouse.down();await expect(page.getByRole('button',{name:'Punkt entfernen',exact:true})).toBeEnabled();await page.mouse.move(point.targetX,point.targetY,{steps:6});await page.mouse.up();
 const actual=await handles.nth(3).evaluate(e=>({x:Number(e.getAttribute('cx')),y:Number(e.getAttribute('cy'))}));
 expect(actual.x).toBeCloseTo(point.sourceX,0);expect(actual.y).toBeCloseTo(point.sourceY,0);
 await page.getByRole('button',{name:'Sektorfläche speichern',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.hallMapQA.writes.length)).toBe(1);
 const write=await page.evaluate(()=>window.hallMapQA.writes[0]);expect(write.kind).toBe('update-region');
 expect(Object.keys(write.payload as object)).not.toContain('width');expect(Object.keys(write.payload as object)).not.toContain('height');
});
