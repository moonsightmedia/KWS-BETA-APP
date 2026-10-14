import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const output = 'test-results/home-reset-20261014';
test.use({trace:'off',video:'off'});
for (const width of [320,375,430,768,1280,1920]) {
  for (const scale of [1,1.5]) test(`Home reset fits ${width}px at ${scale}x type`, async ({page}) => {
    const errors:string[]=[];page.on('pageerror', e=>errors.push(e.message));
    await page.setViewportSize({width,height:1000});
    await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z'));
    await page.route('**/*', r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
    await page.route('**/test/fixtures/personal-hooks.ts*',async r=>{
      const response=await r.fetch();
      const source=(await response.text()).replace(/name: ['"]Bug A['"]/, 'name: "Bug A mit einer sehr langen Sektorbezeichnung"')
        .replace(/name: ['"]Grotte B['"]/, 'name: "KurzePlatteMitExtraLangerUngetrennterBezeichnung"')
        .replace(/useSectorSchedule = \(\)=>\(\{\s*data: \[\]/, "useSectorSchedule = ()=>({data:[{sector_id:'s1',scheduled_at:'2026-10-15T10:00:00Z'},{sector_id:'s2',scheduled_at:'2026-10-15T10:00:00Z'},{sector_id:'s1',scheduled_at:'2026-10-17T10:00:00Z'}]");
      await r.fulfill({response,body:source});
    });
    for(const hook of ['useAuth','useBoulders','useSectors','useColors','useBoulderCommunity','useSectorSchedule','useHasRole','useIsAdmin'])
      await page.route(`**/src/hooks/${hook}.ts*`,r=>r.fulfill({contentType:'application/javascript',body:"export * from '/test/fixtures/personal-hooks.ts';"}));
    await page.route('**/src/hooks/useNotifications.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const useUnreadCount=()=>({data:0});export const useNotifications=()=>({data:[]});export const useMarkAsRead=()=>({mutate(){}});export const useMarkAllAsRead=useMarkAsRead;'}));
    await page.route('**/src/utils/sentry.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const captureSentryException=()=>{};'}));
    await page.goto('/test/fixtures/personal-workspace.html?route=/');
    await page.evaluate(()=>document.fonts.ready);
    if(scale!==1)await page.addStyleTag({content:`html{font-size:${16*scale}px}`});
    const reset=page.getByTestId('home-next-reset');
    await expect(reset).toContainText('bekommen neue Boulder');
    await expect(reset).toContainText('KurzePlatteMitExtraLangerUngetrennterBezeichnung');
    await expect(reset).toContainText('in 1 Tag');
    await reset.scrollIntoViewIfNeeded();
    const overflow=await reset.evaluate(el=>{
      const outer=el.getBoundingClientRect();
      return [...el.querySelectorAll('*')].filter(child=>{
        const b=child.getBoundingClientRect();
        return b.left<outer.left-1||b.right>outer.right+1||b.right>innerWidth+1||child.scrollWidth>child.clientWidth+1;
      }).map(child=>child.tagName);
    });
    expect(overflow).toEqual([]);
    expect(errors).toEqual([]);
    await mkdir(output,{recursive:true});
    await page.screenshot({path:`${output}/home-${width}-${scale}.png`,fullPage:true,animations:'disabled'});
  });
}
