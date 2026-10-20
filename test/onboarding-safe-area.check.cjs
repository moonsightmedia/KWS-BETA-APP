const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = 'output/playwright/onboarding-safe-area';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const profile of [
    { width: 375, height: 812, top: 59, bottom: 34, left: 0, right: 0 },
    { width: 393, height: 852, top: 59, bottom: 34, left: 0, right: 0 },
    { width: 844, height: 390, top: 0, bottom: 21, left: 59, right: 59 },
    ...[768, 1280, 1920].map(width => ({ width, height: 900, top: 0, bottom: 0, left: 0, right: 0 })),
  ]) {
    const { width, height } = profile;
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.addInitScript(insets => {
      document.addEventListener('DOMContentLoaded', () => {
        for (const side of ['top', 'right', 'bottom', 'left']) document.documentElement.style.setProperty(`--app-safe-area-${side}`, `${insets[side]}px`);
      });
    }, profile);
    try {
      await page.goto('http://127.0.0.1:5220/guest');
      const tip = () => page.locator('[data-coachmark]');
      const check = async id => {
        await page.locator(`[data-coachmark=${id}]`).waitFor({ state: 'visible' });
        await page.waitForTimeout(180);
        const box = await tip().boundingBox();
        assert(box.y >= profile.top + 11, `${id}: status bar at ${width}`);
        assert(box.y + box.height <= height - profile.bottom - 11, `${id}: home indicator at ${width}`);
        assert(box.x >= profile.left + 15 && box.x + box.width <= width - profile.right - 15, `${id}: landscape notch at ${width}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: `${out}/${width}-${id}.png` });
      };
      await check('discover');
      await tip().getByRole('button', { name: 'Boulder öffnen', exact: true }).click();
      await check('beta');
      await tip().getByRole('button', { name: 'Weiter zu den Filtern' }).click();
      await check('filter');
      await tip().getByRole('button', { name: 'Filter öffnen' }).click();
      for (const [id, action] of [['filter-grade', 'Weiter zur Farbe'], ['filter-color', 'Weiter zum Bereich'], ['filter-area', 'Auswahl ansehen'], ['filter-show', 'Boulder anzeigen']]) {
        await check(id);
        await tip().getByRole('button', { name: action, exact: true }).click();
      }
      await check('filter-results');
      await tip().getByRole('button', { name: 'Was geht mit Konto?', exact: true }).click();
      await check('save');
      await tip().getByRole('button', { name: 'Weiter zum Tracken' }).click();
      await check('track');
      await tip().getByRole('button', { name: 'Statistik ansehen', exact: true }).click();
      await check('progress');
      await tip().getByRole('button', { name: 'Als Gast weiter', exact: true }).click();
      const consent = page.getByRole('button', { name: 'Ohne Statistik', exact: true });
      if (await consent.isVisible()) await consent.click();
      await page.evaluate(() => window.scrollTo(0, 0));
      const info = page.getByRole('button', { name: 'Einführung ansehen', exact: true });
      await info.waitFor({ state: 'visible' });
      assert.equal((await info.innerText()).trim(), '');
      assert.equal(await page.getByRole('button', { name: 'Was geht mit Konto?', exact: true }).count(), 0);
      const a = await info.boundingBox(), b = await page.getByRole('group', { name: 'Ansicht wechseln', exact: true }).boundingBox();
      assert(Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 1 && b.x - a.x - a.width >= 4);
      await page.screenshot({ path: `${out}/${width}-compact-entry.png` });
      await info.click();
      await check('discover');
      await page.keyboard.press('Escape');
      await page.locator('[data-coachmark]').waitFor({ state: 'detached' });
      assert.deepEqual(errors, []);
      console.log('PASS safe area and compact entry', width, height);
    } catch (error) {
      await page.screenshot({ path: `${out}/${width}-failure.png` });
      throw error;
    } finally { await page.close(); }
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
