import { expect, test } from '@playwright/test';

const before = process.env.AUTH_LAYOUT_PHASE === 'before';
for (const width of [375, 768, 1111, 1280, 1920]) {
  test(`auth introduction stays grouped at ${width}px`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.setViewportSize({ width, height: 791 });
    await page.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    await page.route('**/src/hooks/useAuth.ts*', route => route.fulfill({
      contentType: 'application/javascript',
      body: 'export const useAuth = () => ({ user: null });',
    }));
    await page.goto('/test/fixtures/auth-layout.html');
    await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
    const benefit = page.getByText('Weniger suchen. Mehr klettern.').locator('..');
    const intro = page.getByText('Melde dich an und finde deine Boulder, Betas und Fortschritte.');
    if (width >= 1024) {
      await expect(benefit).toBeVisible();
      const introBox = (await intro.boundingBox())!;
      const benefitBox = (await benefit.boundingBox())!;
      const gap = benefitBox.y - (introBox.y + introBox.height);
      if (!before) {
        expect(gap).toBeCloseTo(32, 0);
        expect(benefitBox.y + benefitBox.height).toBeLessThan(700);
      }
      test.info().annotations.push({ type: 'intro-benefit-gap', description: `${gap}px` });
    } else {
      await expect(benefit).toBeHidden();
    }
    expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/auth-spacing-20260914/${before ? 'before' : 'loop1-after'}-${width}.png`, animations: 'disabled' });
    if (before) return;
    // Only local form interaction: no sign-in, emails, or registration submitted.
    await page.getByRole('group', { name: 'Zwischen Anmeldung und Registrierung wechseln' }).getByRole('button', { name: 'Registrieren' }).click();
    await expect(page.getByRole('heading', { name: 'Konto erstellen' })).toBeVisible();
    await expect(page.getByLabel('Vorname', { exact: true })).toBeVisible();
    expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/auth-spacing-20260914/loop2-register-${width}.png`, animations: 'disabled' });
    await page.getByRole('group', { name: 'Zwischen Anmeldung und Registrierung wechseln' }).getByRole('button', { name: 'Anmelden', exact: true }).click();
    await page.getByLabel('E-Mail', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await page.getByLabel('Passwort', { exact: true }).fill('qa-placeholder');
    await page.getByRole('button', { name: 'Passwort anzeigen' }).click();
    await expect(page.getByLabel('Passwort', { exact: true })).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Passwort ausblenden' }).click();
    await expect(page.getByLabel('Passwort', { exact: true })).toHaveAttribute('type', 'password');
    expect(runtimeErrors).toEqual([]);
  });
}
