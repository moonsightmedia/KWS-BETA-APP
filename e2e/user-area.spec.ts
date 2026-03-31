import { expect, test, type Page } from '@playwright/test';

const testEmail = process.env.E2E_TEST_EMAIL;
const testPassword = process.env.E2E_TEST_PASSWORD;

async function dismissOnboardingIfPresent(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Willkommen!' });

  if (await dialog.isVisible().catch(() => false)) {
    await dialog.locator('button').first().click();
    await expect(dialog).toBeHidden();
  }
}

async function login(page: Page) {
  if (!testEmail || !testPassword) {
    test.skip(true, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run authenticated user tests.');
  }

  await page.goto('/auth');
  await dismissOnboardingIfPresent(page);
  await expect(page.locator('#login-email')).toBeVisible();

  await page.locator('#login-email').fill(testEmail!);
  await page.locator('#login-password').fill(testPassword!);
  await page.locator('#login-password').press('Enter');

  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: /Bereit für deine Session\?/i })).toBeVisible();
}

test.describe('Public user area', () => {
  test('auth page exposes login, signup and guest entry', async ({ page }) => {
    await page.goto('/auth');
    await dismissOnboardingIfPresent(page);

    await expect(page.getByText(/Willkommen bei der Kletterwelt Sauerland Beta App/i)).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Anmelden' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Registrieren' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Als Gast fortfahren' })).toBeVisible();
  });

  test('guest mode stays reachable and search filter works', async ({ page }) => {
    await page.goto('/guest');
    await dismissOnboardingIfPresent(page);

    await expect(page.getByText(/^BOULDER$/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Mehr erfahren/i })).toBeVisible();
    await expect(page.getByPlaceholder('Suchen...')).toBeVisible();

    await expect(page.getByText(/\d+\s+Treffer/i).first()).toBeVisible();
    await page.getByPlaceholder('Suchen...').fill('zzzzzzzzzz-unlikely-e2e-hit');
    await expect(page.getByText(/^0 Treffer$/).first()).toBeVisible();

    await page.getByRole('button', { name: /Mehr erfahren/i }).click();
    await expect(page).toHaveURL(/\/auth$/);
  });

  test('protected user routes fall back to guest without login', async ({ page }) => {
    await page.goto('/profile');
    await dismissOnboardingIfPresent(page);

    await expect(page).toHaveURL(/\/guest$/, { timeout: 15_000 });
    await expect(page.getByText(/^BOULDER$/)).toBeVisible();
  });
});

test.describe('Authenticated user area', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard, boulder list, notifications and logout work for logged in users', async ({ page }) => {
    await expect(page.getByText(/Deine Woche/i)).toBeVisible();
    await expect(page.getByText(/Nächster Boulder/i)).toBeVisible();

    await page.goto('/boulders');
    await expect(page.getByRole('heading', { name: 'Boulder' })).toBeVisible();
    await expect(page.getByPlaceholder('Boulder suchen...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filter' })).toBeVisible();

    await page.goto('/profile');
    await expect(page.getByRole('button', { name: 'Profil bearbeiten' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Benachrichtigungen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abmelden' })).toBeVisible();

    await page.getByRole('button', { name: 'Benachrichtigungen' }).click();
    await expect(page).toHaveURL(/\/profile\/notifications$/);
    await expect(page.getByRole('heading', { name: 'Benachrichtigungen' })).toBeVisible();
    await expect(page.getByText(/In-App Benachrichtigungen/i)).toBeVisible();
    await expect(page.getByText(/Browser-Push ist in der Web-Beta deaktiviert/i)).toBeVisible();

    await page.goto('/profile');
    await page.getByRole('button', { name: 'Abmelden' }).click();
    await expect(page).toHaveURL(/\/auth$/, { timeout: 20_000 });
  });
});
