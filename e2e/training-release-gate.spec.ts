import { test, expect } from '@playwright/test';

for (const width of [375, 768, 1280, 1920]) {
  test(`unreleased training is absent from authenticated navigation and direct links at ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1') return route.continue();
      if (url.hostname === 'api.fixture.invalid') return route.fulfill({ json: [] });
      return route.abort();
    });
    await page.route('**/src/hooks/useAuth.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
      const user = { id:'11111111-1111-4111-8111-111111111111', email:'release@example.invalid', user_metadata:{first_name:'Alex'} };
      export const AuthProvider = ({children}) => children;
      export const useAuth = () => ({ user, session:{user,access_token:'fixture-only'}, loading:false, authTransition:null, reauthRequired:false, signOut:async()=>{} });
    ` }));
    await page.route('**/src/hooks/useHasRole.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useHasRole=()=>({hasRole:false,loading:false});' }));
    await page.route('**/src/hooks/useIsAdmin.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useIsAdmin=()=>({isAdmin:false,loading:false});' }));
    await page.route('**/src/hooks/useNotificationRuntime.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useNotificationRuntime=()=>{};' }));

    // Loop 1: actual profile and shared desktop/mobile navigation.
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Profil', exact: true })).toBeVisible();
    await expect(page.locator('a[href="/training"], a[href="/profile/training"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Training/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Schraubplan/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `test-results/training-release-gate/profile-${width}.png` });

    // Loop 2: known deep links and settings cannot reopen the unfinished area.
    for (const path of ['/training', '/training/library', '/profile/training']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Hier geht’s nicht weiter.' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Trainingschat öffnen' })).toHaveCount(0);
      await expect(page.locator('a[href="/training"], a[href="/profile/training"]')).toHaveCount(0);
    }
    await page.getByRole('link', { name: /Boulder ansehen/ }).focus();
    await expect(page.getByRole('link', { name: /Boulder ansehen/ })).toBeFocused();
    await page.goto('/schedule');
    await expect(page.getByRole('heading', { name: 'Schraubplan', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Kalender', exact: true }).click();
    await expect(page.locator('[data-schedule-calendar]')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
