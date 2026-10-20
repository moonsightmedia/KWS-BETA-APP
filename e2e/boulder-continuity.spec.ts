import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const output = 'test-results/boulder-continuity-20261014';

declare global {
  interface Window {
    boulderMotionAnimations: Animation[];
    boulderNativeTransitions: number;
  }
}
test.use({trace:'off',video:'off'});
async function open(page: Page, start = '/', network = 'fast') {
  page.on('pageerror',error=>console.error('Fixture page:',error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const hook of ['useAuth','useColors','useSectors','useBoulders','useBoulderCommunity','useSectorSchedule','useHallMaps','useHasRole','useIsAdmin']) {
    await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({contentType:'application/javascript',body:hook === 'useBoulderCommunity' ? "export * from '/test/fixtures/rating-hooks.ts'; export const useUpdateBoulderMarkers=()=>({mutateAsync:async()=>{},isPending:false});" : "export * from '/test/fixtures/continuity-hooks.ts';"}));
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
    await expect(page.locator('.kws-detail-enter')).toHaveCSS('transform','none');
    await expect(page.locator('html')).not.toHaveAttribute('data-boulder-photo-transition');
    const originScroll = Number(await page.getByTestId('origin-scroll').textContent());
    await expect(page.locator('video')).toHaveJSProperty('readyState',4);
    await expect(page.getByRole('button',{name:'Videoqualität: HD'})).toBeVisible();
    await expect(page.locator('[data-video-fullscreen]')).toHaveCount(width < 768 ? 0 : 1);
    expect(media.every(url=>url.endsWith('?hd'))).toBe(true);
    const starts=await page.evaluate(()=>(window as any).videoStarts);
    expect(starts).toBe(1);
    await page.screenshot({path:`${output}/detail-${width}.png`});
    if(width<768) await page.getByRole('button',{name:'Boulder-Details öffnen',exact:true}).click();
    await page.getByRole('button',{name:'Track',exact:true}).click();
    await expect(page.getByText('Tracking',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>(window as any).videoStarts)).toBe(starts);
    if(width<768) await page.getByRole('button',{name:'Boulder-Details schließen',exact:true}).click();
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

test('quick Back and Forward remain usable even while entry is paused', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    document.addEventListener('animationstart', event => {
      if (event.animationName !== 'kws-detail-enter') return;
      document.getAnimations().forEach(animation => {
        if (animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element
          && animation.effect.target.matches('.kws-detail-enter')) {
          animation.pause();
          animation.currentTime = 0;
        }
      });
    });
  });
  await open(page);
  for (let visit = 0; visit < 2; visit++) {
    await page.getByRole('button', { name: /Kleine Kante, Grad/ }).first().click();
    await expect(page.getByTestId('route')).toHaveText('/boulders/b-1');
    await expect(page.locator('.kws-detail-enter')).toHaveCSS('opacity', '0.92');
    await page.getByRole('button', { name: 'Zurück zur Startseite', exact: true }).click();
    await expect(page.getByTestId('route')).toHaveText('/');
  }
  await page.getByRole('button', { name: 'Verlauf vor', exact: true }).click();
  await expect(page.getByTestId('route')).toHaveText('/boulders/b-1');
  await page.getByRole('button', { name: 'Verlauf zurück', exact: true }).click();
  await expect(page.getByTestId('route')).toHaveText('/');
});

for (const width of [375, 768, 1280, 1920]) {
  test(`detail entry keeps media and header fixed throughout every frame (${width})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
      window.boulderMotionAnimations = [];
      window.boulderNativeTransitions = 0;
      const pauseEntry = () => {
        for (const animation of document.getAnimations()) {
          const effect = animation.effect;
          if (effect instanceof KeyframeEffect && effect.target instanceof Element
            && (effect.target === document.documentElement || effect.target.matches('.kws-detail-enter'))) {
            animation.pause();
            animation.currentTime = 0;
            if (!window.boulderMotionAnimations.includes(animation)) window.boulderMotionAnimations.push(animation);
          }
        }
      };
      document.addEventListener('animationstart', event => {
        if (event.animationName === 'kws-detail-enter') pauseEntry();
      });
      const start = document.startViewTransition?.bind(document);
      if (start) document.startViewTransition = update => {
        window.boulderNativeTransitions++;
        const transition = start(update);
        void transition.ready.then(pauseEntry, () => {});
        return transition;
      };
    });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await open(page);
    const card = page.getByRole('button', { name: /Kleine Kante, Grad/ }).first();
    await expect.poll(() => card.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.evaluate(() => document.fonts.ready);
    await card.click();
    await expect(page.getByTestId('route')).toHaveText('/boulders/b-1');
    await expect.poll(() => page.evaluate(() => window.boulderMotionAnimations.length)).toBeGreaterThan(0);
    const frames = [];
    const proof = `test-results/boulder-motion-20261019/${process.env.KWS_MOTION_PROOF ?? 'after'}`;
    await mkdir(proof, { recursive: true });
    for (const currentTime of [0, 75, 150]) {
      const frame = await page.evaluate(currentTime => {
        window.boulderMotionAnimations.forEach(animation => { animation.currentTime = currentTime; });
        const detail = document.querySelector<HTMLElement>('.kws-detail-enter')!;
        const layer = document.querySelector<HTMLElement>('[data-boulder-detail-scroll]')!;
        const rect = (selector: string) => {
          const bounds = layer.querySelector(selector)!.getBoundingClientRect();
          return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
        };
        return {
          media: rect('video'), header: rect('h1'),
          transform: getComputedStyle(detail).transform,
          layerOpacity: getComputedStyle(layer).opacity,
          layerBackground: getComputedStyle(layer).backgroundColor,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      }, currentTime);
      frames.push(frame);
      await page.screenshot({ path: `${proof}/entry-${width}-${currentTime}.png` });
    }
    expect(frames.every(frame => JSON.stringify(frame) === JSON.stringify(frames[0]))).toBe(true);
    expect(frames[0].transform).toBe('none');
    expect(frames[0].layerOpacity).toBe('1');
    expect(frames[0].layerBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(frames[0].overflow).toBe(false);
    expect(await page.evaluate(() => window.boulderNativeTransitions)).toBe(0);
    await page.evaluate(() => window.boulderMotionAnimations.forEach(animation => animation.finish()));
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
  if(width<768) {
    await expect(page.getByRole('navigation',{name:'Hauptnavigation'})).toHaveCount(0);
    await page.getByRole('button',{name:'Boulder-Details öffnen',exact:true}).click();
  }
  await page.getByRole('button',{name:'Track',exact:true}).click();
  if(width<768) await page.getByRole('button',{name:'Boulder-Details schließen',exact:true}).click();
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
