const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const checkSpotlight = require('./onboarding-geometry.cjs');
fs.mkdirSync('output/playwright/onboarding-draft-geometry', { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const width of [375, 768, 1280, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.goto('http://127.0.0.1:5216/docs/design/onboarding/index.html#/guest');
    const check = async id => {
      const tip = page.locator(`[data-coachmark=${id}]`);
      await tip.waitFor({ state: 'visible' });
      await page.waitForTimeout(250);
      await checkSpotlight(page, `draft-${width}-${id}`);
      await page.screenshot({ path: `output/playwright/onboarding-draft-geometry/${width}-${id}.png` });
      return tip;
    };
    let tip = await check('discover');
    assert.equal(await page.locator('[data-draft-tour=discover] img').count(), 1);
    const a = await page.locator('[data-draft-tour=discover]').boundingBox();
    const h = await page.locator('.tour-highlight').boundingBox();
    assert(Math.abs(a.x - 5 - h.x) < 1 && h.width > a.width);
    await tip.getByRole('button', { name: 'Boulder öffnen', exact: true }).click();
    tip = await check('beta');
    await tip.getByRole('button', { name: 'Weiter zu den Filtern' }).click();
    tip = await check('filter');
    await tip.getByRole('button', { name: 'Filter öffnen' }).click();
    for (const [id, action] of [['filter-grade','Weiter zur Farbe'],['filter-color','Weiter zum Bereich'],['filter-area','Auswahl ansehen'],['filter-show','Boulder anzeigen'],['filter-results','Was geht mit Konto?'],['save','Weiter zum Tracken'],['track','Statistik ansehen']]) {
      tip = await check(id);
      await tip.getByRole('button', { name: action, exact: true }).click();
    }
    await check('progress');
    assert.deepEqual(errors, []);
    console.log('PASS draft targets and spotlight alignment', width);
    await page.close();
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
