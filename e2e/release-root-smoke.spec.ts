import { test, expect } from '@playwright/test';

// Actual App router/providers; synthetic identity and read-only API responses.
for (const width of [375, 768, 1280, 1920]) {
  test(`integrated root exposes training and public schedule at ${width}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1') return route.continue();
      if (url.hostname === 'api.fixture.invalid') return route.fulfill({ json: [] });
      return route.abort();
    });
    await page.route('**/src/hooks/useAuth.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
      import React from '/node_modules/.vite/deps/react.js';
      const guest = location.search.includes('qaGuest');
      const user = guest ? null : { id:'11111111-1111-4111-8111-111111111111', email:'release@example.invalid', user_metadata:{first_name:'Alex'} };
      export const AuthProvider = ({children}) => children;
      export const useAuth = () => ({ user, session:user ? {user,access_token:'fixture-only'} : null, loading:false, authTransition:null, reauthRequired:false, signOut:async()=>{} });
    ` }));
    await page.route('**/src/hooks/useHasRole.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useHasRole=()=>({hasRole:false,loading:false});' }));
    await page.route('**/src/hooks/useIsAdmin.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useIsAdmin=()=>({isAdmin:false,loading:false});' }));
    await page.route('**/src/hooks/useNotificationRuntime.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useNotificationRuntime=()=>{};' }));
    await page.goto('/training');
    await page.getByRole('button', { name: 'Überspringen', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Training', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Eigene Einheiten/ })).toBeVisible();
    await page.goto('/schedule?qaGuest=1');
    await expect(page.getByRole('heading', { name: 'Schraubplan', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Noch keine Umschraubung geplant', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Kalender', exact: true }).click();
    await expect(page.locator('[data-schedule-calendar]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}
