import {expect,test} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
test.use({trace:'off',video:'off'});
for(const width of [375,768,1280,1920])test(`loop without replay control ${width}px`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:900});
  await page.goto('/test/fixtures/beta-animation-only.html');
  const placeholder=page.locator('[data-beta-placeholder]');
  await expect(placeholder).toBeVisible();
  await expect(placeholder.getByRole('button')).toHaveCount(0);
  await expect(page.locator('video,iframe')).toHaveCount(0);
  const timing=await page.locator('.beta-placeholder-climber').evaluate(el=>({
    duration:getComputedStyle(el).animationDuration,iterations:el.getAnimations()[0]?.effect?.getComputedTiming().iterations===Infinity,
  }));expect(timing).toEqual({duration:'3s',iterations:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await mkdir('test-results/optional-beta-20261014',{recursive:true});
  await page.screenshot({path:`test-results/optional-beta-20261014/no-replay-${width}.png`});
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.locator('.beta-placeholder-climber').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await expect(placeholder).toContainText('Beta folgt.');
  expect(errors).toEqual([]);
});
