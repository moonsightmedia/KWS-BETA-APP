import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const directory = 'test-results/moderation-placement-20261018';
type Mode = 'pending' | 'empty' | 'error' | 'loading';
declare global {
  interface Window { moderationQA: { mode: Mode; reportError: boolean; failWrite: boolean; comments: boolean; reports: boolean; reads: string[]; writes: unknown[][] } }
}

async function open(page: Page, mode: Mode = 'pending', view = 'users', admin = true) {
  await page.addInitScript(initial => { window.moderationQA = { mode: initial, reportError: false, failWrite: false, comments: true, reports: true, reads: [], writes: [] }; }, mode);
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.route(/\/src\/hooks\/(useAuth\.tsx|useIsAdmin\.tsx|useHasRole\.ts)(\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: `export * from '/test/fixtures/admin-foundations-hooks.ts'; ${admin ? '' : 'export const useIsAdmin=()=>({isAdmin:false,loading:false});'}` }));
  await page.route('**/src/integrations/supabase/client.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export { supabase } from '/test/fixtures/admin-foundations-hooks.ts';" }));
  await page.route('**/src/components/DashboardHeader.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "import React from '/node_modules/.vite/deps/react.js'; export const AdminTabTitleProvider=({children})=>children; export const DashboardHeader=()=>React.createElement('header',{className:'bg-card px-4 py-5 md:px-8'},React.createElement('h1',{className:'font-teko text-[2.15rem] font-semibold'},'Administration'));" }));
  await page.route('**/src/lib/accountDeletion.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export const getPendingAccountDeletions=async()=>[]; export const formatDeletionDeadline=()=>'';" }));
  await page.route('**/src/lib/communitySafety.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    const q=()=>window.moderationQA;
    async function read(kind) { q().reads.push(kind); while(q().mode==='loading') await new Promise(r=>setTimeout(r,50)); if(q().mode==='error'||(kind==='reports'&&q().reportError)) throw new Error('Synthetic read error'); return q().mode!=='empty'&&q()[kind]; }
    export const getPendingComments=async()=>await read('comments')?[{id:'comment-1',user_id:'qa-member',boulder_id:'qa-boulder',comment:'Ein toller Boulder. '+ 'LangerKommentar'.repeat(18),created_at:'2026-10-18T10:00:00Z'}]:[];
    export const getOpenReports=async()=>await read('reports')?[{id:'report-1',kind:'comment',target_id:'reported-comment',subject_user_id:'qa-subject',reason:'harassment',detail:'Bitte diesen Kommentar prüfen.',content_text:'Synthetischer gemeldeter Inhalt.',boulder_id:'qa-boulder',status:'open'}]:[];
    export const reportReasons=[['harassment','Beleidigung oder Belästigung']];
    export async function moderateContent(...args) { q().writes.push(args); await new Promise(r=>setTimeout(r,200)); if(q().failWrite) throw new Error('Aktion wurde nicht bestätigt.'); if(args[2]==='approve'||args[2]==='reject') q().comments=false; if(args[2]==='resolve') q().reports=false; }
    export const getBlockedUsers=async()=>[]; export const reportContent=async()=>{}; export const blockUser=async()=>{};
  ` }));
  await page.route(/\/src\/components\/admin\/(AdminOverview|ColorManagement|SectorManagement|HallMapManagement|BoulderOperationLogs|FeedbackManagement|PushNotificationTest|MonitoringDashboard)\.tsx(\?.*)?$/, route => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!.replace('.tsx', '');
    return route.fulfill({ contentType: 'application/javascript', body: `export const ${name}=()=> 'Isoliert: ${name}';` });
  });
  await page.goto(`/test/fixtures/admin-foundations.html?integration=1&view=${view}`);
  await page.addStyleTag({ url: '/fonts.css' });
  await page.evaluate(() => document.fonts.ready);
}

async function noOverflow(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
async function openFeedback(page: Page) {
  const mobileNavigation = page.getByRole('navigation', { name: 'Adminnavigation', exact: true });
  if (await mobileNavigation.isVisible()) {
    await mobileNavigation.getByRole('button', { name: /^Mehr/ }).click();
    await page.getByRole('menuitem', { name: 'Feedback', exact: true }).click();
  } else {
    await page.getByRole('link', { name: 'Feedback', exact: true }).click();
  }
  await expect(page.getByText('Isoliert: FeedbackManagement', { exact: true })).toBeVisible();
}
const notice = (page: Page) => page.getByRole('complementary', { name: 'Offene Moderationsaufgaben' });
const choice = (page: Page, name: RegExp) => page.getByRole('group', { name: 'Moderationsansicht' }).getByRole('button', { name });
test.beforeEach(async () => { await mkdir(directory, { recursive: true }); });

for (const width of [375, 768, 1280, 1920]) {
  for (const mode of ['pending', 'empty'] as const) {
    test(`loop 1: ${mode} moderation navigation at ${width}`, async ({ page }) => {
      const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await open(page, mode, 'feedback');
      await expect(page.getByText('Isoliert: FeedbackManagement', { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Kommentare zur Freigabe' })).toHaveCount(0);
      if (mode === 'pending') await expect(notice(page)).toBeVisible();
      await page.screenshot({ animations: 'disabled', path: `${directory}/loop1-${mode}-entry-${width}.png` });
      if (mode === 'pending') {
        await expect(notice(page)).toContainText('1 Kommentar wartet auf Freigabe · 1 offene Inhaltsmeldung');
        await page.getByRole('link', { name: 'Moderation öffnen' }).focus();
        await page.keyboard.press('Enter');
      } else {
        await expect(notice(page)).toHaveCount(0);
        await page.getByRole('link', { name: 'Moderation', exact: true }).click();
      }
      await expect(page.getByRole('region', { name: 'Kommentare zur Freigabe' })).toBeVisible();
      await expect(notice(page)).toHaveCount(0);
      await expect(page.getByText('Isoliert: FeedbackManagement', { exact: true })).toHaveCount(0);
      await expect(page.locator('details')).not.toHaveAttribute('open');
      await page.screenshot({ animations: 'disabled', path: `${directory}/loop1-${mode}-comments-${width}.png` });
      await choice(page, /^Meldungen/).click();
      await expect(page.getByRole('region', { name: 'Offene Inhaltsmeldungen' })).toBeVisible();
      if (mode === 'empty') await expect(page.getByText('Keine offenen Meldungen.', { exact: true })).toBeVisible();
      else await expect(page.getByText('Synthetischer gemeldeter Inhalt.', { exact: true })).toBeVisible();
      await page.getByText('Hinweise zur Moderation', { exact: true }).click();
      await expect(page.getByRole('link', { name: 'Community-Regeln und Kontakt' })).toHaveAttribute('href', '/community-rules');
      await page.screenshot({ animations: 'disabled', path: `${directory}/loop1-${mode}-reports-${width}.png` });
      expect(await page.evaluate(() => window.moderationQA.reads)).toEqual(['comments', 'reports']);
      expect(await page.evaluate(() => window.moderationQA.writes)).toEqual([]);
      await noOverflow(page); expect(errors).toEqual([]);
    });
  }
  test(`loop 2: errors, mutations, recovery and reduced motion at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, 'error', 'moderation');
    await expect(page.getByRole('alert')).toContainText('Kommentare konnten nicht geladen werden.');
    await expect(page.getByText('Keine Kommentare zur Freigabe.', { exact: true })).toHaveCount(0);
    await page.screenshot({ animations: 'disabled', path: `${directory}/loop2-error-${width}.png` });
    await page.evaluate(() => { window.moderationQA.mode = 'pending'; });
    await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Freigeben', exact: true })).toBeVisible();
    await page.evaluate(() => { window.moderationQA.failWrite = true; });
    const action = width < 1000 ? 'Freigeben' : 'Ablehnen';
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Aktion wurde nicht bestätigt.');
    await expect(page.getByRole('button', { name: action, exact: true })).toBeEnabled();
    await page.evaluate(() => { window.moderationQA.failWrite = false; window.moderationQA.writes = []; });
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByRole('button', { name: action, exact: true })).toBeDisabled();
    await expect(page.getByText('Keine Kommentare zur Freigabe.', { exact: true })).toBeVisible();
    await choice(page, /^Meldungen/).click();
    await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
    await expect(page.getByText('Synthetischer gemeldeter Inhalt.', { exact: true })).toBeVisible();
    await page.screenshot({ animations: 'disabled', path: `${directory}/loop2-reports-${width}.png` });
    for (const label of ['Inhalt ausblenden', 'Wieder einblenden', 'Veröffentlichungen sperren', 'Sperre aufheben', 'Als bearbeitet markieren']) {
      const button = page.getByRole('button', { name: label, exact: true });
      await button.click();
      if (label !== 'Als bearbeitet markieren') await expect(button).toBeEnabled();
    }
    await expect(page.getByText('Keine offenen Meldungen.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.moderationQA.writes.map(args => args.slice(0, 3)))).toEqual([
      ['comment', 'comment-1', action === 'Freigeben' ? 'approve' : 'reject'],
      ['comment', 'reported-comment', 'hide'], ['comment', 'reported-comment', 'restore'],
      ['profile', 'qa-subject', 'ban'], ['profile', 'qa-subject', 'unban'], ['report', 'report-1', 'resolve'],
    ]);
    await openFeedback(page);
    await expect(notice(page)).toHaveCount(0);
    await noOverflow(page);
  });
}

test('a report-only task opens reports directly and partial failure stays explicit', async ({ page }) => {
  await open(page, 'pending');
  await page.evaluate(() => { window.moderationQA.comments = false; });
  await page.getByRole('link', { name: 'Moderation öffnen' }).click();
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect(choice(page, /^Kommentare/)).toHaveText('Kommentare (0)');
  await openFeedback(page);
  await expect(notice(page)).toContainText('1 offene Inhaltsmeldung');
  await page.getByRole('link', { name: 'Moderation öffnen' }).click();
  await expect(page.getByRole('region', { name: 'Offene Inhaltsmeldungen' })).toBeVisible();
  await page.evaluate(() => { window.moderationQA.reportError = true; });
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Meldungen konnten nicht geladen werden.');
  await openFeedback(page);
  await expect(notice(page)).toContainText('Stand teilweise nicht aktuell');
});

test('loading shows no fabricated counts and non-admins cannot read queues', async ({ page }) => {
  await open(page, 'loading', 'moderation');
  await expect(page.getByText('Kommentare werden geladen …', { exact: true })).toBeVisible();
  await expect(choice(page, /^Kommentare/)).toHaveText('Kommentare');
  await page.evaluate(() => { window.moderationQA.mode = 'empty'; });
  await expect(page.getByText('Keine Kommentare zur Freigabe.', { exact: true })).toBeVisible();
  await open(page, 'pending', 'moderation', false);
  await expect(page.getByTestId('current-route')).toHaveText('/');
  expect(await page.evaluate(() => window.moderationQA.reads)).toEqual([]);
});
