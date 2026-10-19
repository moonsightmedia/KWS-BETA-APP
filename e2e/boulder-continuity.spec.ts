import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const output = 'test-results/boulder-continuity-20261014';

declare global {
  interface Window {
    photoTransitionChecks: { ready: string; finished: boolean; waitsForFrames: boolean }[];
  }
}
test.use({trace:'off',video:'off'});
async function open(page: Page, start = '/', network = 'fast') {
  page.on('pageerror',error=>console.error('Fixture page:',error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const hook of ['useAuth','useColors','useSectors','useBoulders','useBoulderCommunity','useSectorSchedule','useHallMaps','useHasRole','useIsAdmin']) {
    await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({contentType:'application/javascript',body:"export * from '/test/fixtures/continuity-hooks.ts';"}));
  }
  await page.route('**/src/contexts/UploadContext.tsx*',route=>route.fulfill({contentType:'application/javascript',body:"export { useUpload } from '/test/fixtures/setter-hooks.ts';"}));
  await page.route('**/src/components/NotificationCenter.tsx*',route=>route.fulfill({contentType:'application/javascript',body:'export const NotificationCenter = () => null;'}));
  await page.route('**/src/components/boulder/BoulderDetailSections.tsx*',route=>route.fulfill({contentType:'application/javascript',body:"import React from '/node_modules/.vite/deps/react.js'; export const BoulderInfoTab=()=>React.createElement('p',null,'Bewertung und Kommentare'); export const BoulderTrackTab=()=>React.createElement('p',null,'Tracking'); export const BoulderBetaTab=()=>React.createElement('p',null,'Weitere Betas');"}));
  await page.addInitScript(network => {
    Object.defineProperty(navigator,'connection',{value:{effectiveType:network === 'slow' ? '2g':'4g',downlink:network === 'slow' ? 0.5:20,saveData:network === 'save'}});
    (window as any).videoStarts=0;
    document.addEventListener('loadstart',event=>{if(event.target instanceof HTMLVideoElement)(window as any).videoStarts++;},true);
  },network);
  await page.goto('/test/fixtures/boulder-continuity.html?start='+encodeURIComponent(start));
  await expect(page.getByTestId('route')).toHaveText(start);
}
for (const width of [375,768,1280,1920]) {
  test(`Home return retains thumbnail, scroll and video source (${width})`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize({width,height:900});
    await open(page);
    const card=page.getByRole('button',{name:/Kleine Kante, Grad/}).first();
    await expect(card).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await page.evaluate(()=>{const img=document.querySelector('button[aria-label*="Kleine Kante"] img');(window as any).retainedImg=img;(window as any).sourceScroll=scrollY;});
    await mkdir(output,{recursive:true});
    await page.screenshot({path:`${output}/home-${width}.png`});
    const media:string[]=[];page.on('request',r=>{if(r.url().includes('vertical-player.mp4'))media.push(r.url());});
    await expect.poll(()=>card.locator('img').evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await card.click();
    await expect(page.getByTestId('route')).toHaveText('/boulders/b-1');
    if (await page.evaluate(()=> 'startViewTransition' in document)) {
      await expect(page.locator('.kws-detail-enter')).toHaveAttribute('data-photo-animated','');
      await expect(page.locator('.kws-detail-enter')).toHaveCSS('animation-name','none');
    }
    const originScroll = Number(await page.getByTestId('origin-scroll').textContent());
    await expect(page.locator('video')).toHaveJSProperty('readyState',4);
    await expect(page.getByRole('button',{name:'Videoqualität: HD'})).toBeVisible();
    expect(media.every(url=>url.endsWith('?hd'))).toBe(true);
    const starts=await page.evaluate(()=>(window as any).videoStarts);
    expect(starts).toBe(1);
    await page.screenshot({path:`${output}/detail-${width}.png`});
    await page.getByRole('button',{name:'Track',exact:true}).click();
    await expect(page.getByText('Tracking',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>(window as any).videoStarts)).toBe(starts);
    await page.getByRole('button',{name:'Zurück zur Startseite'}).click();
    await expect(page.getByTestId('route')).toHaveText('/');
    await expect.poll(()=>page.evaluate(top=>({same:document.querySelector('button[aria-label*="Kleine Kante"] img')===(window as any).retainedImg,delta:Math.abs(scrollY-top)}),originScroll)).toEqual({same:true,delta:0});
    await page.screenshot({path:`${output}/returned-${width}.png`});
    expect(errors).toEqual([]);
  });
}
test('overview keeps search, URL filter, grid and thumbnail nodes with header and browser Back',async({page})=>{
  await open(page,'/boulders?show=new');
  await page.getByRole('button',{name:'Boulder suchen'}).click();
  await page.getByPlaceholder('Boulder oder Bereich suchen…').fill('Kleine');
  await page.getByRole('button',{name:'Gridansicht'}).click();
  const card=page.locator('#boulder-results button').filter({hasText:'Kleine Kante'}).first();
  await expect(card).toBeVisible();
  await page.evaluate(()=>{(window as any).retainedCard=document.querySelector('#boulder-results button');});
  for(const back of ['Zurück zur Boulderübersicht','Verlauf zurück']) {
    await card.click();
    await expect(page.getByTestId('route')).toHaveText(/\/boulders\/b-\d+/);
    await page.getByRole('button',{name:back,exact:true}).press('Enter');
    await expect(page.getByTestId('route')).toHaveText('/boulders?show=new');
    await expect(page.getByPlaceholder('Boulder oder Bereich suchen…')).toHaveValue('Kleine');
    expect(await page.evaluate(()=>document.querySelector('#boulder-results button')===(window as any).retainedCard)).toBe(true);
  }
});
for(const [network,quality] of [['slow','Low'],['save','SD']]) {
  test(`network ${network} selects ${quality} before first request`,async({page})=>{
    await open(page,'/boulders/b-1',network);
    await expect(page.locator('video')).toHaveJSProperty('readyState',4);
    await expect(page.getByRole('button',{name:`Videoqualität: ${quality}`})).toBeVisible();
    expect(await page.evaluate(()=>(window as any).videoStarts)).toBe(1);
  });
}
test('direct detail has safe overview fallback; reduced motion removes transition',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await open(page,'/boulders/b-1');
  await expect(page.getByRole('button',{name:'Zurück zur Boulderübersicht'})).toBeVisible();
  await expect(page.locator('[data-boulder-detail-scroll]')).toHaveCSS('opacity','1');
  await expect(page.locator('[data-boulder-detail-scroll]')).toHaveCSS('transform','none');
  await expect(page.locator('.kws-detail-enter')).toHaveCSS('animation-name','none');
  await page.getByRole('button',{name:'Zurück zur Boulderübersicht'}).click();
  await expect(page.getByTestId('route')).toHaveText('/boulders');
});
test('guest returns to public overview without losing its cards',async({page})=>{
  await page.setViewportSize({width:375,height:900});
  await open(page,'/guest');
  const card=page.getByRole('button',{name:/Kleine Kante/}).first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByTestId('route')).toHaveText(/\/boulders\/b-\d+/);
  await expect(page.getByRole('button',{name:'Track',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Zurück zur Boulderübersicht'}).click();
  await expect(page.getByTestId('route')).toHaveText('/guest');
  await expect(card).toBeVisible();
});
test('Forward reopens detail; leaving the source releases its retained DOM',async({page})=>{
  await page.setViewportSize({width:375,height:900});
  await open(page);
  const card=page.getByRole('button',{name:/Kleine Kante, Grad/}).first();
  await card.click();
  await page.getByRole('button',{name:'Zurück zur Startseite'}).click();
  await page.getByRole('button',{name:'Verlauf vor',exact:true}).press('Enter');
  await expect(page.getByTestId('route')).toHaveText('/boulders/b-1');
  await page.getByRole('button',{name:'Zurück zur Startseite'}).click();
  await page.evaluate(()=>{(window as any).sourceImg=document.querySelector('button[aria-label*="Kleine Kante"] img');});
  await page.getByRole('link',{name:'Statistiken',exact:true}).click();
  await expect(page.getByTestId('route')).toHaveText('/statistics');
  expect(await page.evaluate(()=>(window as any).sourceImg.isConnected)).toBe(false);
});

for (const width of [375, 768, 1280, 1920]) {
  test(`photo transition completes without waiting for rendering frames (${width})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
      const start = document.startViewTransition.bind(document);
      window.photoTransitionChecks = [];
      document.startViewTransition = update => {
        const check = { ready: 'pending', finished: false, waitsForFrames: false };
        window.photoTransitionChecks.push(check);
        const transition = start(() => {
          const originalFrame = window.requestAnimationFrame;
          window.requestAnimationFrame = () => { check.waitsForFrames = true; return 0; };
          try {
            return typeof update === 'function' ? update() : undefined;
          } finally {
            window.requestAnimationFrame = originalFrame;
          }
        });
        void transition.ready.then(() => { check.ready = 'ready'; }, error => { check.ready = error.name; });
        void transition.finished.then(() => { check.finished = true; }, () => {});
        return transition;
      };
    });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await open(page);
    const card = page.getByRole('button', { name: /Kleine Kante, Grad/ }).first();
    await expect.poll(() => card.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await card.click();
    await expect(page.getByTestId('route')).toHaveText('/boulders/b-1');
    await expect.poll(() => page.evaluate(() => window.photoTransitionChecks)).toEqual([
      { ready: 'ready', finished: true, waitsForFrames: false },
    ]);
    await expect(page.locator('html')).not.toHaveAttribute('data-boulder-photo-transition');
    await page.getByRole('button', { name: 'Zurück zur Startseite', exact: true }).click();
    await expect(page.getByTestId('route')).toHaveText('/');
    expect(errors).toEqual([]);
  });
}

for (const width of [375,768,1280,1920]) {
test(`scrolled overview keeps its painted geometry throughout detail and return (${width})`,async({page})=>{
  await page.setViewportSize({width,height:width>=1280?450:700});
  await open(page,'/boulders');
  await page.getByRole('button',{name:'Listenansicht',exact:true}).click();
  const card=page.locator('#boulder-results button').filter({has:page.locator('img')}).last();
  await card.scrollIntoViewIfNeeded();
  const handle=await card.elementHandle();
  const top=await page.evaluate(()=>scrollY);
  expect(top).toBeGreaterThan(100);
  const box=await handle!.boundingBox();
  await card.click();
  await expect(page.getByRole('button',{name:'Zurück zur Boulderübersicht'})).toBeVisible();
  // A retained but display:none page cannot keep a painted frame ready underneath.
  expect(await handle!.boundingBox()).toEqual(box);
  expect(await page.evaluate(()=>scrollY)).toBe(top);
  await expect(page.locator('[aria-hidden="true"].isolate')).toHaveJSProperty('inert',true);
  await expect(page.locator('html')).toHaveCSS('overflow','hidden');
  if(width<768) await expect(page.getByRole('navigation',{name:'Hauptnavigation'})).toHaveAttribute('data-compact','false');
  await page.getByRole('button',{name:'Track',exact:true}).click();
  expect(await page.evaluate(()=>scrollY)).toBe(top);
  const samples=await page.evaluateHandle(()=>{
    const values:Array<{top:number;height:number}>=[];
    let frames=0;
    const sample=()=>{values.push({top:scrollY,height:document.documentElement.scrollHeight});if(++frames<25)requestAnimationFrame(sample);};
    requestAnimationFrame(sample);
    return values;
  });
  await page.getByRole('button',{name:'Zurück zur Boulderübersicht'}).click();
  await expect(page.getByTestId('route')).toHaveText('/boulders');
  await expect.poll(async()=> (await samples.jsonValue()).length).toBe(25);
  const values=await samples.jsonValue();
  expect(values.every(value=>value.top===top)).toBe(true);
  expect(new Set(values.map(value=>value.height)).size).toBe(1);
  expect(await handle!.boundingBox()).toEqual(box);
  await expect(page.locator('html')).not.toHaveCSS('overflow','hidden');
  await expect(page.locator('.isolate').first()).toHaveJSProperty('inert',false);
  if(width<768) await expect(page.getByRole('navigation',{name:'Hauptnavigation'})).toHaveAttribute('data-compact','true');
  await page.keyboard.press('Escape');
  await page.mouse.move(width-5,400);
  await page.screenshot({path:`${output}/overview-return-${width}.png`,animations:'disabled'});
});
}
