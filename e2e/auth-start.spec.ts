import { expect, test, type Page } from '@playwright/test';

test.use({ trace: 'off', video: 'off' });
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const token = (version: number) => `fixture.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, version })).toString('base64url')}.fake`;
const session = (expired = false) => ({ access_token: token(1), refresh_token: expired ? 'expired-fixture' : 'current-fixture', expires_at: Math.floor(Date.now() / 1000) + (expired ? -60 : 3600), expires_in: 3600, token_type: 'bearer', user });

async function open(page: Page, options: { native?: boolean; stuckLock?: boolean; expired?: boolean; seeded?: boolean } = {}) {
  page.on('pageerror', error => console.error('Fixture runtime:', error.message));
  const state = { logins: 0, rejectedRefreshes: 0, refreshes: 0, badPassword: false, reports: [] as string[] };
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.addInitScript(({ native, stuckLock, expired, seeded, stored }) => {
    Object.assign(window, { authStartDocument: crypto.randomUUID(), authStartLockCalls: 0 });
    if (native) Object.assign(window, { CapacitorCustomPlatform: { name: 'ios' } });
    if (stuckLock) {
      const locks = navigator.locks;
      let release: () => void;
      const pending = new Promise<void>(resolve => { release = resolve; });
      Object.assign(window, { releaseAuthStartLock: () => release() });
      Object.defineProperty(navigator, 'locks', { configurable: true, value: {
        request: (...args: Parameters<LockManager['request']>) => {
          (window as unknown as { authStartLockCalls: number }).authStartLockCalls++;
          return pending.then(() => Reflect.apply(locks.request, locks, args));
        },
      } });
    }
    if ((expired || seeded) && !sessionStorage.getItem('auth-start-seeded')) {
      localStorage.setItem('qa-auth-start', stored);
      sessionStorage.setItem('auth-start-seeded', 'true');
    }
  }, { ...options, stored: JSON.stringify(session(options.expired)) });
  await page.route('**/src/lib/backendConfig.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export const backendConfig={supabaseUrl:location.origin+'/qa/supabase',publicKey:'fixture-public-only',authStorageKey:'qa-auth-start',authSiteUrl:location.origin,environment:'production'};
    export const backendStorageKey=key=>key;export const isReviewEnvironment=false;export const isReviewAvailable=false;export const switchBackendEnvironment=()=>{};
  ` }));
  await page.route('**/src/hooks/usePreloadSectorImages.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const usePreloadSectorImages=()=>{};' }));
  await page.route('**/src/utils/monitoring.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export const reportMonitoringError=error=>fetch('/qa/report',{method:'POST',body:JSON.stringify({name:error.name})});
    export const reportSessionLoss=()=>{};export const trackAuthenticationFailure=()=>{};export const trackMonitoring=()=>{};
  ` }));
  await page.route('**/qa/report', async route => { state.reports.push(route.request().postDataJSON().name); await route.fulfill({ json: {} }); });
  await page.route('**/qa/supabase/auth/v1/**', async route => {
    if (new URL(route.request().url()).pathname.endsWith('/token')) {
      const password = new URL(route.request().url()).searchParams.get('grant_type') === 'password';
      if (password) state.logins++; else state.refreshes++;
      if (password && state.badPassword) {
        await route.fulfill({ status: 400, json: { code: 'invalid_credentials', message: 'Invalid login credentials' } }); return;
      }
      if (!password && route.request().postDataJSON().refresh_token === 'expired-fixture') {
        state.rejectedRefreshes++;
        await route.fulfill({ status: 400, json: { code: 'refresh_token_not_found', message: 'Invalid Refresh Token: Refresh Token Not Found' } }); return;
      }
      await route.fulfill({ json: { ...session(), access_token: token(2) } });
    } else await route.fulfill({ json: { user } });
  });
  await page.route('**/qa/supabase/rest/v1/**', async route => {
    const profile = new URL(route.request().url()).pathname.endsWith('/profiles');
    await route.fulfill({ json: profile ? { id: user.id, email: user.email } : [] });
  });
  await page.goto('/test/fixtures/auth-start.html');
  return state;
}

for (const native of [true, false]) test(`${native ? 'native' : 'web'} expired session can sign in and survive a cold reload`, async ({ page }) => {
  const state = await open(page, { native, stuckLock: native, expired: true });
  await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
  expect(state.rejectedRefreshes).toBe(1);
  const documentId = await page.evaluate(() => (window as unknown as { authStartDocument: string }).authStartDocument);
  await page.getByLabel('E-Mail', { exact: true }).fill(user.email);
  await page.getByLabel('Passwort', { exact: true }).fill('fixture-password-only');
  await page.getByRole('button', { name: 'Anmelden', exact: true }).last().click();
  await expect(page.getByTestId('protected-home')).toBeVisible();
  expect(state.logins).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { authStartDocument: string }).authStartDocument)).toBe(documentId);
  if (native) expect(await page.evaluate(() => (window as unknown as { authStartLockCalls: number }).authStartLockCalls)).toBe(0);
  await page.reload();
  await expect(page.getByTestId('protected-home')).toBeVisible();
  expect(state.logins).toBe(1);
  expect(state.reports).toEqual([]);
  if (native) {
    // Native serialization must still coordinate parallel expired-session reads.
    const values = await page.evaluate(async () => {
      const stored = JSON.parse(localStorage.getItem('qa-auth-start')!);
      stored.expires_at = Math.floor(Date.now() / 1000) - 60;
      localStorage.setItem('qa-auth-start', JSON.stringify(stored));
      const { supabase } = await import('/src/integrations/supabase/client.ts');
      const results = await Promise.all(Array.from({ length: 6 }, () => supabase.auth.getSession()));
      return results.map(result => result.data.session?.access_token);
    });
    expect(values.every(Boolean)).toBe(true);
    expect(new Set(values).size).toBe(1);
    expect(state.refreshes).toBe(2); // One rejected old token, one coordinated refresh.
  }
});

test('unfinished browser session initialization stays pending and reports instead of becoming guest', async ({ page }) => {
  const state = await open(page, { seeded: true, stuckLock: true });
  await expect(page.getByRole('status', { name: 'App wird geladen …' })).toBeVisible();
  await expect.poll(() => state.reports, { timeout: 8000 }).toContain('AuthenticationInitializationTimeout');
  await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toHaveCount(0);
  await expect(page.getByTestId('guest-home')).toHaveCount(0);
  await expect(page.getByRole('status', { name: 'App wird geladen …' })).toBeVisible();
  await page.evaluate(() => (window as unknown as { releaseAuthStartLock: () => void }).releaseAuthStartLock());
  await expect(page.getByTestId('protected-home')).toBeVisible();
});

test('wrong password remains on the login form without entering protected or guest routes', async ({ page }) => {
  const state = await open(page, { native: true }); state.badPassword = true;
  await page.getByLabel('E-Mail', { exact: true }).fill(user.email);
  await page.getByLabel('Passwort', { exact: true }).fill('fixture-wrong-password');
  await page.getByRole('button', { name: 'Anmelden', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
  await expect(page.getByTestId('protected-home')).toHaveCount(0);
  await expect(page.getByTestId('guest-home')).toHaveCount(0);
  expect(state.logins).toBe(1);
  expect(state.reports).toEqual([]);
});
