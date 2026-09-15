import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'test-results/hall-map-function-20260914';
const loop = process.env.KWS_QA_LOOP || 'loop1';
async function openMap(page: Page) {
  await page.route('**/*.supabase.co/**', route => route.abort());
  for (const [name, exports] of [['useHallMaps', '*'], ['useSectors', '{ useSectors }'], ['useAuth', '{ useAuth }']]) {
    await page.route(`**/src/hooks/${name}.tsx*`, route => route.fulfill({ contentType: 'application/javascript', body: `export ${exports} from '/test/fixtures/admin-hallmap-hooks.ts';` }));
  }
  await page.route('**/src/hooks/useIsAdmin.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useIsAdmin=()=>({isAdmin:true,loading:false});' }));
  await page.route('**/src/hooks/useHasRole.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useHasRole=()=>({hasRole:true,loading:false});' }));
  await page.route(/\/src\/components\/admin\/(ColorManagement|SectorManagement|BoulderOperationLogs|FeedbackManagement|PushNotificationTest|UserManagement|MonitoringDashboard)\.tsx(\?.*)?$/,route=>{
    const name=new URL(route.request().url()).pathname.split('/').pop()!.replace('.tsx','');
    return route.fulfill({contentType:'application/javascript',body:`export const ${name}=()=>null;`});
  });
  await page.goto('/test/fixtures/admin-hallmap-shell.html?state=hierarchy');
  await expect(page.getByTestId('hall-map-editor')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function selectSector(page: Page, width: number) {
  if (width < 1024) await page.getByRole('button', { name:'Sektoren',exact:true }).click();
  await page.getByLabel('Sektoren suchen').fill('Felsenmeer');
  await page.getByRole('button',{name:'Bug A · Felsenmeer',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('map-edit-tools')).toContainText('Fläche bearbeiten');
}

for (const width of [375,768,1280,1920]) {
  test(`real Admin layout, wheel scrolling, template and editor at ${width}`,async({page})=>{
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setViewportSize({width,height:667});
    await openMap(page);
    await page.getByRole('button',{name:'Karte vergrößern',exact:true}).click();
    await expect(page.getByRole('button',{name:'Kartenansicht zurücksetzen',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'Karte verschieben',exact:true}).click();
    await expect(page.getByRole('button',{name:'Seitenscrollen aktivieren',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Kartenansicht zurücksetzen',exact:true}).click();
    await mkdir(output,{recursive:true});
    await page.screenshot({path:`${output}/${loop}-overview-${width}.png`,animations:'disabled'});
    await page.getByRole('button',{name:'Zeichenvorlage anzeigen',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('nicht die farbige App-Ansicht');
    await expect(page.getByAltText('Gespeicherte Zeichenvorlage')).toBeVisible();
    await page.getByRole('button',{name:'Zurück zu Sektorflächen',exact:true}).click();
    await selectSector(page,width);
    await page.screenshot({path:`${output}/${loop}-editor-${width}.png`,animations:'disabled'});
    const map=page.getByTestId('hall-map-editor');
    // Intentionally wheel over the map, not scrollIntoView on a hidden action.
    await map.scrollIntoViewIfNeeded();
    const box=(await map.boundingBox())!;
    const start=await page.evaluate(()=>window.scrollY);
    await page.mouse.move(box.x+box.width/2,Math.min(500,Math.max(100,box.y+box.height/2)));
    await page.mouse.wheel(0,500);
    await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(start);
    await page.mouse.wheel(0,1000);
    if (width>=1024) {
      await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(start);
      const save=(await page.getByRole('button',{name:'Sektorfläche speichern',exact:true}).boundingBox())!;
      await page.mouse.wheel(0,save.y-160);
    }
    await expect.poll(async()=>{
      const save=(await page.getByRole('button',{name:'Sektorfläche speichern',exact:true}).boundingBox())!;
      const nav=width<768 ? await page.getByRole('navigation',{name:'Adminnavigation'}).boundingBox() : null;
      return save.y>=0 && save.y+save.height <= (width<768 && nav ? nav.y : 667);
    }).toBe(true);
    await page.screenshot({path:`${output}/${loop}-actions-${width}.png`,animations:'disabled'});
    expect(await map.evaluate(node=>getComputedStyle(node.parentElement!.parentElement!).touchAction)).toBe('pan-y');
    expect(await page.locator('body').evaluate(body=>body.scrollWidth)).toBe(width);
    expect(await page.evaluate(()=>window.hallMapQA.writes)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('point added inside an existing surface updates its edge without switching sector',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await openMap(page);
  await selectSector(page,1280);
  await page.getByRole('button',{name:'Punkt hinzufügen',exact:true}).click();
  const map=page.getByTestId('hall-map-editor');
  await map.scrollIntoViewIfNeeded();
  const target=await map.evaluate((node:SVGSVGElement)=>{
    const handles=node.querySelectorAll('circle');
    const first=handles[0],second=handles[2];
    const x=(Number(first.getAttribute('cx'))+Number(second.getAttribute('cx')))/2;
    const y=(Number(first.getAttribute('cy'))+Number(second.getAttribute('cy')))/2;
    const p=new DOMPoint(x,y).matrixTransform(node.getScreenCTM()!);
    return {x:p.x,y:p.y};
  });
  await page.mouse.click(target.x,target.y);
  await expect(page.getByTestId('map-edit-tools')).toContainText('5 Eckpunkte');
  await page.getByRole('button',{name:'Sektorfläche speichern',exact:true}).click();
  await expect(page.getByText('Gespeichert',{exact:true})).toBeVisible();
  const writes=await page.evaluate(()=>window.hallMapQA.writes);
  expect(writes).toHaveLength(1);
  expect(writes[0].kind).toBe('update-region');
  expect((writes[0].payload as {points_json:unknown[]}).points_json).toHaveLength(5);
});

test('name-only edit succeeds with missing preview and keeps stored dimensions',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.route('**/src/assets/boulderkarte-original.png*',route=>route.request().resourceType()==='image' ? route.abort() : route.continue());
  await openMap(page);
  await page.getByRole('button',{name:'Karte verwalten',exact:true}).click();
  await expect(page.getByText('Vorschau nicht verfügbar',{exact:true})).toBeVisible();
  await page.getByLabel('Interne Bezeichnung').fill('Interner Prüfstand');
  await page.evaluate(()=>{window.hallMapQA.fail=true;});
  await page.getByRole('button',{name:'Karte speichern',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Deine Eingaben bleiben erhalten');
  await page.evaluate(()=>{window.hallMapQA.fail=false;});
  await page.getByRole('button',{name:'Karte speichern',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const writes=await page.evaluate(()=>window.hallMapQA.writes);
  expect(writes).toHaveLength(2);
  expect((writes[1].payload as {width:number;height:number})).toMatchObject({width:735,height:466});
});

test.describe('touch map gestures',()=>{
  test.use({hasTouch:true});
  test('one-finger page scroll remains available over the selected map',async({page})=>{
    await page.setViewportSize({width:375,height:667});
    await openMap(page);
    await selectSector(page,375);
    const map=page.getByTestId('hall-map-editor');
    await map.scrollIntoViewIfNeeded();
    const box=(await map.boundingBox())!;
    const x=box.x+box.width/2, y=Math.min(530,box.y+box.height*0.7);
    const start=await page.evaluate(()=>window.scrollY);
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let step=1;step<=8;step++){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*22}]});
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(start);
    await expect(page.getByText('Gespeichert',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>window.hallMapQA.writes)).toEqual([]);
  });
  test('touch dragging a vertex changes geometry without scrolling the page',async({page})=>{
    await page.setViewportSize({width:375,height:800});
    await openMap(page);
    await selectSector(page,375);
    const map=page.getByTestId('hall-map-editor');
    await map.scrollIntoViewIfNeeded();
    // Bring the lower map edge above the real floating navigation before grabbing it.
    const mapBox=(await map.boundingBox())!;
    await page.mouse.move(mapBox.x+mapBox.width/2,500);
    await page.mouse.wheel(0,300);
    await expect.poll(async()=>{const rect=(await map.boundingBox())!;return rect.y+rect.height;}).toBeLessThan(680);
    const handle=map.locator('circle').first();
    const box=(await handle.boundingBox())!;
    const before=await handle.getAttribute('cy');
    const start=await page.evaluate(()=>window.scrollY);
    const x=box.x+box.width/2,y=box.y+box.height/2;
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let step=1;step<=8;step++) {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*2}]});
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(page.getByText('Ungespeichert',{exact:true})).toBeVisible();
    expect(await handle.getAttribute('cy')).not.toBe(before);
    expect(await page.evaluate(()=>window.scrollY)).toBe(start);
    expect(await page.evaluate(()=>window.hallMapQA.writes)).toEqual([]);
  });
});
