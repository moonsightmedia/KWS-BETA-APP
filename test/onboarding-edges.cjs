require('node:fs').mkdirSync('output/playwright/onboarding', { recursive: true });
const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    let checks = 0;
    async function open(params = '', init, width = 375, height = 812) { const p = await browser.newPage({ viewport: { width, height } }); p.on('pageerror', e => console.log('PAGEERROR', e.message)); await p.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()); if (init)
        await p.addInitScript(init); await p.goto('http://127.0.0.1:5220/test/fixtures/onboarding.html' + params); return p; }
    const tip = (p, id) => p.locator(`[data-coachmark=${id}]`);
    async function filter(p) { await tip(p, 'discover').getByRole('button', { name: 'Boulder öffnen' }).click(); await tip(p, 'beta').getByRole('button', { name: 'Weiter zu den Filtern' }).click(); await tip(p, 'filter').getByRole('button', { name: 'Filter öffnen' }).click(); await tip(p, 'filter-grade').waitFor({ state: 'visible' }); }
    async function absent(p) { await p.waitForTimeout(800); assert.equal(await p.locator('[data-coachmark]').count(), 0); checks++; }
    for (const params of ['?start=/app/register', '?start=/auth', '?empty', '?error', '?signedIn']) {
        const p = await open(params);
        await absent(p);
        await p.close();
    }
    for (const key of ['hasSeenOnboarding', 'kws-onboarding-v1']) {
        const p = await open('', key === 'hasSeenOnboarding' ? () => localStorage.setItem('hasSeenOnboarding', 'true') : () => localStorage.setItem('kws-onboarding-v1', 'seen'));
        await absent(p);
        await p.getByRole('button', { name: 'Einführung ansehen', exact: true }).click();
        await tip(p, 'discover').waitFor({ state: 'visible' });
        checks++;
        await p.close();
    }
    {
        const p = await open('?noVideo');
        await tip(p, 'discover').getByRole('button', { name: 'Boulder öffnen' }).click();
        await tip(p, 'beta').getByText('So erkennst du den Boulder').waitFor();
        assert.match(await tip(p, 'beta').innerText(), /noch kein Beta-Video/);
        checks++;
        await p.close();
    }
    {
        const p = await open('', () => { Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
        await tip(p, 'discover').getByRole('button', { name: 'Überspringen' }).click();
        await absent(p);
        await p.getByRole('button', { name: 'Filter', exact: true }).click();
        await p.getByRole('button', { name: 'Grad 2', exact: true }).click();
        await p.getByRole('button', { name: 'Filter schließen', exact: true }).click();
        await absent(p);
        await p.close();
    }
    for (const [width, height] of [[375, 667], [812, 375], [768, 900], [1280, 900], [1920, 900]]) {
        const p = await open('', undefined, width, height);
        await filter(p);
        await p.waitForTimeout(250);
        await p.screenshot({ path: `output/playwright/onboarding/loop2-${width}x${height}-grade.png` });
        for (const id of ['filter-grade', 'filter-color', 'filter-area', 'filter-show']) {
            await tip(p, id).waitFor({ state: 'visible' });
            await p.waitForTimeout(200);
            const panel = await tip(p, id).boundingBox();
            const high = await p.locator('.tour-highlight').boundingBox();
            assert(panel.x >= 0 && panel.y >= 0 && panel.x + panel.width <= width + 1 && panel.y + panel.height <= height + 1, `${id} panel bounds ${width}x${height}`);
            const overlap = Math.min(panel.x + panel.width, high.x + high.width) > Math.max(panel.x, high.x) && Math.min(panel.y + panel.height, high.y + high.height) > Math.max(panel.y, high.y);
            if (overlap) {
                await p.screenshot({ path: `output/playwright/onboarding/overlap-${id}-${width}.png` });
                console.log({ panel, high, detail: await p.locator('[data-onboarding=filter-dialog]').boundingBox() });
            }
            assert(!overlap, `${id} overlap ${width}x${height}`);
            await p.keyboard.press('Tab');
            assert.equal(await p.evaluate(() => { const a = document.activeElement; return !!(a.closest('[data-coachmark]') || a.closest('[data-onboarding=filter-dialog]')); }), true);
            checks++;
            if (id === 'filter-grade')
                await tip(p, id).getByRole('button', { name: 'Weiter zur Farbe' }).click();
            else if (id === 'filter-color')
                await tip(p, id).getByRole('button', { name: 'Weiter zum Bereich' }).click();
            else if (id === 'filter-area')
                await tip(p, id).getByRole('button', { name: 'Auswahl ansehen' }).click();
        }
        await p.keyboard.press('Escape');
        await absent(p);
        assert.equal(await p.locator('[data-onboarding=filter-dialog]').count(), 1);
        await p.getByRole('button', { name: 'Grad 2', exact: true }).click();
        await p.getByRole('button', { name: 'Filter schließen', exact: true }).click();
        await absent(p);
        await p.screenshot({ path: `output/playwright/onboarding/loop2-${width}x${height}-closed.png` });
        await p.close();
        console.log('PASS edges', width, height);
    }
    {
        const p = await open();
        await filter(p);
        await p.getByRole('button', { name: 'Filter schließen', exact: true }).click();
        await tip(p, 'filter').waitFor({ state: 'visible' });
        assert.equal(await tip(p, 'filter-results').count(), 0);
        checks++;
        await p.close();
    }
    console.log('PASS edge checks', checks);
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
