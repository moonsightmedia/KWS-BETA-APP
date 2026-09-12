import { expect, test, type Page } from '@playwright/test';

async function mockChrome(page: Page, sidebar = false) {
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
  await page.goto(`/test/fixtures/app-chrome.html${sidebar ? '?sidebar' : ''}`);
}

for (const width of [375, 768, 1280, 1920]) {
  test(`grade labels remain centered before and after selection at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockChrome(page);
    await page.getByRole('button', { name: 'Filtertest' }).click();
    const grades = page.getByRole('region', { name: 'Schwierigkeit', exact: true }).getByRole('button');
    await expect(grades).toHaveCount(9);
    const checkCenters = async () => {
      const offsets = await grades.evaluateAll((buttons) => buttons.map((button) => {
        const control = button.getBoundingClientRect();
        const label = button.querySelector('span')!.getBoundingClientRect();
        return { x: Math.abs(label.x + label.width / 2 - control.x - control.width / 2), y: Math.abs(label.y + label.height / 2 - control.y - control.height / 2) };
      }));
      for (const offset of offsets) {
        expect(offset.x).toBeLessThan(1);
        expect(offset.y).toBeLessThan(1);
      }
    };
    await checkCenters();
    for (const grade of await grades.all()) await grade.click();
    await expect(page.getByText('9 Filter aktiv')).toBeVisible();
    await checkCenters();
    await expect(grades.first().locator('svg')).toBeVisible();
    await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
    await checkCenters();
    await expect(grades.first()).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width);
    await page.screenshot({ path: `test-results/sidebar-polish-20260912/filter-${width}.png` });
  });
}

for (const width of [768, 1280, 1920]) {
  test(`sidebar and content move together with stable icons at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockChrome(page, true);
    const sidebar = page.locator('#desktop-navigation');
    const content = page.locator('.kws-sidebar-content');
    const collapse = page.getByRole('button', { name: 'Navigation einklappen', exact: true });
    await expect(sidebar).toHaveCSS('width', '256px');
    await expect(content).toHaveCSS('margin-left', '256px');
    await expect(content).toHaveCSS('transition-duration', '0.24s');
    const home = sidebar.getByRole('link', { name: 'Home', exact: true });
    const iconBefore = await home.locator('svg').boundingBox();
    const profile = sidebar.getByRole('button', { name: /Profil und Einstellungen/ });
    const profileBefore = await profile.boundingBox();
    await page.screenshot({ path: `test-results/sidebar-polish-20260912/sidebar-expanded-${width}.png` });
    // Sample every rendered frame, not just the settled endpoints.
    const frames = await collapse.evaluate(async (button) => {
      const sidebar = document.querySelector('#desktop-navigation')!;
      const content = document.querySelector('.kws-sidebar-content')!;
      const originalIcon = sidebar.querySelector('nav a svg');
      const samples: { width: number; margin: number; sameIcon: boolean }[] = [];
      (button as HTMLButtonElement).click();
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const sample = () => {
          samples.push({ width: sidebar.getBoundingClientRect().width, margin: parseFloat(getComputedStyle(content).marginLeft), sameIcon: sidebar.querySelector('nav a svg') === originalIcon });
          if (performance.now() - start < 350) requestAnimationFrame(sample);
          else resolve();
        };
        requestAnimationFrame(sample);
      });
      return samples;
    });
    expect(frames.some((frame) => frame.width > 85 && frame.width < 250)).toBe(true);
    for (const frame of frames) {
      expect(Math.abs(frame.width - frame.margin)).toBeLessThan(1);
      expect(frame.sameIcon).toBe(true);
    }
    await expect(sidebar).toHaveCSS('width', '80px');
    expect(await home.locator('svg').boundingBox()).toEqual(iconBefore);
    const profileAfter = await profile.boundingBox();
    expect(profileAfter!.y).toBe(profileBefore!.y);
    expect(profileAfter!.height).toBe(profileBefore!.height);
    await page.screenshot({ path: `test-results/sidebar-polish-20260912/sidebar-collapsed-${width}.png` });
    const expand = page.getByRole('button', { name: 'Navigation ausklappen', exact: true });
    await expand.focus();
    await page.keyboard.press('Enter');
    await expect(sidebar).toHaveCSS('width', '256px');
    await expect(collapse).toBeFocused();
    await expect(content).toHaveCSS('margin-left', '256px');
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width);
  });
}

test('sidebar reverses cleanly during a transition and respects reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockChrome(page, true);
  const toggle = page.locator('button[aria-controls="desktop-navigation"]');
  await toggle.evaluate(async (button) => {
    for (let i = 0; i < 4; i++) {
      (button as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 65));
    }
  });
  await expect(page.locator('#desktop-navigation')).toHaveCSS('width', '256px');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#desktop-navigation')).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('.kws-sidebar-content')).toHaveCSS('transition-duration', '0s');
  await toggle.click();
  await expect(page.locator('#desktop-navigation')).toHaveCSS('width', '80px');
  await expect(page.locator('.kws-sidebar-content')).toHaveCSS('margin-left', '80px');
});

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
