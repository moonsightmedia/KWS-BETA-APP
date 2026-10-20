import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, query = '') {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto(`/test/fixtures/mobile-player.html${query}`);
  await expect(page.locator('video')).toHaveJSProperty('readyState', 4);
  await page.locator('video').evaluate((video: HTMLVideoElement) => { video.pause(); video.currentTime = .5; });
  await expect(page.getByRole('slider', { name: 'Videoposition' })).toBeEnabled();
}

async function drag(page: Page, x: number, from: number, to: number) {
  await page.mouse.move(x, from);
  await page.mouse.down();
  await page.mouse.move(x, to, { steps: 12 });
  await page.mouse.up();
}

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
