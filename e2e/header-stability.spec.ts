import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const phase = process.env.KWS_HEADER_PHASE || 'after';
const output = process.env.KWS_HEADER_OUTPUT || 'test-results/header-stability-20261006';
// Keep classic desktop scrollbars visible: overlay/hidden scrollbars mask
// navigation shifts between a short Home page and longer content pages.
test.use({ trace: 'off', video: 'off', launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

async function open(page: Page, extra = '') {
  await page.clock.setFixedTime(new Date('2026-09-15T12:00:00Z'));
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  for (const hook of ['useAuth', 'useBoulders', 'useSectors', 'useColors', 'useBoulderCommunity', 'useSectorSchedule', 'useHasRole', 'useIsAdmin']) {
    await page.route(`**/src/hooks/${hook}.ts*`, r => r.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/personal-hooks.ts';" }));
  }
  await page.route('**/src/hooks/useNotifications.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const useUnreadCount=()=>({data:0});export const useNotifications=()=>({data:[],isLoading:false});export const useMarkAsRead=()=>({mutate(){},mutateAsync:async()=>{}});export const useMarkAllAsRead=useMarkAsRead;export const useChangeNotification=useMarkAsRead;' }));
  await page.route('**/src/hooks/usePreloadBoulderThumbnails.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const usePreloadBoulderThumbnails=()=>{};' }));
  await page.route('**/src/utils/feedbackUtils.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const reportError=async()=>({success:true});' }));
  await page.route('**/src/utils/sentry.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const captureSentryException=()=>{};' }));
  await page.route('**/src/lib/profileCompat.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const fetchProfileRecord=async()=>({first_name:"Alex"});' }));
  await page.goto(`/test/fixtures/personal-workspace.html?route=/&${extra}`);
  await page.addStyleTag({ url: '/fonts.css' });
  await page.evaluate(() => document.fonts.ready);
  await mkdir(output, { recursive: true });
}

async function geometry(page: Page) {
  return page.locator('.sticky.top-0').first().evaluate(header => {
    const rect = header.getBoundingClientRect();
    const title = header.querySelector('h1')!.getBoundingClientRect();
    return { top: rect.top, height: rect.height, titleTop: title.top, titleLeft: title.left };
  });
}

async function opticalAlignment(page: Page) {
  return page.locator('.sticky.top-0').first().evaluate(header => {
    const title = header.querySelector('h1')!;
    const text = title.innerText;
    const style = getComputedStyle(title);
    const marker = document.createElement('span');
    marker.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    title.append(marker);
    const baseline = marker.getBoundingClientRect().top;
    marker.remove();
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = context.measureText(text);
    const button = header.querySelector('.justify-end button')!.getBoundingClientRect();
    return { inkCenter: baseline + (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2, buttonCenter: button.top + button.height / 2 };
  });
}

for (const width of [375, 768, 1280, 1920]) {
  test(`header remains aligned across navigation at ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    const measurements: Awaited<ReturnType<typeof geometry>>[] = [];
    for (const label of ['Home', 'Boulder', 'Statistiken', 'Home']) {
      await page.getByRole('link', { name: label, exact: true }).locator('visible=true').first().click();
      measurements.push(await geometry(page));
      const alignment = await opticalAlignment(page);
      console.log(`${phase} ${width} ${label} optical: ${JSON.stringify(alignment)}`);
      if (phase !== 'before') expect(Math.abs(alignment.inkCenter - alignment.buttonCenter)).toBeLessThanOrEqual(1.5);
      await page.screenshot({ path: `${output}/${phase}-${label}-${width}.png`, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    console.log(`${phase} ${width}: ${JSON.stringify(measurements)}`);
    expect(errors).toEqual([]);
    if (phase !== 'before') {
      for (const measurement of measurements) expect(measurement).toEqual(measurements[0]);
    }
  });
}

for (const width of [375, 768, 1280, 1920]) test(`loop 2: safe area, scroll, menus and data states at ${width}`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width, height: 900 });
  await open(page);
  await page.addStyleTag({ content: ':root { --app-safe-area-top: 32px; }' });
  const initial = await geometry(page);
  await page.getByRole('button', { name: 'Benachrichtigungen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Benachrichtigungen', exact: true })).toBeVisible();
  expect(await geometry(page)).toEqual(initial);
  await page.screenshot({ path: `${output}/loop2-notifications-${width}.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Benachrichtigungen schließen' }).click();
  for (const label of ['Boulder', 'Statistiken', 'Home']) {
    await page.getByRole('link', { name: label, exact: true }).locator('visible=true').first().click();
    expect(await geometry(page)).toEqual(initial);
    if (label === 'Boulder') {
      await page.getByRole('button', { name: 'Boulder suchen', exact: true }).click();
      const expanded = await geometry(page);
      expect(expanded.titleTop).toBe(initial.titleTop);
      expect(expanded.height).toBeGreaterThan(initial.height);
      await page.screenshot({ path: `${output}/loop2-search-${width}.png`, animations: 'disabled' });
      await page.getByRole('button', { name: 'Suche schließen' }).click();
      expect(await geometry(page)).toEqual(initial);
    }
    await page.evaluate(() => window.scrollTo({ top: 160, behavior: 'instant' }));
    await expect.poll(async () => (await geometry(page)).top).toBe(0);
  }
  for (const state of ['loading', 'error', 'empty']) {
    await open(page, `state=${state}`);
    await page.addStyleTag({ content: ':root { --app-safe-area-top: 32px; }' });
    expect(await geometry(page)).toEqual(initial);
    await page.screenshot({ path: `${output}/loop2-${state}-${width}.png`, animations: 'disabled' });
  }
  expect(errors).toEqual([]);
});

for (const collapsed of [false, true]) test(`desktop navigation keeps short and long pages aligned (sidebar ${collapsed ? 'collapsed' : 'expanded'})`, async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await open(page);
  if (collapsed) {
    await page.getByRole('button', { name: 'Navigation einklappen', exact: true }).click();
    await expect(page.locator('#desktop-navigation')).toHaveAttribute('data-expanded', 'false');
    // Wait for the existing sidebar/content transition before measuring.
    await expect.poll(() => page.locator('.sticky.top-0').first().evaluate(el => el.getBoundingClientRect().left)).toBe(80);
  }
  const measurements = [];
  const typography = [];
  for (const label of ['Home', 'Boulder', 'Statistiken', 'Home']) {
    await page.getByRole('link', { name: label, exact: true }).locator('visible=true').first().click();
    await expect(page.getByRole('heading', { name: label === 'Home' ? 'Hallo Alex' : label, exact: true })).toBeVisible();
    measurements.push(await geometry(page));
    typography.push(await page.locator('.sticky.top-0 h1').evaluate(el => {
      const style = getComputedStyle(el);
      return { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight, spacing: style.letterSpacing };
    }));
    if (label === 'Home') {
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(1080);
    } else {
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(1080);
    }
  }
  for (const measurement of measurements) expect(measurement).toEqual(measurements[0]);
  for (const style of typography) expect(style).toEqual(typography[0]);
  expect(typography[0].family).toContain('Teko');
  expect(await page.evaluate(() => document.fonts.check('600 34.4px Teko'))).toBe(true);
});
