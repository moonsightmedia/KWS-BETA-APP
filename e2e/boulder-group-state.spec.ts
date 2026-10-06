import { expect, test, type Page } from '@playwright/test';

const storageKey = 'boulder_collapsed_areas_v1';

async function open(page: Page) {
  // Only isolated fixture reads; no live account or database changes.
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const hook of ['useAuth', 'useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps', 'useHasRole', 'useIsAdmin']) {
    await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/filter-user-hooks.ts';" }));
  }
  await page.route('**/src/contexts/UploadContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useUpload } from '/test/fixtures/setter-hooks.ts';" }));
  await page.goto('/test/fixtures/filter-boulders.html');
  await expect(group(page, 'Bug')).toBeVisible();
}

function group(page: Page, name: string) {
  return page.locator('h2').getByRole('button', { name: new RegExp(`^${name} \\d+$`) });
}

for (const width of [375, 1280]) {
  for (const back of ['Zurück zur Boulderübersicht', 'Verlauf zurück']) {
    test(`sector state survives detail and return (${width}, ${back})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      await expect(group(page, 'Bug')).toHaveAttribute('aria-expanded', 'true');
      await group(page, 'Bug').click();
      await expect(group(page, 'Bug')).toHaveAttribute('aria-expanded', 'false');
      await page.getByRole('button', { name: /Kleine Kante/ }).first().click();
      await expect(group(page, 'Bug')).toHaveCount(0);
      await page.getByRole('button', { name: back, exact: true }).click();
      await expect(group(page, 'Bug')).toHaveAttribute('aria-expanded', 'false');
      await expect(group(page, 'Grotte')).toHaveAttribute('aria-expanded', 'true');
      await page.reload();
      await expect(group(page, 'Bug')).toHaveAttribute('aria-expanded', 'false');
      await expect(group(page, 'Grotte')).toHaveAttribute('aria-expanded', 'true');
      expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
    });
  }
}

test('collapse/expand all is saved; hidden groups keep their preference', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Alle Gruppen einklappen', exact: true }).click();
  await page.reload();
  await expect(group(page, 'Bug')).toHaveAttribute('aria-expanded', 'false');
  await expect(group(page, 'Grotte')).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('switch', { name: 'Auch abgeschraubte', exact: true }).check();
  await dialog.getByRole('button', { name: '12 Boulder anzeigen', exact: true }).click();
  await expect(group(page, 'Top-Out')).toHaveAttribute('aria-expanded', 'true');
  await group(page, 'Top-Out').click();
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await dialog.getByRole('switch', { name: 'Auch abgeschraubte', exact: true }).uncheck();
  await dialog.getByRole('button', { name: '8 Boulder anzeigen', exact: true }).click();
  await expect(group(page, 'Top-Out')).toHaveCount(0);
  await page.getByRole('button', { name: 'Alle Gruppen ausklappen', exact: true }).click();
  await page.reload();
  await expect(group(page, 'Bug')).toHaveAttribute('aria-expanded', 'true');
  await expect(group(page, 'Grotte')).toHaveAttribute('aria-expanded', 'true');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey)).toEqual(['Top-Out']);
});

for (const value of ['not-json', '{}', 'null', '[null,42,"",{"name":"Bug"}]']) {
  test(`invalid saved state is harmless: ${value}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value });
    await open(page);
    await expect(group(page, 'Bug')).toHaveAttribute('aria-expanded', 'true');
    await group(page, 'Bug').click();
    await expect(group(page, 'Bug')).toHaveAttribute('aria-expanded', 'false');
    expect(errors).toEqual([]);
  });
}

test('blocked browser storage does not prevent using the list', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  });
  await open(page);
  await group(page, 'Bug').click();
  await expect(group(page, 'Bug')).toHaveAttribute('aria-expanded', 'false');
  await group(page, 'Bug').click();
  await expect(group(page, 'Bug')).toHaveAttribute('aria-expanded', 'true');
  expect(errors).toEqual([]);
});
