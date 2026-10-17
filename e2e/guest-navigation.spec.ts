import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, route = '/guest', loading = false) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', request => ['127.0.0.1', 'localhost'].includes(new URL(request.request().url()).hostname) ? request.continue() : request.abort());
  const hooks = `export const useAuth=()=>({user:null,loading:${loading}});export const useIsAdmin=()=>({isAdmin:false,loading:false});export const useHasRole=()=>({hasRole:false,loading:false});`;
  for (const hook of ['useAuth', 'useIsAdmin', 'useHasRole']) {
    await page.route(`**/src/hooks/${hook}.ts*`, request => request.fulfill({ contentType: 'application/javascript', body: hooks }));
  }
  await page.goto(`/test/fixtures/guest-navigation.html?route=${encodeURIComponent(route)}`);
  return errors;
}

test('session resolution and dedicated public flows keep guest navigation hidden', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of ['/auth/callback', '/reset-password', '/privacy']) {
    const errors = await open(page, route);
    await expect(page.getByTestId('route')).toHaveText(route);
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(0);
    expect(errors).toEqual([]);
  }
  const errors = await open(page, '/app/login', true);
  await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('mobile guest navigation stays mounted and active across account forms and history', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const errors = await open(page);
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await expect(nav).toBeVisible();
  await nav.evaluate(element => element.setAttribute('data-regression-instance', 'same-nav'));
  const account = nav.getByRole('link', { name: 'Anmelden', exact: true });
  await expect(nav.getByRole('link', { name: 'Boulder', exact: true })).toHaveAttribute('aria-current', 'page');
  await account.click();
  await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
  await expect(account).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('route')).toHaveText('/app/login');
  const modes = page.getByRole('group', { name: 'Zwischen Anmeldung und Registrierung wechseln' });
  await modes.getByRole('button', { name: 'Registrieren', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Konto erstellen' })).toBeVisible();
  await expect(account).toHaveAttribute('aria-current', 'page');
  await expect(nav).toHaveAttribute('data-regression-instance', 'same-nav');
  await page.getByLabel('Vorname', { exact: true }).fill('Entwurf');
  await modes.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await modes.getByRole('button', { name: 'Registrieren', exact: true }).click();
  await expect(page.getByLabel('Vorname', { exact: true })).toHaveValue('Entwurf');
  await nav.getByRole('link', { name: 'Boulder', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Boulderübersicht' })).toBeVisible();
  await page.getByRole('button', { name: 'Verlauf zurück', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Konto erstellen' })).toBeVisible();
  await expect(account).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Verlauf vorwärts', exact: true }).click();
  await expect(nav.getByRole('link', { name: 'Boulder', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(errors).toEqual([]);
});

for (const width of [375, 768, 1280, 1920]) {
  test(`auth aliases keep consistent navigation and form layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    const errors = await open(page, '/auth');
    const nav = page.locator('nav[aria-label="Hauptnavigation"]');
    await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
    await expect(nav.locator('a[aria-label="Anmelden"]')).toHaveAttribute('aria-current', 'page');
    if (width < 768) await expect(nav).toBeVisible();
    else await expect(nav).toBeHidden();
    await page.screenshot({ path: `output/guest-navigation/login-${width}.png`, animations: 'disabled' });
    await page.getByRole('group', { name: 'Zwischen Anmeldung und Registrierung wechseln' }).getByRole('button', { name: 'Registrieren', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Konto erstellen' })).toBeVisible();
    await expect(nav.locator('a[aria-label="Anmelden"]')).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: 'Als Gast fortfahren', exact: true }).scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.getByRole('button', { name: 'Als Gast fortfahren', exact: true })).toBeInViewport();
    expect(await page.locator('body').evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(width);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.screenshot({ path: `output/guest-navigation/register-${width}.png`, animations: 'disabled' });
    if (width < 768) {
      const action = await page.getByRole('button', { name: 'Als Gast fortfahren', exact: true }).boundingBox();
      const bar = await nav.boundingBox();
      expect(action!.y + action!.height).toBeLessThan(bar!.y);
    }
    expect(errors).toEqual([]);
  });
}
