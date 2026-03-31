import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

const testEmail = process.env.E2E_TEST_EMAIL;
const testPassword = process.env.E2E_TEST_PASSWORD;
const envFile = readFileSync('.env.local', 'utf8');

function getEnvValue(key: string) {
  const match = envFile.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match?.[1]?.trim() ?? '';
}

const supabaseUrl = getEnvValue('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvValue('VITE_SUPABASE_PUBLISHABLE_KEY');

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
  await expect(page.getByRole('heading', { name: /Bereit f.r deine Session\?/i })).toBeVisible();
}

async function openFirstBoulder(page: Page) {
  await page.goto('/boulders');
  await expect(page.getByPlaceholder('Boulder suchen...')).toBeVisible();

  let firstBoulderCard = page.locator('#boulder-results > button').first();
  await expect(firstBoulderCard).toBeVisible();

  const initialBoulderName = (await firstBoulderCard.locator('div.min-w-0.flex-1 span.truncate').first().textContent())?.trim();
  expect(initialBoulderName).toBeTruthy();

  const searchTerm = initialBoulderName!.split(' ')[0];
  await page.getByPlaceholder('Boulder suchen...').fill(searchTerm);
  await expect(page.locator('#boulder-results > button').first()).toContainText(searchTerm);

  await page.getByRole('button', { name: 'Sortierung' }).click();
  await page.getByRole('button', { name: 'Name A-Z' }).click();
  firstBoulderCard = page.locator('#boulder-results > button').first();
  const firstBoulderName = (await firstBoulderCard.locator('div.min-w-0.flex-1 span.truncate').first().textContent())?.trim();
  expect(firstBoulderName).toBeTruthy();

  await firstBoulderCard.click();
  await expect(page).toHaveURL(/\/boulders\/.+$/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: firstBoulderName! })).toBeVisible();

  const boulderId = page.url().split('/boulders/')[1]?.split('?')[0] ?? '';
  expect(boulderId).toBeTruthy();

  return { firstBoulderName, boulderId };
}

async function ensureMarkerIsActive(button: Locator) {
  const className = (await button.getAttribute('class')) ?? '';
  if (!className.includes('bg-primary/15')) {
    await button.click();
    await expect(button).toHaveClass(/bg-primary\/15/);
  }
}

async function getTodayAttemptCount(trackSection: Locator) {
  const text = await trackSection.textContent();
  const match = text?.match(/(\d+)\s+Versuch/);
  return match ? Number(match[1]) : 0;
}

async function resolveTodayAttemptCount(page: Page, trackSection: Locator) {
  const todayActionText =
    (await page.getByRole('button', { name: /Heute starten|Heute bearbeiten/ }).first().textContent()) ?? '';

  if (/Heute bearbeiten/i.test(todayActionText)) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const count = await getTodayAttemptCount(trackSection);
      if (count > 0) {
        return count;
      }

      await page.waitForTimeout(250);
    }
  }

  return getTodayAttemptCount(trackSection);
}

async function resetBoulderTrackingState(page: Page, boulderId: string) {
  const today = new Date().toISOString().slice(0, 10);

  await page.evaluate(
    async ({ anonKey, boulderId, supabaseUrl, today }) => {
      const authStorageKey = Object.keys(window.localStorage).find((key) => key.includes('-auth-token'));
      const rawSession = authStorageKey ? window.localStorage.getItem(authStorageKey) : null;
      const parsedSession = rawSession ? JSON.parse(rawSession) : null;
      const accessToken =
        parsedSession?.access_token ||
        parsedSession?.currentSession?.access_token ||
        parsedSession?.session?.access_token ||
        null;

      if (!accessToken) {
        throw new Error('Kein Access Token für den E2E-Reset gefunden.');
      }

      const headers = {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      };

      await Promise.all([
        window.fetch(
          `${supabaseUrl}/rest/v1/boulder_tracking_sessions?boulder_id=eq.${boulderId}&session_date=eq.${today}`,
          { method: 'DELETE', headers },
        ),
        window.fetch(
          `${supabaseUrl}/rest/v1/boulder_ticks?boulder_id=eq.${boulderId}`,
          { method: 'DELETE', headers },
        ),
      ]);
    },
    {
      supabaseUrl,
      anonKey: supabaseAnonKey,
      boulderId,
      today,
    },
  );
}

test.describe('Authenticated user functional area', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('profile name change saves and returns to the profile page', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('button', { name: 'Profil bearbeiten' })).toBeVisible();

    await page.getByRole('button', { name: 'Profil bearbeiten' }).click();
    await expect(page).toHaveURL(/\/profile\/edit$/);
    const saveButton = page.getByRole('button', { name: 'Speichern' });
    const resetPasswordButton = page.getByRole('button', { name: 'Passwort \u00e4ndern' });
    await expect(saveButton).toBeEnabled({ timeout: 20_000 });
    await expect(resetPasswordButton).toBeEnabled({ timeout: 20_000 });

    const nameInput = page.locator('#name');
    const originalName = (await nameInput.inputValue()).trim() || 'Kletterer';
    const temporaryName = `${originalName} QA`;

    await nameInput.fill(temporaryName);
    await saveButton.click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test('password reset trigger and notification preferences work', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('button', { name: 'Profil bearbeiten' })).toBeVisible();

    await page.getByRole('button', { name: 'Profil bearbeiten' }).click();
    await expect(page).toHaveURL(/\/profile\/edit$/);
    const saveButton = page.getByRole('button', { name: 'Speichern' });
    const resetPasswordButton = page.getByRole('button', { name: 'Passwort \u00e4ndern' });
    await expect(saveButton).toBeEnabled({ timeout: 20_000 });
    await expect(resetPasswordButton).toBeEnabled({ timeout: 20_000 });

    await resetPasswordButton.click();
    await expect(page.getByText(/Passwort-Link wurde an deine E-Mail gesendet!/i)).toBeVisible();
    await page.getByRole('button', { name: 'Zur\u00fcck' }).click();
    await expect(page).toHaveURL(/\/profile$/);

    await page.getByRole('button', { name: 'Benachrichtigungen' }).click();
    await expect(page).toHaveURL(/\/profile\/notifications$/);
    await expect(page.getByText(/Browser-Push ist in der Web-Beta deaktiviert/i)).toBeVisible();

    const switches = page.getByRole('switch');
    await expect(switches).toHaveCount(5);

    const newBouldersSwitch = switches.nth(2);
    const initialState = await newBouldersSwitch.getAttribute('aria-checked');
    const toggledState = initialState === 'true' ? 'false' : 'true';

    await newBouldersSwitch.click();
    await expect(newBouldersSwitch).toHaveAttribute('aria-checked', toggledState);

    await newBouldersSwitch.click();
    await expect(newBouldersSwitch).toHaveAttribute('aria-checked', initialState ?? 'true');
  });

  test('boulder detail tabs, rating and comments work', async ({ page }) => {
    await openFirstBoulder(page);

    await page.getByRole('button', { name: 'Beta' }).click();
    await expect(page.getByText(/Beta Videos/i)).toBeVisible();

    await page.getByRole('button', { name: 'Info' }).click();
    const ratingSection = page.locator('section').filter({ has: page.getByText('Bewertung') }).first();
    const fourthStar = ratingSection.locator('button').nth(3);
    await fourthStar.click();
    await expect(fourthStar.locator('svg')).toHaveClass(/fill-primary/);

    const fitsButton = page.getByRole('button', { name: 'Passt' }).first();
    await fitsButton.click();
    await expect(fitsButton).toHaveClass(/bg-primary/);

    const uniqueComment = `Codex E2E ${Date.now()}`;
    const updatedComment = `${uniqueComment} bearbeitet`;
    const commentInput = page.getByPlaceholder('Kommentar schreiben...');

    await commentInput.fill(uniqueComment);
    await commentInput.locator('xpath=following-sibling::button').click();
    await expect(page.getByText(uniqueComment)).toBeVisible();

    const createdComment = page.locator('div').filter({ hasText: uniqueComment }).last();
    await createdComment.getByRole('button', { name: 'Bearbeiten' }).click();
    await createdComment.locator('textarea').fill(updatedComment);
    await createdComment.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText(updatedComment)).toBeVisible();

    const updatedCommentCard = page.locator('div').filter({ hasText: updatedComment }).last();
    await updatedCommentCard.getByRole('button', { name: 'L\u00f6schen' }).click();
    await expect(page.getByText(updatedComment)).toBeHidden();
  });

  test('boulder tracking markers and quick actions work', async ({ page }) => {
    const { firstBoulderName, boulderId } = await openFirstBoulder(page);
    await resetBoulderTrackingState(page, boulderId);
    await page.reload();
    await expect(page.getByRole('heading', { name: firstBoulderName })).toBeVisible();

    await page.getByRole('button', { name: 'Track' }).click();
    const trackContent = page.locator('section').filter({ hasText: 'Versuch +1' }).first();
    await expect(trackContent).toBeVisible();

    const favoriteButton = page.getByRole('button', { name: 'Favorit' }).first();
    const projectButton = page.getByRole('button', { name: 'Projekt' }).first();
    await ensureMarkerIsActive(favoriteButton);
    await ensureMarkerIsActive(projectButton);

    const attemptsBeforeIncrement = await resolveTodayAttemptCount(page, trackContent);
    await page.getByRole('button', { name: 'Versuch +1' }).click();
    await expect
      .poll(async () => getTodayAttemptCount(trackContent), { timeout: 15_000 })
      .toBe(attemptsBeforeIncrement + 1);

    await page.getByRole('button', { name: 'Top' }).click();
    await expect(trackContent).toContainText('Getoppt');

    await page.goto('/boulders');
    await page.getByRole('button', { name: /Gespeichert/i }).click();
    const savedResults = page.locator('#boulder-results > button');
    expect(await savedResults.count()).toBeGreaterThan(0);
    await expect(savedResults.first()).toContainText(firstBoulderName);
  });

  test('boulder session note changes persist after saving the drawer', async ({ page }) => {
    const { firstBoulderName, boulderId } = await openFirstBoulder(page);
    await resetBoulderTrackingState(page, boulderId);
    await page.reload();
    await expect(page.getByRole('heading', { name: firstBoulderName })).toBeVisible();

    await page.getByRole('button', { name: 'Track' }).click();
    const trackContent = page.locator('section').filter({ hasText: 'Versuch +1' }).first();
    await expect(trackContent).toBeVisible();

    const todayButton = page.getByRole('button', { name: /Heute starten|Heute bearbeiten/ }).first();
    await todayButton.click();
    const sessionDrawer = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Heutige Session' }) });
    await expect(sessionDrawer).toBeVisible();

    const sessionNote = `E2E Session ${Date.now()}`;
    const sessionTextarea = sessionDrawer.locator('textarea');
    await sessionTextarea.fill(sessionNote);
    await sessionDrawer.getByRole('button', { name: '+' }).click();
    await sessionDrawer.getByRole('button', { name: 'Fertig' }).click();
    await expect(trackContent).toContainText(sessionNote);
  });

  test('dashboard notifications, sectors and statistics work for a normal user', async ({ page }) => {
    await page.goto('/');
    const notificationTrigger = page.getByRole('button', { name: 'Benachrichtigungen' });
    await notificationTrigger.click();
    await expect(page.getByRole('heading', { name: 'Benachrichtigungen' })).toBeVisible();

    await page.getByRole('button', { name: 'Einstellungen' }).click();
    await expect(page).toHaveURL(/\/profile\/notifications$/);

    await page.goto('/profile');
    await page.getByRole('button', { name: 'Sektoren' }).click();
    await expect(page).toHaveURL(/\/sectors$/);

    const sectorCards = page.locator('main button');
    expect(await sectorCards.count()).toBeGreaterThan(0);
    await sectorCards.first().click();
    await expect(page).toHaveURL(/\/boulders\?sector=/);

    await page.goto('/statistics');
    await expect(page.getByRole('heading', { name: 'Statistiken' }).first()).toBeVisible();

    const allTimeSwitch = page.getByRole('switch', { name: 'Zwischen nur h\u00e4ngenden Bouldern und Alltime-Statistik umschalten' });
    await allTimeSwitch.click();
    await expect(allTimeSwitch).toHaveAttribute('aria-checked', 'true');
    await allTimeSwitch.click();
    await expect(allTimeSwitch).toHaveAttribute('aria-checked', 'false');

    const gradeFilterButton = page.locator('button[aria-label*="Grad "]').first();
    const initialGradeAction = await gradeFilterButton.getAttribute('aria-label');
    await gradeFilterButton.click();
    await expect(page).toHaveURL(/grade=/);

    const resetGradeButton = page.locator('button[aria-pressed="true"]').first();
    await resetGradeButton.click();
    await expect(page).not.toHaveURL(/grade=/);
    expect(initialGradeAction).toBeTruthy();
  });
});
