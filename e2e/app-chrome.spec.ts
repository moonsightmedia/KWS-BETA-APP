import { expect, test, type Page } from '@playwright/test';

async function mockChrome(page: Page) {
  await page.route('**/src/hooks/useAuth.tsx*', (route) => route.fulfill({ contentType: 'text/javascript', body: `export const useAuth = () => ({ user: { id: 'ui-test', email: 'test@example.invalid' }, signOut() {}, authTransition: null });` }));
  await page.route('**/src/hooks/useIsAdmin.ts*', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export const useIsAdmin = () => ({ isAdmin: true });' }));
  await page.route('**/src/hooks/useHasRole.ts*', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export const useHasRole = () => ({ hasRole: true });' }));
  await page.route('**/src/hooks/useNotifications.tsx*', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    export const useUnreadCount = () => ({ data: 1 });
    export const useNotifications = () => ({ data: [{ id: 'notice', title: 'Neue Boulder', message: 'Testmitteilung', read: false, type: 'boulder_new', created_at: '2026-09-11T12:00:00Z' }], isLoading: false, isError: false, refetch() {} });
    export const useMarkAsRead = () => ({ mutate() {}, isPending: false });
    export const useMarkAllAsRead = useMarkAsRead;
  ` }));
  // This fixture must never call a real backend, including accidental auth imports.
  await page.route('**/*.supabase.co/**', (route) => route.abort());
  await page.goto('/test/fixtures/app-chrome.html');
}

test('hover opens both menus, crosses the portal gap and closes without trapping the mouse', async ({ page }) => {
  await mockChrome(page);
  const profile = page.getByRole('button', { name: 'Profil', exact: true });
  await profile.hover();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menuitem', { name: 'Profil & Einstellungen' }).hover();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('button', { name: 'Außerhalb' }).hover();
  await expect(page.getByRole('menu')).toBeHidden();
  const bell = page.getByRole('button', { name: 'Benachrichtigungen' });
  await bell.hover();
  await expect(page.getByRole('dialog', { name: 'Benachrichtigungen' })).toBeVisible();
  await page.getByRole('button', { name: 'Einstellungen öffnen' }).hover();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Außerhalb' }).hover();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('hover does not steal focus; clicking pins a preview; Escape and keyboard still work', async ({ page }) => {
  await mockChrome(page);
  const outside = page.getByRole('button', { name: 'Außerhalb' });
  await outside.focus();
  const profile = page.getByRole('button', { name: 'Profil', exact: true });
  await profile.hover();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(outside).toBeFocused();
  await profile.click();
  await outside.hover();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(profile).toBeFocused();
  await profile.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Profil & Einstellungen' })).toBeFocused();
  await page.keyboard.press('Escape');
  const bell = page.getByRole('button', { name: 'Benachrichtigungen' });
  await bell.hover();
  await expect(page.getByRole('dialog')).toBeVisible();
  await bell.click();
  await outside.hover();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(bell).toBeFocused();
});

test('touch opens and closes menus without hover, with matching corner radii', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await mockChrome(page);
  const profile = page.getByRole('button', { name: 'Profil', exact: true });
  await profile.tap();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS('border-radius', '12px');
  await expect(page.getByRole('menuitem', { name: 'Profil & Einstellungen' })).toHaveCSS('border-radius', '4px');
  await page.getByRole('button', { name: 'Außerhalb' }).tap();
  await expect(menu).toBeHidden();
  await page.getByRole('button', { name: 'Benachrichtigungen' }).tap();
  await expect(page.getByRole('dialog')).toHaveCSS('border-radius', '12px');
  await context.close();
});

for (const width of [375, 768]) {
  test(`filter sheet at ${width}px supports multiple selections, reset and reachable results`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await mockChrome(page);
    await page.getByRole('button', { name: 'Filtertest' }).click();
    await expect(page.getByRole('dialog', { name: 'Boulder filtern' })).toBeVisible();
    await page.getByRole('button', { name: 'Farbe Rot', exact: true }).click();
    await page.getByRole('button', { name: 'Farbe Blau', exact: true }).click();
    await page.getByRole('button', { name: 'Grad 4', exact: true }).click();
    await expect(page.getByText('3 Filter aktiv')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Farbe Rot', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const results = page.getByRole('button', { name: '7 Boulder anzeigen' });
    await expect(results).toBeInViewport();
    await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
    await page.getByRole('button', { name: '104 Boulder anzeigen' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
}
