import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const directory = 'test-results/admin-workspace-20260913';
test.beforeEach(async ({ page }) => {
  await mkdir(directory, { recursive: true });
  page.on('pageerror', error => { throw error; });
});
async function openFixture(page: Page, query = '') {
  await page.route('**/*.supabase.co/**', route => route.abort());
  await page.route(/\/src\/hooks\/(useAuth\.tsx|useIsAdmin\.tsx|useHasRole\.ts)(\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-foundations-hooks.ts';" }));
  await page.route('**/src/integrations/supabase/client.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export { supabase } from '/test/fixtures/admin-foundations-hooks.ts';" }));
  await page.route('**/src/hooks/useNotifications.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export const useNotifications=()=>({data:[],isLoading:false,isError:false,refetch:()=>{}}); export const useUnreadCount=()=>({data:0}); export const useMarkAsRead=()=>({mutate:()=>{},isPending:false}); export const useMarkAllAsRead=useMarkAsRead;" }));
  await page.route('**/src/components/DashboardHeader.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export const DashboardHeader = () => null; export const AdminTabTitleProvider = ({children}) => children;" }));
  await page.route(/\/src\/components\/admin\/(ColorManagement|SectorManagement|HallMapManagement|BoulderOperationLogs|FeedbackManagement|PushNotificationTest)\.tsx(\?.*)?$/, route => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!.replace('.tsx', '');
    return route.fulfill({ contentType: 'application/javascript', body: `export const ${name} = () => 'Isoliert: ${name}';` });
  });
  await page.goto('/test/fixtures/admin-foundations.html?' + query);
}
test('compact user roles/search/pagination and explicit confirmation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openFixture(page, 'many=1');
  await expect(page.locator('article')).toHaveCount(24);
  await page.getByRole('button', { name: 'Weitere 19 anzeigen' }).click();
  await expect(page.locator('article')).toHaveCount(43);
  await page.getByRole('button', { name: 'Setter', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(2);
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await page.getByRole('textbox', { name: 'Benutzer nach Name oder E-Mail suchen' }).fill('Alexandra Bergmann');
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true }).click();
  await page.getByRole('switch', { name: 'Admin-Rechte', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Alexandra Bergmann');
  expect(await page.evaluate(() => window.adminQA.writes)).toEqual([]);
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.getByRole('switch', { name: 'Admin-Rechte', exact: true }).click();
  await page.evaluate(() => { window.adminQA.writeMode = 'empty'; });
  await page.getByRole('button', { name: 'Bestätigen', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('nicht bestätigt');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.evaluate(() => { window.adminQA.writeMode = 'success'; window.adminQA.delay = 600; });
  await page.getByRole('button', { name: 'Bestätigen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bestätigen', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Admin-Rechte', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Passwort-E-Mail', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('alexandra@example.test');
  expect(await page.evaluate(() => window.adminQA.writes.length)).toBe(2);
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.adminQA.writes.length)).toBe(2);
  await page.getByRole('button', { name: 'Passwort-E-Mail', exact: true }).click();
  await page.evaluate(() => { window.adminQA.writeMode = 'fail'; });
  await page.getByRole('button', { name: 'E-Mail anfordern' }).click();
  await expect(page.getByRole('alert')).toContainText('nicht angefordert');
  await page.evaluate(() => { window.adminQA.writeMode = 'success'; });
  await page.getByRole('button', { name: 'E-Mail anfordern' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});
test('sheet geometry, draft protection and fixed actions at mobile widths', async ({ page }) => {
  for (const width of [375, 767, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 700 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openFixture(page);
    await page.getByRole('heading', { name: 'Alexandra Bergmann' }).click();
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    const geometry = await dialog.evaluate(el => {
      const css = getComputedStyle(el);
      return { tl: css.borderTopLeftRadius, bl: css.borderBottomLeftRadius };
    });
    if (width < 768) {
      expect(box.x).toBe(0); expect(box.width).toBe(width); expect(box.y + box.height).toBeCloseTo(700, 0);
      expect(geometry).toEqual({ tl: '12px', bl: '0px' });
      await expect(dialog).toHaveCSS('overflow-y', 'hidden');
    } else {
      expect(box.width).toBeLessThanOrEqual(520);
      expect(geometry).toEqual({ tl: '12px', bl: '12px' });
    }
    await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeInViewport();
    await page.screenshot({ path: directory + '/after-profile-' + width + '.png', animations: 'disabled' });
    await page.getByLabel('Vorname', { exact: true }).fill('Alex');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Weiter bearbeiten', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByLabel('Vorname', { exact: true })).toHaveValue('Alex');
    expect(await page.evaluate(() => window.adminQA.writes)).toEqual([]);
  }
});
test('touch-only profile tap opens and switches area', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, baseURL: String(testInfo.project.use.baseURL) });
  try {
    const page = await context.newPage();
    await openFixture(page, 'menus=1');
    await page.getByRole('button', { name: 'Profil', exact: true }).tap();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.getByRole('menuitem', { name: /Administration/ }).tap();
    await expect(page.getByTestId('current-route')).toHaveText('/admin?tab=users');
    await expect(page.getByRole('menu')).toHaveCount(0);
  } finally { await context.close(); }
});
test('capture user list', async ({ page }) => {
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await openFixture(page, 'many=1');
    await expect(page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true })).toBeVisible();
    await page.screenshot({ path: directory + '/' + (process.env.ADMIN_CAPTURE_PHASE || 'after') + '-users-' + width + '.png', animations: 'disabled' });
  }
});
test('desktop profile hover, pin, navigation and keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openFixture(page, 'menus=1');
  const trigger = page.getByRole('button', { name: /Profil und Einstellungen/ });
  await trigger.hover();
  await expect(page.getByRole('menu')).toBeVisible();
  await trigger.click();
  await page.getByRole('button', { name: 'Außerhalb', exact: true }).hover();
  await page.waitForTimeout(400); // specifically exercises the 300ms hover-close timer
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menuitem', { name: /Administration/ }).click();
  await expect(page.getByTestId('current-route')).toHaveText('/admin?tab=users');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.hover();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menuitem', { name: /Profil & Einstellungen/ }).hover();
  await page.waitForTimeout(400);
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('button', { name: 'Außerhalb', exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  // A direct mouse click never enters the hover-preview state, but must remain
  // open when the pointer subsequently leaves the trigger.
  await trigger.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('button', { name: 'Außerhalb', exact: true }).hover();
  await page.waitForTimeout(400);
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('button', { name: 'Außerhalb', exact: true }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
});
test('mobile profile tap switches area and notification hover stays pinned', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openFixture(page, 'menus=1');
  await page.getByRole('button', { name: 'Profil', exact: true }).click();
  await page.getByRole('menuitem', { name: /Administration/ }).click();
  await expect(page.getByTestId('current-route')).toHaveText('/admin?tab=users');
  await page.setViewportSize({ width: 1280, height: 900 });
  const trigger = page.getByRole('button', { name: 'Benachrichtigungen', exact: true });
  await trigger.hover();
  await expect(page.getByRole('dialog')).toBeVisible();
  await trigger.click();
  await page.getByRole('button', { name: 'Außerhalb', exact: true }).hover();
  await page.waitForTimeout(400);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
