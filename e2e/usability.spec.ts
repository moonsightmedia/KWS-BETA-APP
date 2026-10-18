import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const output = 'output/usability';
test.use({ trace: 'off', video: 'off' });

async function isolate(page: Page, rating = false) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const hook of ['useAuth', 'useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps', 'useHasRole', 'useIsAdmin']) {
    await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({ contentType: 'application/javascript', body: `export * from '/test/fixtures/${rating ? 'rating' : 'continuity'}-hooks.ts';` }));
  }
  await page.route('**/src/contexts/UploadContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useUpload } from '/test/fixtures/setter-hooks.ts';" }));
  await page.route('**/src/components/NotificationCenter.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const NotificationCenter = () => null;' }));
  if (!rating) await page.route('**/src/components/boulder/BoulderDetailSections.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const BoulderInfoTab=()=>null;export const BoulderTrackTab=()=>null;export const BoulderBetaTab=()=>null;' }));
  return errors;
}
async function snapshot(page: Page, name: string) {
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}
for (const width of [375, 768, 1280, 1920]) {
  for (const view of ['guest', 'boulders']) test(`${view} search distinguishes results from stock (${width})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await isolate(page);
    await page.goto('/test/fixtures/boulder-continuity.html?start=/' + view);
    await page.getByRole('button', { name: 'Boulder suchen', exact: true }).click();
    const search = page.getByRole('textbox', { name: 'Boulder oder Bereich suchen', exact: true });
    await expect(search).toBeFocused();
    await search.fill('Kleine');
    await expect(page.locator('[aria-live=polite]').filter({ hasText: /\d+ Treffer/ })).toBeVisible();
    await snapshot(page, `${view}-results-${width}`);
    await search.fill('KeinBoulderMitDiesemNamen');
    await expect(page.locator('[aria-live=polite]').filter({ hasText: '0 Treffer' })).toBeVisible();
    await expect(page.getByText('0 aktuelle Boulder', { exact: false })).toHaveCount(0);
    await snapshot(page, `${view}-empty-${width}`);
    await search.fill('');
    await expect(page.locator('[aria-live=polite]').filter({ hasText: view === 'guest' ? /\d+ aktuelle Boulder/ : /\d+ Boulder/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
  test(`rating names, saved state, keyboard and touch targets (${width})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await isolate(page, true);
    await page.goto('/test/fixtures/rating.html');
    const group = page.getByRole('group', { name: 'Deine Bewertung' });
    await expect(group.getByRole('button')).toHaveCount(5);
    for (let star = 1; star <= 5; star++) {
      const button = group.getByRole('button', { name: `${star} von 5 Sternen`, exact: true });
      await expect(button).toHaveAttribute('aria-pressed', String(star === 3));
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const target = group.getByRole('button', { name: '4 von 5 Sternen' });
    await target.focus();
    await snapshot(page, `rating-focus-${width}`);
    await target.press('Enter');
    await expect(target).toBeDisabled();
    await expect(target).toBeEnabled();
    await expect(target).toHaveAttribute('aria-pressed', 'true');
    await expect(group.getByRole('button', { pressed: true })).toHaveCount(1);
    await snapshot(page, `rating-saved-${width}`);
    expect(errors).toEqual([]);
  });
}
test('failed rating keeps the saved selection and permits retry', async ({ page }) => {
  const errors = await isolate(page, true);
  await page.goto('/test/fixtures/rating.html?writeError=1');
  const target = page.getByRole('button', { name: '5 von 5 Sternen' });
  await target.click();
  await expect(page.getByText('Bewertung nicht gespeichert', { exact: true })).toBeVisible();
  await expect(target).toBeEnabled();
  await expect(target).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: '3 von 5 Sternen' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});
