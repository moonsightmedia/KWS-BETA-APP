// Isolated PR71 integration regression; owns and cleans up its local Vite server.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const checkSpotlight = require('./onboarding-geometry.cjs');
const fs = require('node:fs');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
const out = path.join(repo, 'output/playwright/onboarding-desktop');
fs.mkdirSync(out, { recursive: true });
const profiles = [[375, 900], [768, 900], [1024, 576], [1280, 600], [1366, 650], [1920, 900]];

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({
    configFile: path.join(repo, 'test/onboarding.vite.config.ts'),
    server: { watch: { ignored: ['**/output/**', '**/test-results/**'] } },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true });
    for (const loop of [1, 2]) {
      // Loop 1 covers all original desktop profiles. Loop 2 repeats the four
      // required widths with keyboard activation to exercise accessible flows.
      const cases = loop === 1 ? profiles : profiles.filter(([width]) => [375, 768, 1280, 1920].includes(width));
      for (const [width, height] of cases) {
        const p = await browser.newPage({ viewport: { width, height } });
        const metrics = [];
        const errors = [];
        p.on('pageerror', (error) => errors.push(error.message));
        await p.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
        await p.goto('http://127.0.0.1:5220/guest');
        for (const [id, action] of [['discover', 'Boulder öffnen'], ['beta', 'Weiter zu den Filtern'], ['filter', 'Filter öffnen'], ['filter-grade', 'Weiter zur Farbe'], ['filter-color', 'Weiter zum Bereich'], ['filter-area', 'Auswahl ansehen'], ['filter-show', 'Boulder anzeigen'], ['filter-results', 'Was geht mit Konto?'], ['save', 'Weiter zum Tracken'], ['track', 'Statistik ansehen'], ['progress', 'Konto erstellen']]) {
          const tip = p.locator(`[data-coachmark=${id}]`);
          await tip.waitFor({ state: 'visible' });
          await p.waitForTimeout(250);
          const a = await tip.boundingBox();
          const h = await p.locator('.tour-highlight').boundingBox();
          const overlap = Math.max(0, Math.min(a.x + a.width, h.x + h.width) - Math.max(a.x, h.x)) * Math.max(0, Math.min(a.y + a.height, h.y + h.height) - Math.max(a.y, h.y));
          const side = await tip.getAttribute('data-tour-side');
          assert(overlap < 1, `${width}/${id}: hint covers highlight`);
          assert(a.x >= 15 && a.y >= 11 && a.x + a.width <= width - 15 && a.y + a.height <= height - 11, `${width}/${id}: viewport bounds`);
          assert.equal(await tip.evaluate((element) => element.scrollWidth > element.clientWidth), false, `${width}/${id}: text overflow`);
          await checkSpotlight(p, `${width}/${id}`);
          if (id === 'beta' && width >= 1024) {
            assert.equal(side, 'right');
            assert.equal(await p.locator('.tour-layer').getAttribute('data-tour-docked'), 'false');
            const actual = await p.locator('[data-onboarding=media]').boundingBox();
            const headerBottom = await p.locator('[data-onboarding=media]').evaluate((element) => element.closest('[data-boulder-detail-scroll]')?.querySelector('[data-kws-dashboard-header], header')?.getBoundingClientRect().bottom ?? 0);
            const expectedTop = Math.max(actual.y - 5, headerBottom + 6, 8);
            assert(Math.abs(h.y - expectedTop) < 1, `${width}: video highlight unnecessarily clipped`);
          }
          if (side === 'left' || side === 'right') {
            const gap = side === 'right' ? a.x - h.x - h.width : h.x - a.x - a.width;
            assert(Math.abs(gap - 16) < 1, `${width}/${id}: side gap`);
            const arrow = await p.locator('.tour-arrow').boundingBox();
            assert(Math.abs(arrow.y + arrow.height / 2 - h.y - h.height / 2) < 1 || a.y === 12 || a.y + a.height >= height - 13, `${width}/${id}: arrow target`);
          }
          metrics.push({ id, panel: a, highlight: h, side, overlap });
          const prefix = loop === 1 ? 'after' : 'loop2';
          await p.screenshot({ path: path.join(out, `${prefix}-${width}-${id}.png`) });
          if (id === 'beta' && width === 1366) {
            await p.setViewportSize({ width: 1024, height: 576 });
            await p.waitForTimeout(150);
            assert.equal(await tip.getAttribute('data-tour-side'), 'right');
            await p.setViewportSize({ width, height });
            await p.waitForTimeout(150);
          }
          const next = tip.getByRole('button', { name: action, exact: true });
          if (loop === 1) await next.click();
          else await next.press('Enter');
        }
        fs.writeFileSync(path.join(out, `${loop === 1 ? 'after' : 'loop2'}-${width}.json`), JSON.stringify(metrics, null, 2));
        assert.deepEqual(errors, []);
        console.log('PASS desktop placement', { loop, width, height });
        await p.close();
      }
    }
  } finally {
    try { await browser?.close(); } finally { await server.close(); }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
