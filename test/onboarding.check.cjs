require('node:fs').mkdirSync('output/playwright/onboarding', { recursive: true });
const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const checkSpotlight = require('./onboarding-geometry.cjs');
(async () => { const b = await chromium.launch({ channel: 'msedge', headless: true }); for (const width of [375, 768, 1280, 1920]) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
    await p.goto('http://127.0.0.1:5220' + (process.env.ONBOARDING_REAL_APP ? '/guest' : '/test/fixtures/onboarding.html'));
    const tip = id => p.locator(`[data-coachmark=${id}]`);
    const snap = async (id) => { await tip(id).waitFor({ state: 'visible' }); await p.waitForTimeout(250); await checkSpotlight(p, `${width}-${id}`); await p.screenshot({ path: `output/playwright/onboarding/${width}-${id}.png` }); const rect = await tip(id).boundingBox(); assert(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width + 1 && rect.y + rect.height <= 901, `${id} out of bounds`); assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); };
    try {
        await snap('discover');
        await tip('discover').getByRole('button', { name: 'Boulder öffnen' }).click();
        await snap('beta');
        await tip('beta').getByRole('button', { name: 'Weiter zu den Filtern' }).click();
        await snap('filter');
        await tip('filter').getByRole('button', { name: 'Filter öffnen' }).click();
        await snap('filter-grade');
        await p.getByRole('button', { name: 'Grad 2', exact: true }).click();
        await tip('filter-grade').getByRole('button', { name: 'Weiter zur Farbe' }).click();
        await snap('filter-color');
        await p.getByRole('button', { name: 'Farbe Blau', exact: true }).click();
        await tip('filter-color').getByRole('button', { name: 'Weiter zum Bereich' }).click();
        await snap('filter-area');
        await tip('filter-area').getByRole('button', { name: 'Auswahl ansehen' }).click();
        await snap('filter-show');
        await tip('filter-show').getByRole('button', { name: 'Boulder anzeigen', exact: true }).click();
        await snap('filter-results');
        await tip('filter-results').getByRole('button', { name: 'Was geht mit Konto?' }).click();
        await snap('save');
        await p.getByRole('button', { name: 'Speichern', exact: true }).click();
        assert.equal(await p.getByRole('button', { name: 'Gespeichert', exact: true }).getAttribute('aria-pressed'), 'true');
        await tip('save').getByRole('button', { name: 'Weiter zum Tracken' }).click();
        await snap('track');
        await p.getByRole('button', { name: 'Versuch +1' }).click();
        assert.match(await p.locator('.preview-feedback').innerText(), /1 Versuch/);
        await tip('track').getByRole('button', { name: 'Statistik ansehen' }).click();
        await snap('progress');
        await tip('progress').getByRole('button', { name: 'Konto erstellen' }).click();
        await p.getByRole('heading', { name: 'Leg dir ein Konto an' }).waitFor();
        await p.screenshot({ path: `output/playwright/onboarding/${width}-benefits.png` });
        await p.getByRole('link', { name: 'Zur Registrierung' }).click();
        await p.locator('#signup-email').waitFor({ state: 'visible' });
        assert.equal(await p.locator('[data-coachmark]').count(), 0);
        assert.equal(await p.evaluate(() => window.setterQA.writes.length), 0);
        assert.deepEqual(errors, []);
        console.log('PASS full flow', width);
    }
    catch (e) {
        console.log('FAIL', width, e.message, errors);
        await p.screenshot({ path: `output/playwright/onboarding/${width}-failure.png` });
        throw e;
    }
    finally {
        await p.close();
    }
} await b.close(); })().catch(e => { console.error(e); process.exit(1); });
