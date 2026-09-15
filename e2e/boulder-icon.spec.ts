import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'test-results/boulder-icon-refined-20260915';
test.use({ trace: 'off', video: 'off' });

test('original hold matches the icon grid and family', async ({ page }) => {
  await page.setViewportSize({ width: 520, height: 470 });
  await page.goto('/test/fixtures/boulder-icon.html');
  await page.evaluate(() => document.fonts.ready);
  await mkdir(output, { recursive: true });
  await expect(page.locator('svg.lucide-kws-boulder')).toHaveCount(6);
  for (const icon of await page.locator('svg.lucide-kws-boulder').all()) {
    await expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
    await expect(icon).toHaveCSS('stroke-width', '1.75px');
    await expect(icon.locator('path')).toHaveCount(1);
    await expect(icon.locator('circle')).toHaveCount(1);
    await expect(icon.locator('circle')).toHaveAttribute('cx', '12');
    await expect(icon.locator('circle')).toHaveAttribute('cy', '12');
  }
  await page.screenshot({ path: `${output}/icon-family.png`, animations: 'disabled' });
});

for (const width of [375, 768, 1280, 1920]) {
  test(`navigation active, inactive and keyboard ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
    for (const [hook, body] of [
      ['useAuth', "export const useAuth=()=>({user:{id:'icon-test',email:'test@example.invalid'},loading:false,signOut(){}});"],
      ['useHasRole', 'export const useHasRole=()=>({hasRole:false,loading:false});'],
      ['useIsAdmin', 'export const useIsAdmin=()=>({isAdmin:false,loading:false});'],
      ['useNotifications', 'export const useUnreadCount=()=>({data:0}); export const useNotifications=()=>({data:[],isLoading:false}); export const useMarkAsRead=()=>({mutate(){}}); export const useMarkAllAsRead=useMarkAsRead;'],
    ]) await page.route(`**/src/hooks/${hook}.ts*`, r => r.fulfill({ contentType: 'text/javascript', body }));
    await page.goto('/test/fixtures/app-chrome.html?sidebar&route=/boulders');
    await page.evaluate(() => document.fonts.ready);
    const nav = page.locator(width < 768 ? 'nav:visible' : '#desktop-navigation');
    const boulders = nav.getByRole('link', { name: 'Boulder', exact: true });
    await expect(boulders).toHaveAttribute('aria-current', 'page');
    await expect(boulders.locator('.lucide-kws-boulder')).toBeVisible();
    await expect(boulders).toHaveAttribute('href', '/boulders');
    await mkdir(output, { recursive: true });
    await page.screenshot({ path: `${output}/active-${width}.png`, animations: 'disabled' });
    await nav.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(boulders).not.toHaveAttribute('aria-current', 'page');
    const boxBefore = await boulders.boundingBox();
    await page.keyboard.press('Tab');
    await expect(boulders).toBeFocused();
    await page.screenshot({ path: `${output}/focus-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Enter');
    await expect(boulders).toHaveAttribute('aria-current', 'page');
    expect(await boulders.boundingBox()).toEqual(boxBefore);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}
