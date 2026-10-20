// Deterministic regression/visual fixtures; no real accounts or production writes.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
const out = path.join(repo, 'output/about-feedback-20261020');
const base = 'http://127.0.0.1:5233/test/fixtures/about-feedback.html';
(async () => {
  await fs.mkdir(out, { recursive: true });
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: path.join(repo, 'test/about-feedback.vite.config.ts') });
  let browser;
  let assertions = 0;
  const check = (actual, expected, message) => { assert.deepEqual(actual, expected, message); assertions++; };
  try {
    await server.listen();
    // Use Playwright's installed Chromium on every platform, including Linux CI.
    // No pre-existing desktop browser or manually started Vite process required.
    browser = await chromium.launch({ headless: true });
    for (const width of [375, 768, 1280, 1920]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
      await page.goto(base);
      await page.getByRole('heading', { name: 'Version und Updates' }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      check(await page.locator('img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)), true, 'Both original logos load');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
      await page.screenshot({ path: `${out}/loop1-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Auf Updates prüfen', exact: true }).click();
      await page.getByText('Deine Web-App ist aktuell', { exact: true }).waitFor();
      check(await page.getByRole('button', { name: 'Web-App aktualisieren' }).count(), 0, 'Same build never offers reload');
      await page.route('**/version.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: '1.0.252', revision: 'new-source', buildTimestamp: '2026-10-20T13:00:00Z' }) }));
      await page.getByRole('button', { name: 'Auf Updates prüfen', exact: true }).click();
      await page.getByText('Neue Web-Version verfügbar', { exact: true }).waitFor();
      check(await page.getByRole('button', { name: 'Web-App aktualisieren' }).isVisible(), true, 'New revision offers explicit update');
      await page.screenshot({ path: `${out}/loop2-update-${width}.png`, fullPage: true });
      await page.unroute('**/version.json');
      await page.route('**/version.json', (route) => route.fulfill({ status: 503, body: '{}' }));
      await page.getByRole('button', { name: 'Auf Updates prüfen', exact: true }).click();
      await page.getByRole('alert').waitFor();
      check(await page.getByText('Deine Web-App ist aktuell', { exact: true }).count(), 0, 'Failure is never current');
      await page.screenshot({ path: `${out}/loop2-error-${width}.png`, fullPage: true });
      await page.unroute('**/version.json');
      await page.route('**/version.json', (route) => route.fulfill({ contentType: 'application/json', body: '<html>not a manifest</html>' }));
      await page.getByRole('button', { name: 'Auf Updates prüfen', exact: true }).click();
      await page.getByRole('alert').waitFor();
      check(await page.getByRole('button', { name: 'Web-App aktualisieren' }).count(), 0, 'Invalid response cannot update');
      await page.unroute('**/version.json');
      await page.getByRole('button', { name: 'Auf Updates prüfen', exact: true }).click();
      await page.getByText('Deine Web-App ist aktuell', { exact: true }).waitFor();
      check(await page.getByRole('alert').count(), 0, 'Retry recovers');
      check(errors, [], 'No browser exceptions');
      await page.close();
      console.log('PASS web states / visual loops', width);
    }
    const page = await browser.newPage({ viewport: { width: 375, height: 900 }, hasTouch: true });
    await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.goto(base);
    await page.route('**/version.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: '1.0.252', revision: 'new-source', buildTimestamp: '2026-10-20T13:00:00Z' }) }));
    await page.getByRole('button', { name: 'Auf Updates prüfen', exact: true }).click();
    await page.getByRole('button', { name: 'Web-App aktualisieren', exact: true }).waitFor();
    await page.unroute('**/version.json');
    await Promise.all([page.waitForEvent('domcontentloaded'), page.getByRole('button', { name: 'Web-App aktualisieren', exact: true }).click()]);
    await page.getByRole('button', { name: 'Auf Updates prüfen', exact: true }).click();
    await page.getByText('Deine Web-App ist aktuell', { exact: true }).waitFor();
    check(await page.getByRole('button', { name: 'Web-App aktualisieren' }).count(), 0, 'Explicit web reload returns to meaningful current state');
    for (const platform of ['android', 'ios']) {
      await page.goto(`${base}?native=${platform}`);
      await page.getByText('1.0.251 (Build 85)', { exact: true }).waitFor();
      check(await page.getByRole('button', { name: 'Auf Updates prüfen' }).count(), 0, 'Native never checks local version.json as store update');
      check(await page.getByRole('button', { name: 'Web-App aktualisieren' }).count(), 0, 'Native never offers binary reload');
      if (platform === 'android') check(await page.getByRole('link', { name: 'Im Play Store prüfen' }).getAttribute('href'), 'https://play.google.com/store/apps/details?id=com.kletterwelt.beta');
      else check(await page.getByRole('link', { name: 'TestFlight öffnen' }).getAttribute('href'), 'itms-beta://');
      await page.screenshot({ path: `${out}/native-${platform}-simulated.png`, fullPage: true });
    }
    await page.goto(`${base}?native=android&nativeError=1`);
    await page.getByText('Nicht verfügbar', { exact: true }).waitFor();
    check(await page.getByRole('button', { name: 'Erneut versuchen' }).isVisible(), true, 'Native metadata error has retry');
    for (const [role, expected] of [['admin', ['/setter/create', '/admin?tab=overview', '/']], ['setter', ['/setter/create', '/']], ['stale', ['/']], ['error', ['/']]]) {
      await page.goto(`${base}?role=${role}&route=/`);
      const avatar = page.getByRole('button', { name: 'Profil', exact: true }).filter({ visible: true });
      for (const next of expected) {
        await avatar.tap(); await avatar.tap();
        if (role === 'error') await page.getByText('Bereich konnte nicht gewechselt werden', { exact: true }).waitFor();
        else await page.getByTestId('route').filter({ hasText: new RegExp(`^${next.replace(/[?]/g, '\\?')}$`) }).waitFor();
        check(await page.getByTestId('route').innerText(), next, `Server roles restrict ${role}`);
      }
      await avatar.tap();
      await page.getByRole('menu').waitFor();
      check(await page.getByRole('menuitem', { name: 'Profil & Einstellungen' }).isVisible(), true, 'Single tap still opens menu');
      await page.keyboard.press('Escape');
      await page.getByRole('menu').waitFor({ state: 'hidden' });
    }
    await page.goto(`${base}?role=admin&route=/`);
    const avatar = page.getByRole('button', { name: 'Profil', exact: true }).filter({ visible: true });
    await avatar.focus(); await page.keyboard.press('Enter');
    await page.getByRole('menu').waitFor();
    check(await page.getByRole('menuitem', { name: 'Profil & Einstellungen' }).isVisible(), true, 'Keyboard access retained');
    await page.close();
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await desktop.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await desktop.goto(`${base}?role=admin&route=/`);
    const desktopAvatar = desktop.getByRole('button', { name: 'Profil', exact: true }).filter({ visible: true });
    await desktopAvatar.dblclick();
    await desktop.getByTestId('route').filter({ hasText: /^\/setter\/create$/ }).waitFor();
    check(await desktop.getByTestId('route').innerText(), '/setter/create', 'Desktop double-click works');
    await desktop.close();
    console.log(`PASS ${assertions} about/update/role assertions`);
    await fs.writeFile(`${out}/test-proof.json`, JSON.stringify({ assertions, widths: [375, 768, 1280, 1920], native: 'simulated bridge responses only; no hardware acceptance', result: 'passed' }, null, 2));
  } finally {
    try { await browser?.close(); } finally { await server.close(); }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
