import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const widths = [375, 768, 1280, 1920];
const resultsDir = 'test-results/feedback-workspace-20260914';

async function openFixture(page: Page, view: 'feedback' | 'logs' = 'feedback') {
  await page.route('**/*.supabase.co/**', (route) => route.abort());
  await page.route(/\/src\/hooks\/useAuth\.tsx(\?.*)?$/, (route) => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-operations-hooks.ts';" }));
  await page.route('**/src/integrations/supabase/client.ts*', (route) => route.fulfill({ contentType: 'application/javascript', body: "export { supabase } from '/test/fixtures/admin-operations-hooks.ts';" }));
  await page.goto(`/test/fixtures/admin-operations.html?view=${view}`);
}

test.beforeEach(async ({ page }) => {
  await mkdir(resultsDir, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  (page as Page & { __qaErrors?: string[] }).__qaErrors = errors;
});
test.afterEach(async ({ page }) => expect((page as Page & { __qaErrors?: string[] }).__qaErrors).toEqual([]));

// Feedback coverage lives in feedback-workspace.spec.ts (direct detail flow,
// complete index, new filters and confirmed mutations).

test('logs have no overflow at required widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await openFixture(page, 'logs');
    await expect(page.getByText(/Einzeloperationen/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${resultsDir}/after-logs-${width}.png`, animations: 'disabled' });
  }
});

test('log detail opens from keyboard on grouped and detail rows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openFixture(page, 'logs');
  const group = page.getByRole('button').filter({ hasText: '2 Boulder · Erstellt' }).first();
  await group.focus();
  await page.keyboard.press('Enter');
  const detail = page.getByRole('button', { name: /Grüner Pfeil/ }).first();
  await detail.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Log-Details');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
