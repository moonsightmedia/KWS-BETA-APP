import { test, expect, type Page } from '@playwright/test';

// Real pages and the production pager, with isolated data and no cloud writes.
async function open(page: Page, route = '/', extra = '') {
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  for (const hook of ['useAuth', 'useBoulders', 'useSectors', 'useColors', 'useBoulderCommunity', 'useSectorSchedule', 'useHasRole', 'useIsAdmin']) {
    await page.route(`**/src/hooks/${hook}.ts*`, r => r.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/personal-hooks.ts';" }));
  }
  await page.route('**/src/hooks/useNotifications.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const useUnreadCount=()=>({data:0});export const useNotifications=()=>({data:[],isLoading:false});export const useMarkAsRead=()=>({mutate(){},mutateAsync:async()=>{}});export const useMarkAllAsRead=useMarkAsRead;export const useChangeNotification=useMarkAsRead;' }));
  await page.route('**/src/hooks/usePreloadBoulderThumbnails.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const usePreloadBoulderThumbnails=()=>{};' }));
  await page.route('**/src/lib/profileCompat.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const fetchProfileRecord=async()=>({first_name:"Alex"});' }));
  await page.goto(`/test/fixtures/personal-workspace.html?route=${encodeURIComponent(route)}${extra}`);
  await expect(page.locator('main')).toBeVisible();
}

const pane = (page: Page) => page.locator('[data-main-route-pane]:not([data-route-preview])');
async function drag(page: Page, delta: number) {
  const box = await pane(page).locator('main').boundingBox();
  const x = box!.x + box!.width / 2;
  await page.mouse.move(x, 390);
  await page.mouse.down();
  await page.mouse.move(x + delta, 390, { steps: 12 });
}
async function settled(page: Page, route: string) {
  await expect(page.getByTestId('route')).toHaveText(route);
  await expect(page.locator('[data-main-route-pane]')).toHaveCount(1);
  await expect.poll(() => pane(page).locator('main').evaluate(n => getComputedStyle(n).transform)).toBe('none');
}

for (const width of [375, 768, 1280, 1920]) {
  test(`continuous forward/reverse pages at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await open(page);
    const original = await pane(page).locator('main').boundingBox();
    const header = await pane(page).locator('[data-kws-dashboard-header]').boundingBox();
    const distance = original!.width * 0.4;
    await page.screenshot({ path: info.outputPath(`loop1-home-${width}.png`) });
    await drag(page, -distance);
    const preview = page.locator('[data-route-preview]');
    await expect(preview).toHaveAttribute('inert', '');
    await expect.poll(async () => Math.round((await pane(page).locator('main').boundingBox())!.x - original!.x)).toBe(Math.round(-distance));
    expect((await pane(page).locator('[data-kws-dashboard-header]').boundingBox())!.x).toBe(header!.x);
    const incoming = await preview.locator('main').elementHandle();
    await page.screenshot({ path: info.outputPath(`loop2-drag-${width}.png`) });
    await page.mouse.up();
    await settled(page, '/boulders');
    // Committing must retain the page already visible under the finger.
    expect(await incoming!.evaluate(n => n === document.querySelector('[data-main-route-pane] main'))).toBe(true);
    await page.screenshot({ path: info.outputPath(`loop1-boulders-${width}.png`) });
    await drag(page, -distance); await page.mouse.up(); await settled(page, '/statistics');
    await page.screenshot({ path: info.outputPath(`loop1-statistics-${width}.png`) });
    await drag(page, distance); await page.mouse.up(); await settled(page, '/boulders');
    await drag(page, distance); await page.mouse.up(); await settled(page, '/');
    await page.screenshot({ path: info.outputPath(`loop2-home-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('short slow drag returns; reversal and boundaries do not wrap', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await open(page);
  await drag(page, -55); await page.waitForTimeout(120); await page.mouse.up();
  await settled(page, '/');
  await drag(page, 100); await page.mouse.up(); await settled(page, '/');
  await drag(page, -130); await page.mouse.move(187, 390, { steps: 8 }); await page.waitForTimeout(120); await page.mouse.up();
  await settled(page, '/');
});

test('touch cancellation, vertical scrolling and a real touch commit', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await open(page);
  const cdp = await context.newCDPSession(page);
  const touch = (type: string, x = 300, y = 390) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y }] });
  await touch('touchStart'); await touch('touchMove', 190); await touch('touchCancel'); await settled(page, '/');
  await touch('touchStart'); await touch('touchMove', 295, 200); await touch('touchEnd'); await settled(page, '/');
  await page.evaluate(() => window.scrollTo(0, 0));
  await touch('touchStart'); await touch('touchMove', 220); await touch('touchMove', 140); await touch('touchEnd');
  await settled(page, '/boulders');
});

test('reduced motion navigates without translations, including a live change', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await open(page);
  await drag(page, -160); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.up(); await settled(page, '/boulders');
  await drag(page, -160);
  await expect(page.locator('[data-main-route-pane]')).toHaveCount(1);
  await page.mouse.up(); await settled(page, '/statistics');
});

test('preview keeps document scroll and cannot activate a persisted video view', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await open(page);
  await page.evaluate(() => { localStorage.setItem('boulder_view_mode', 'video'); window.scrollTo(0, 250); });
  const scroll = await page.evaluate(() => scrollY);
  await drag(page, -60);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  expect(await page.locator('[data-route-preview] video').count()).toBe(0);
  expect(await page.locator('html').getAttribute('data-boulder-feed')).toBeNull();
  await page.waitForTimeout(120); await page.mouse.up(); await settled(page, '/');
});
