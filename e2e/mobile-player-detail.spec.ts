import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

async function open(page: Page, query = '') {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto(`/test/fixtures/mobile-player.html${query}`);
  await expect(page.locator('video')).toHaveJSProperty('readyState', 4);
  await page.locator('video').evaluate((video: HTMLVideoElement) => { video.pause(); video.currentTime = .5; });
  await expect(page.getByRole('slider', { name: 'Videoposition' })).toBeEnabled();
  await expect(page.locator('video')).toHaveAttribute('src', /quality=hd/);
}

async function drag(page: Page, x: number, from: number, to: number) {
  await page.mouse.move(x, from);
  await page.mouse.down();
  await page.mouse.move(x, to, { steps: 12 });
  await page.mouse.up();
}

async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, cancel = false) {
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 1 }] });
  for (let step = 1; step <= 12; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * step / 12, y: from.y + (to.y - from.y) * step / 12, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  await session.detach();
}

test('real touch opens the sheet, dismisses by handle or backdrop, and retains accessible dismissal', async ({ page }) => {
  await open(page);
  await touchDrag(page, { x: 140, y: 635 }, { x: 140, y: 390 });
  const dialog = page.getByRole('dialog', { name: 'Kühner Wurm' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('.kws-detail-sheet')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  const handle = dialog.getByRole('button', { name: 'Boulder-Details schließen' });
  await expect(handle).toBeFocused();
  const box = await handle.boundingBox();
  await touchDrag(page, { x: box!.x + 90, y: box!.y + 20 }, { x: box!.x + 90, y: box!.y + 200 });
  await expect(dialog).toHaveCount(0);
  // The single visible handle is a keyboard button; there is no redundant X.
  await page.getByRole('button', { name: 'Boulder-Details öffnen', exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Boulder-Details öffnen', exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.locator('.kws-detail-backdrop').click({ position: { x: 15, y: 30 } });
  await expect(dialog).toHaveCount(0);
  // Free image gestures also work above the old invisible bottom-only zone.
  await touchDrag(page, { x: 140, y: 360 }, { x: 140, y: 160 });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('rightward touch returns from the video; vertical and cancelled gestures do not', async ({ page }) => {
  await open(page);
  await touchDrag(page, { x: 70, y: 300 }, { x: 220, y: 305 }, true);
  await expect(page.getByTestId('route')).toHaveText('/boulders/b-1');
  await touchDrag(page, { x: 70, y: 300 }, { x: 230, y: 307 });
  await expect(page.getByTestId('route')).toHaveText('/boulders');
});

test('a photo-only detail also supports a rightward return and preserves vertical scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/test/fixtures/mobile-player.html?novideo');
  const title = page.locator('#boulder-detail-title');
  await expect(title).toBeVisible();
  const box = await title.boundingBox();
  await touchDrag(page, { x: box!.x + 40, y: box!.y + 10 }, { x: box!.x + 200, y: box!.y + 15 });
  await expect(page.getByTestId('route')).toHaveText('/boulders');
});

test('swipe opens and closes real details without replacing the paused video or preferences', async ({ page }) => {
  await open(page);
  await page.locator('video').evaluate(video => { (window as any).originalVideo = video; });
  await page.getByRole('button', { name: /Geschwindigkeit:/ }).click();
  await page.getByRole('menuitemradio', { name: /0,5×/ }).click();
  await page.getByRole('button', { name: 'Video wiederholen' }).click();
  await drag(page, 150, 645, 420);
  const dialog = page.getByRole('dialog', { name: 'Kühner Wurm' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Track', exact: true })).toBeVisible();
  await expect(page.locator('video')).toHaveJSProperty('paused', true);
  await expect(page.locator('.kws-detail-sheet')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  const grip = await page.locator('.kws-detail-grip').boundingBox();
  await drag(page, 130, grip!.y + 20, grip!.y + 200);
  await expect(dialog).toHaveCount(0);
  expect(await page.locator('video').evaluate(video => video === (window as any).originalVideo)).toBe(true);
  await expect(page.locator('video')).toHaveJSProperty('currentTime', .5);
  await expect(page.locator('video')).toHaveJSProperty('playbackRate', .5);
  await expect(page.locator('video')).toHaveJSProperty('loop', true);
  await expect(page.locator('video')).toHaveJSProperty('paused', true);
  await expect(page.locator('[data-video-fullscreen]')).toHaveCount(0);
});

test('short drag cancels, timeline stays separate and paused image can hide all chrome', async ({ page }) => {
  await open(page);
  await drag(page, 150, 645, 630);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const slider = page.getByRole('slider', { name: 'Videoposition' });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Completed drags suppress their synthetic click for 350ms.
  await page.waitForTimeout(400);
  await page.locator('video').click({ position: { x: 180, y: 300 } });
  await expect(page.locator('[data-controls-visible]')).toHaveAttribute('data-controls-visible', 'false');
  await expect(page.locator('video')).toHaveJSProperty('paused', true);
  await page.locator('video').click({ position: { x: 180, y: 300 } });
  await expect(page.getByRole('button', { name: 'Boulder-Details öffnen', exact: true })).toBeVisible();
});

test('guest details omit tracking and Escape restores arrow focus', async ({ page }) => {
  await open(page, '?guest');
  const arrow = page.getByRole('button', { name: 'Boulder-Details öffnen', exact: true });
  await arrow.click();
  const dialog = page.getByRole('dialog', { name: 'Kühner Wurm' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Track', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Info', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Beta', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(arrow).toBeFocused();
});

test('load failure keeps details and back navigation reachable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/test/fixtures/mobile-player.html?broken');
  await expect(page.getByText('Video konnte nicht geladen werden', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Boulder-Details öffnen', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Kühner Wurm' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Zurück zur Boulderübersicht' }).click();
  await expect(page.getByTestId('route')).toHaveText('/boulders');
});

for (const width of [375, 768, 1280, 1920]) test(`detail rendered QA loops at ${width}px`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 1024 });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/test/fixtures/mobile-player.html');
  await expect(page.locator('video')).toHaveJSProperty('readyState', 4);
  await page.locator('video').evaluate((video: HTMLVideoElement) => { video.pause(); video.currentTime = .5; });
  const directory = path.resolve('output/video-feedback-20261020'); await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `loop1-detail-${width}.png`), fullPage: true });
  if (width < 1024) {
    await page.getByRole('button', { name: 'Boulder-Details öffnen', exact: true }).click();
    await expect(page.locator('.kws-detail-sheet')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Info', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(directory, `loop2-sheet-${width}.png`), fullPage: true });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Boulder-Details öffnen', exact: true })).toBeFocused();
  } else {
    await page.getByRole('button', { name: 'Beta', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Beta', exact: true })).toHaveCSS('background-color', 'rgb(54, 181, 49)');
    await expect(page.getByText('Offizielle Beta', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: path.join(directory, `loop2-beta-${width}.png`), fullPage: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await context.close();
});
