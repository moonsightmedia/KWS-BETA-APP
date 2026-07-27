import { expect, test } from '@playwright/test';

test.describe('Public TV schedule', () => {
  test('loads without auth and shows schedule shell', async ({ page }) => {
    const scheduleResponses: number[] = [];
    const sectorResponses: number[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/rest/v1/sector_schedule')) {
        scheduleResponses.push(response.status());
      }
      if (url.includes('/rest/v1/sectors?')) {
        sectorResponses.push(response.status());
      }
    });

    await page.goto('/tv/schedule');

    await expect(page.getByText('Kletterwelt Sauerland')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Routenschraubplan' })).toBeVisible();
    await expect(page.getByText('Nächste Termine')).toBeVisible();
    await expect(page.getByText(/Nächster Sync in \d+s/)).toBeVisible();

    // No app chrome on the TV route
    await expect(page.getByRole('navigation')).toHaveCount(0);

    await expect
      .poll(() => scheduleResponses.length > 0 && sectorResponses.length > 0, { timeout: 15_000 })
      .toBe(true);

    expect(scheduleResponses.every((status) => status === 200)).toBe(true);
    expect(sectorResponses.every((status) => status === 200)).toBe(true);

    await expect(page.getByText('Keine Verbindung')).toHaveCount(0);
    await expect(page.getByText('Termine werden geladen')).toHaveCount(0);

    const emptyState = page.getByText('Aktuell keine Schraubtermine geplant.');
    const termDay = page.getByText(/\d+\s+Termintag/);
    await expect(emptyState.or(termDay).first()).toBeVisible();
  });
});
