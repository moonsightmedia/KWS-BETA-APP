import { test, expect } from '@playwright/test';

for (const width of [375, 768, 1280, 1920]) {
  test(`external availability within overview at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/test/fixtures/launchMonitoring.html?page=overview');
    const panel = page.getByTestId('admin-availability');
    await expect(panel.getByText('Alle Dienste erreichbar', { exact: true })).toBeVisible();
    await expect(panel.getByText('In Ordnung', { exact: true })).toHaveCount(3);
    await panel.getByText('Letzte Störungen (1)', { exact: true }).click();
    await expect(panel.getByText('API · Behoben', { exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'Systemstatus aktualisieren' }).click();
    await expect(panel.getByRole('button', { name: 'Systemstatus aktualisieren' })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: `test-results/availability-20261019/overview-${width}.png`, fullPage: true });
    await panel.screenshot({ path: `test-results/availability-20261019/systemstatus-${width}.png` });
  });
}
for (const state of ['availability-stale', 'availability-error', 'availability-unconfigured', 'availability-outage']) {
  test(`availability reports ${state}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/test/fixtures/launchMonitoring.html?page=overview&state=${state}`);
    const panel = page.getByTestId('admin-availability');
    await expect(panel.getByText(state === 'availability-outage' ? 'Störung erkannt' : 'Status nicht bestätigt', { exact: true })).toBeVisible();
    if (state !== 'availability-outage') await expect(panel.getByText('In Ordnung', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `test-results/availability-20261019/${state}.png`, fullPage: true });
  });
}

test('failed refresh removes healthy state and a successful refresh restores it', async ({ page }) => {
  await page.goto('/test/fixtures/launchMonitoring.html?page=overview');
  const panel = page.getByTestId('admin-availability');
  await expect(panel.getByText('In Ordnung', { exact: true })).toHaveCount(3);
  await page.evaluate(() => { window.launchMonitoringQA.readMode = 'fail'; });
  await panel.getByRole('button', { name: 'Systemstatus aktualisieren' }).click();
  await expect(panel.getByText('In Ordnung', { exact: true })).toHaveCount(0);
  await expect(panel.getByRole('alert')).toBeVisible();
  await page.evaluate(() => { window.launchMonitoringQA.readMode = 'success'; });
  await panel.getByRole('button', { name: 'Systemstatus aktualisieren' }).click();
  await expect(panel.getByText('In Ordnung', { exact: true })).toHaveCount(3);
});

test('monitoring overview includes status and supports keyboard disclosure', async ({ page }) => {
  await page.goto('/test/fixtures/launchMonitoring.html');
  const panel = page.getByTestId('admin-availability');
  await expect(panel.getByText('Alle Dienste erreichbar', { exact: true })).toBeVisible();
  const history = panel.locator('summary');
  await history.focus();
  await history.press('Enter');
  await expect(panel.getByText('API · Behoben', { exact: true })).toBeVisible();
  await history.press('Enter');
  await expect(panel.getByText('API · Behoben', { exact: true })).not.toBeVisible();
});
