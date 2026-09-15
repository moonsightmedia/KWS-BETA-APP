import { expect, test, type Page } from '@playwright/test';

const sampleBoulder = { id: 'test-only', name: 'Testboulder', sector: 'Bug A', color: 'Grün', difficulty: 3, status: 'haengt' };

async function isolate(page: Page) {
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
  for (const name of ['useAuth', 'useColors', 'useSectors', 'useBoulders']) {
    await page.route(`**/src/hooks/${name}.ts*`, route => route.fulfill({
      contentType: 'application/javascript', body: 'export * from "/test/fixtures/guest-loading-hooks.ts";',
    }));
  }
  return runtimeErrors;
}

for (const width of [375, 768, 1280, 1920]) {
  test(`guest error layout and retry recovery at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await isolate(page);
    let fail = true;
    let boulderRequests = 0;
    let sectorRequests = 0;
    let releaseRetry: (() => void) | undefined;
    await page.route('**/__guest_test__/sectors', route => {
      sectorRequests++;
      return route.fulfill({ json: [{ name: 'Bug A' }] });
    });
    await page.route('**/__guest_test__/boulders', async route => {
      boulderRequests++;
      if (!fail) await new Promise<void>(resolve => { releaseRetry = resolve; });
      await route.fulfill({ status: fail ? 503 : 200, json: fail ? {} : [sampleBoulder] });
    });
    await page.goto('/test/fixtures/guest-loading.html');
    const alert = page.getByRole('alert');
    const retry = page.getByRole('button', { name: 'Erneut versuchen' });
    await expect(alert).toContainText('Boulder konnten nicht geladen werden');
    await expect(page.locator('header')).toContainText('Daten nicht verfügbar');
    await expect(page.locator('body')).not.toContainText('0 aktuelle Boulder');
    await expect(alert).toHaveCSS('border-radius', '12px');
    await expect(retry).toHaveCSS('border-radius', '8px');
    expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/guest-loading-20260914/loop1-error-${width}.png` });
    // A second failure must retain the message and restore the retry action.
    await retry.click();
    await expect.poll(() => boulderRequests).toBe(2);
    await expect(retry).toBeEnabled();
    fail = false;
    const alertBeforeRetry = await alert.boundingBox();
    const buttonBeforeRetry = await retry.boundingBox();
    await retry.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(retry).toBeFocused();
    await expect(retry).not.toHaveCSS('box-shadow', 'none');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Wird geladen …' })).toBeDisabled();
    expect(await alert.boundingBox()).toEqual(alertBeforeRetry);
    expect(await page.getByRole('button', { name: 'Wird geladen …' }).boundingBox()).toEqual(buttonBeforeRetry);
    await expect.poll(() => Boolean(releaseRetry)).toBe(true);
    await page.screenshot({ path: `test-results/guest-loading-20260914/loop2-retry-${width}.png` });
    releaseRetry!();
    await expect(alert).toHaveCount(0);
    await expect(page.locator('header')).toContainText('1 aktuelle Boulder');
    await expect(page.getByRole('button', { name: /Testboulder/ })).toBeVisible();
    expect(sectorRequests).toBe(3);
    expect(boulderRequests).toBe(3);
    expect(errors).toEqual([]);
  });

  test(`guest loading, genuine empty and search reset at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await isolate(page);
    let rows: object[] = [];
    let release: (() => void) | undefined;
    let hold = true;
    await page.route('**/__guest_test__/sectors', route => route.fulfill({ json: [{ name: 'Bug A' }] }));
    await page.route('**/__guest_test__/boulders', async route => {
      if (hold) await new Promise<void>(resolve => { release = resolve; });
      await route.fulfill({ json: rows });
    });
    await page.goto('/test/fixtures/guest-loading.html');
    await expect(page.getByRole('status')).toContainText('Boulder werden geladen');
    await expect(page.locator('body')).not.toContainText('0 aktuelle Boulder');
    await page.screenshot({ path: `test-results/guest-loading-20260914/loop2-loading-${width}.png` });
    await expect.poll(() => Boolean(release)).toBe(true);
    release!();
    await expect(page.getByRole('status')).toContainText('Noch keine aktuellen Boulder');
    await expect(page.locator('header')).toContainText('0 aktuelle Boulder');
    await page.screenshot({ path: `test-results/guest-loading-20260914/loop2-empty-${width}.png` });
    hold = false;
    rows = [sampleBoulder];
    await page.reload();
    await expect(page.getByRole('button', { name: /Testboulder/ })).toBeVisible();
    await page.getByRole('button', { name: 'Boulder suchen' }).click();
    await page.getByPlaceholder('Boulder oder Sektor suchen…').fill('Kein Treffer');
    await expect(page.getByRole('status')).toContainText('Keine passenden Boulder');
    await page.getByRole('button', { name: 'Suche und Filter zurücksetzen' }).click();
    await expect(page.getByRole('button', { name: /Testboulder/ })).toBeVisible();
    await expect(page.getByPlaceholder('Boulder oder Sektor suchen…')).toHaveValue('');
    expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
}

test('a sectors-only failure is an error, never a successful empty list', async ({ page }) => {
  await isolate(page);
  await page.route('**/__guest_test__/sectors', route => route.fulfill({ status: 503, json: {} }));
  await page.route('**/__guest_test__/boulders', route => route.fulfill({ json: [sampleBoulder] }));
  await page.goto('/test/fixtures/guest-loading.html');
  await expect(page.getByRole('alert')).toContainText('Boulder konnten nicht geladen werden');
  await expect(page.getByRole('button', { name: /Testboulder/ })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('0 aktuelle Boulder');
});
