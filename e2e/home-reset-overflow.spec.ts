import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'test-results/home-reset-overflow-20261014';
const phase = process.env.KWS_HOME_OVERFLOW_PHASE || 'after';
test.use({ trace: 'off', video: 'off' });
async function open(page: Page, state = 'ready') {
  await page.clock.setFixedTime(new Date('2026-10-14T10:00:00Z'));
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  for (const name of ['useAuth','useBoulders','useColors','useBoulderCommunity','useHasRole','useIsAdmin']) {
    await page.route(`**/src/hooks/${name}.ts*`, r => r.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/personal-hooks.ts';" }));
  }
  await page.route('**/src/hooks/useSectors.ts*', r => r.fulfill({ contentType: 'application/javascript', body: `export const useSectorsTransformed=()=>({data:[{id:'s1',name:'Bug A'},{id:'s2',name:'Kurze Platte'}],isLoading:false,error:null}); export const useSectors=useSectorsTransformed;` }));
  await page.route('**/src/hooks/useSectorSchedule.ts*', r => r.fulfill({ contentType: 'application/javascript', body: `export const useSectorSchedule=()=>({data:${state === 'empty' ? '[]' : "[{id:'1',sector_id:'s1',scheduled_at:'2026-10-16T08:00:00Z'},{id:'2',sector_id:'s2',scheduled_at:'2026-10-16T08:00:00Z'},{id:'3',sector_id:'s1',scheduled_at:'2026-10-18T08:00:00Z'}]"}});` }));
  await page.route('**/src/components/NotificationCenter.tsx*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const NotificationCenter=()=>null;' }));
  await page.route('**/src/hooks/useNotifications.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const useUnreadCount=()=>({data:0});' }));
  await page.route('**/src/hooks/usePreloadBoulderThumbnails.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const usePreloadBoulderThumbnails=()=>{};' }));
  await page.route('**/src/utils/feedbackUtils.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const reportError=async()=>({success:true});' }));
  await page.route('**/src/utils/sentry.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const captureSentryException=()=>{};' }));
  await page.route('**/src/lib/profileCompat.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const fetchProfileRecord=async()=>({first_name:"Alex"});' }));
  await page.goto('/test/fixtures/personal-workspace.html?route=%2F');
  await page.evaluate(() => document.fonts.ready);
  await mkdir(output, { recursive: true });
}
for (const width of [375, 768, 1280, 1920]) {
  test(`reset and session sections fit the Home page at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width, height: 1000 });
    await open(page);
    const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Nächste Umschraubung', exact: true }) });
    await expect(section.getByText('Bug A & Kurze Platte bekommen neue Boulder', { exact: true })).toBeVisible();
    const card = section.locator('div.rounded-kws-card').first();
    const badge = section.getByText('in 2 Tagen', { exact: true });
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${phase}-loop1-${width}.png` });
    const cardBox = (await card.boundingBox())!;
    const badgeBox = (await badge.boundingBox())!;
    const gridBox = (await section.locator('..').boundingBox())!;
    const metrics = { viewport: width, cardRight: cardBox.x + cardBox.width, badgeRight: badgeBox.x + badgeBox.width, gridRight: gridBox.x + gridBox.width };
    console.log('Home reset bounds:', metrics);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(width - 15);
    expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width - 10);
    expect(gridBox.x + gridBox.width).toBeLessThanOrEqual(width - 15);
    const session = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Für deine Session', exact: true }) });
    const sessionBox = (await session.boundingBox())!;
    expect(sessionBox.x + sessionBox.width).toBeLessThanOrEqual(width - 15);
    // Second loop: resize away and back, then verify the empty state and project action.
    await page.setViewportSize({ width: width + 40, height: 1000 });
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole('button', { name: 'Projekte', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Statistiken', exact: true })).toBeVisible();
    await page.unrouteAll({ behavior: 'wait' });
    await open(page, 'empty');
    await expect(section.getByText('Kein Schraubtermin geplant.', { exact: true })).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${phase}-loop2-empty-${width}.png` });
    expect((await card.boundingBox())!.x + (await card.boundingBox())!.width).toBeLessThanOrEqual(width - 15);
    expect(errors).toEqual([]);
  });
}
