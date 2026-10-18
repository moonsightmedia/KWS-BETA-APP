import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const directory = 'test-results/account-deletion-placement-20261018';
declare global {
  interface Window { deletionQA: { mode: 'empty' | 'pending' | 'error' | 'slow' | 'loading'; reads: number } }
}

async function open(page: Page, mode: Window['deletionQA']['mode'], view = 'users', admin = true) {
  await page.addInitScript(initial => { window.deletionQA = { mode: initial, reads: 0 }; }, mode);
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.route(/\/src\/hooks\/(useAuth\.tsx|useIsAdmin\.tsx|useHasRole\.ts)(\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript', body: `export * from '/test/fixtures/admin-foundations-hooks.ts'; ${admin ? '' : 'export const useIsAdmin=()=>({isAdmin:false,loading:false});'}`,
  }));
  await page.route('**/src/integrations/supabase/client.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export { supabase } from '/test/fixtures/admin-foundations-hooks.ts';" }));
  await page.route('**/src/components/DashboardHeader.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "import React from '/node_modules/.vite/deps/react.js'; export const AdminTabTitleProvider=({children})=>children; export const DashboardHeader=()=>React.createElement('header',{className:'bg-card px-4 py-5 md:px-8'},React.createElement('h1',{className:'font-teko text-[2.15rem] font-semibold'},'Benutzer'));" }));
  await page.route('**/src/lib/accountDeletion.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export async function getPendingAccountDeletions() {
      window.deletionQA.reads++;
      while(window.deletionQA.mode==='loading') await new Promise(resolve=>setTimeout(resolve,50));
      if(window.deletionQA.mode==='slow') await new Promise(resolve=>setTimeout(resolve,800));
      if(window.deletionQA.mode==='error') throw new Error('Synthetic read error');
      if(window.deletionQA.mode==='empty') return [];
      return [
        {id:'request-1',user_id:'qa-member',requested_at:'2026-10-18T10:00:00Z',due_at:'2026-10-25T10:00:00Z',status:'pending'},
        {id:'request-2',user_id:null,requested_at:'2026-10-18T10:00:00Z',due_at:'2026-10-25T10:00:00Z',status:'processing'},
      ];
    }
    export const formatDeletionDeadline=()=> '25.10.2026, 11:00';
  ` }));
  await page.route(/\/src\/components\/admin\/(ColorManagement|SectorManagement|HallMapManagement|BoulderOperationLogs|FeedbackManagement|PushNotificationTest|MonitoringDashboard|ContentModeration)\.tsx(\?.*)?$/, route => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!.replace('.tsx', '');
    return route.fulfill({ contentType: 'application/javascript', body: `export const ${name}=()=> 'Isoliert: ${name}';` });
  });
  await page.goto(`/test/fixtures/admin-foundations.html?integration=1&view=${view}`);
  await page.addStyleTag({ url: '/fonts.css' });
  await page.evaluate(() => document.fonts.ready);
}

test.beforeEach(async () => { await mkdir(directory, { recursive: true }); });

for (const width of [375, 768, 1280, 1920]) {
  for (const mode of ['empty', 'pending'] as const) {
    test(`loop 1: ${mode} requests are placed correctly at ${width}`, async ({ page }) => {
      const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await open(page, mode);
      await expect(page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Kontolöschungen' })).toHaveCount(0);
      await expect(page.getByText(/Marketing übernimmt/)).toHaveCount(0);
      const notice = page.getByRole('complementary', { name: 'Offene Kontolöschanträge' });
      if (mode === 'pending') await expect(notice).toContainText('2 offene Löschanträge');
      else await expect(notice).toHaveCount(0);
      await page.screenshot({ path: `${directory}/loop1-${mode}-list-${width}.png` });
      const link = page.getByRole('link', { name: mode === 'pending' ? 'Anträge ansehen' : 'Löschanträge', exact: true });
      await link.focus(); await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: 'Kontolöschungen' })).toBeVisible();
      await expect(notice).toHaveCount(0);
      if (mode === 'empty') await expect(page.getByText('Keine offenen Löschanträge.')).toBeVisible();
      else await expect(page.getByText('alexandra@example.test', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => window.deletionQA.reads)).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${directory}/loop1-${mode}-queue-${width}.png` });
      await page.getByRole('link', { name: 'Zur Benutzerliste' }).click();
      await expect(page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true })).toBeVisible();
      expect(await page.evaluate(() => window.adminQA.writes)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
  test(`loop 2: error, retry and reduced motion at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, 'error');
    await page.getByRole('link', { name: 'Löschanträge', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Löschanträge konnten nicht geladen werden');
    await expect(page.getByText('Keine offenen Löschanträge.')).toHaveCount(0);
    await page.screenshot({ path: `${directory}/loop2-error-${width}.png` });
    await page.evaluate(() => { window.deletionQA.mode = 'slow'; });
    await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Aktualisieren', exact: true })).toBeDisabled();
    await expect(page.getByText('alexandra@example.test', { exact: true })).toBeVisible();
    await page.evaluate(() => { window.deletionQA.mode = 'empty'; });
    await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
    await expect(page.getByText('Keine offenen Löschanträge.')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${directory}/loop2-recovered-${width}.png` });
  });
}

test('notice from another admin area opens the users queue', async ({ page }) => {
  await open(page, 'pending', 'settings');
  await page.getByRole('link', { name: 'Anträge ansehen' }).click();
  await expect(page.getByRole('heading', { name: 'Kontolöschungen' })).toBeVisible();
  await expect(page.getByTestId('current-route')).toHaveText('/admin?tab=users&usersView=deletions');
});

test('unconfirmed loading never shows a zero or a pending notice', async ({ page }) => {
  await open(page, 'loading');
  await expect(page.getByRole('complementary', { name: 'Offene Kontolöschanträge' })).toHaveCount(0);
  await page.evaluate(() => { window.deletionQA.mode = 'pending'; });
  await expect(page.getByText('2 offene Löschanträge')).toBeVisible();
});

test('non-admins cannot trigger the administrative queue query', async ({ page }) => {
  await open(page, 'pending', 'users', false);
  await expect(page.getByTestId('current-route')).toHaveText('/');
  expect(await page.evaluate(() => window.deletionQA.reads)).toBe(0);
  await expect(page.getByRole('link', { name: 'Löschanträge', exact: true })).toHaveCount(0);
});
