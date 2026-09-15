import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
const output = process.env.SETTER_QA_OUTPUT || 'test-results/setter-desktop-audit-20260915';
test.use({ trace: 'off', video: 'off', timezoneId: 'Europe/Berlin' });

async function openSetter(page: Page, route = '/setter/create', extra = '') {
  await page.clock.setFixedTime(new Date('2026-09-15T08:00:00Z'));
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  for (const hook of ['useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps']) {
    await page.route(`**/src/hooks/${hook}.ts*`, r => r.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/setter-hooks.ts';" }));
  }
  await page.route('**/src/hooks/useAuth.tsx*', r => r.fulfill({contentType:'application/javascript',body:`
    const role = new URLSearchParams(location.search).get('role');
    export const useAuth = () => ({ user: role==='loggedout' ? null : {id:'fixture-setter',email:'setter@example.invalid'},session:role==='loggedout'?null:{access_token:'fixture-only'},loading:false,authTransition:null,signOut(){} });
  `}));
  await page.route('**/src/hooks/useHasRole.ts*', r => r.fulfill({contentType:'application/javascript',body:`
    const role = new URLSearchParams(location.search).get('role') || 'setter';
    export const useHasRole = value => ({hasRole:role===value,loading:false});
  `}));
  await page.route('**/src/hooks/useIsAdmin.ts*', r => r.fulfill({contentType:'application/javascript',body:"export const useIsAdmin = () => ({isAdmin:new URLSearchParams(location.search).get('role')==='admin',loading:false});"}));
  await page.route('**/src/contexts/UploadContext.tsx*', r => r.fulfill({contentType:'application/javascript',body:"export { useUpload } from '/test/fixtures/setter-hooks.ts';"}));
  await page.goto(`/test/fixtures/setter-desktop.html?route=${encodeURIComponent(route)}${extra}`);
  await page.evaluate(() => document.fonts.ready);
}
async function shot(page: Page, name: string) {
  await mkdir(output,{recursive:true});
  await page.screenshot({path:`${output}/${name}.png`,animations:'disabled'});
}
async function assertFrame(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  const sidebar = await page.locator('#desktop-navigation').boundingBox();
  const main = await page.locator('main').boundingBox();
  expect(main!.x).toBeGreaterThanOrEqual(sidebar!.x+sidebar!.width-1);
}

async function assertUploadActions(page: Page) {
  const add = page.getByRole('button', { name: 'Boulder hinzufügen', exact: true });
  const overview = page.getByRole('button', { name: 'Upload-Übersicht öffnen', exact: true });
  await expect(add).toHaveCount(1);
  await expect(overview).toHaveCount(1);
  await expect(add).toBeInViewport();
  await expect(overview).toBeInViewport();
  const a = (await add.boundingBox())!;
  const b = (await overview.boundingBox())!;
  expect(b.x + b.width + 11).toBeLessThanOrEqual(a.x);
  expect(Math.abs(a.y - b.y)).toBeLessThan(1);
  for (const control of [add, overview]) {
    expect(await control.evaluate(element => {
      const r = element.getBoundingClientRect();
      return [[.1,.5],[.5,.5],[.9,.5]].every(([x,y]) =>
        element.contains(document.elementFromPoint(r.x+r.width*x,r.y+r.height*y)));
    })).toBe(true);
  }
}

for (const [width,height] of [[1280,720],[1920,1080]]) {
  test.describe(`${width} desktop`, () => {
    test.use({ viewport: {width,height} });
    test('all routes, active sidebar, collapse, focus and profile menu', async ({page}) => {
      const errors:string[]=[]; page.on('pageerror', e=>errors.push(e.message));
      await openSetter(page);
      const sidebar=page.locator('#desktop-navigation');
      for (const [label,path] of [['Erstellen','create'],['Bearbeiten','edit'],['Status','status'],['Planung','schedule']]) {
        await sidebar.getByRole('link',{name:label,exact:true}).click();
        await expect(page.getByRole('heading',{name:label,exact:true,level:1})).toBeVisible();
        await expect(sidebar.getByRole('link',{name:label,exact:true})).toHaveAttribute('aria-current','page');
        await expect(page.getByRole('button',{name:'Upload-Übersicht öffnen',exact:true})).toHaveCount(1);
        await expect(page.getByRole('button',{name:'Upload-Übersicht öffnen',exact:true})).toBeInViewport();
        await assertFrame(page,width);
        await shot(page,`shell-${path}-${width}`);
      }
      await page.getByRole('button',{name:'Navigation einklappen',exact:true}).click();
      await expect(sidebar).toHaveCSS('width','80px');
      await expect(page.locator('.kws-sidebar-content')).toHaveCSS('margin-left','80px');
      await sidebar.getByRole('link',{name:'Status',exact:true}).press('Enter');
      await expect(page.getByRole('heading',{name:'Status',exact:true,level:1})).toBeVisible();
      await shot(page,`collapsed-sidebar-${width}`);
      await page.getByRole('button',{name:'Navigation ausklappen',exact:true}).click();
      await expect(sidebar).toHaveCSS('width','256px');
      await page.getByRole('button',{name:/Profil und Einstellungen/}).hover();
      await expect(page.getByRole('menu')).toBeVisible();
      await page.getByRole('button',{name:/Profil und Einstellungen/}).click();
      await expect(page.getByRole('menu')).toBeVisible();
      await expect(page.getByRole('menu')).toContainText('Setter');
      await page.getByRole('menuitem',{name:/^Setter/}).hover();
      await expect(page.getByRole('menuitem',{name:/^Setter/})).toBeInViewport();
      await shot(page,`profile-menu-${width}`);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu')).toHaveCount(0);
      expect(errors).toEqual([]);
    });

    test('create form, field validation, two-draft upload, pending controls and safe scope', async ({page}) => {
      await openSetter(page);
      await page.route('**/src/components/setter/BatchUpload.tsx*',async r=>{
        const response=await r.fetch();
        const body=(await response.text()).replaceAll('import.meta.env.VITE_SUPABASE_URL',JSON.stringify('http://127.0.0.1:5173/qa')).replaceAll('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY',JSON.stringify('fixture-only'));
        await r.fulfill({response,body});
      });
      await page.reload();
      let requests=0;
      await page.route('**/qa/rest/v1/boulders',r=>r.fulfill({contentType:'application/json',body:JSON.stringify([{id:`qa-${++requests}`,name:'QA'}])}));
      const png=await readFile('src/assets/boulderkarte-original.png');
      for(const name of ['Desktop eins','Desktop zwei']) {
        await page.getByRole('button',{name:'Boulder hinzufügen',exact:true}).click();
        const dialog=page.getByRole('dialog');
        const bounds=await dialog.boundingBox();
        expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(height);
        await expect(page.getByRole('button',{name:'Zum Stapel hinzufügen',exact:true})).toBeInViewport();
        await page.getByLabel('Name',{exact:true}).fill(name);
        await page.getByRole('button',{name:'Farbe Blau',exact:true}).click();
        await expect(page.getByLabel('Name',{exact:true})).toHaveValue(name);
        await page.getByLabel('Video',{exact:true}).setInputFiles({name:'qa.mp4',mimeType:'video/mp4',buffer:Buffer.from('mock only')});
        await page.getByLabel('Vorschaubild',{exact:true}).setInputFiles({name:'qa.png',mimeType:'image/png',buffer:png});
        await page.getByRole('combobox',{name:'Sektor wählen',exact:true}).click();
        await page.getByRole('option').first().click();
        await shot(page,`create-form-${width}`);
        await page.getByRole('button',{name:'Zum Stapel hinzufügen',exact:true}).click();
        await expect(dialog).toHaveCount(0);
      }
      await expect(page.getByRole('button',{name:'2 Boulder hochladen',exact:true})).toBeInViewport();
      await assertFrame(page,width);
      await assertUploadActions(page);
      await shot(page,`queue-${width}`);
      await page.evaluate(()=>{window.setterQA.delay=200;});
      await page.getByRole('button',{name:'2 Boulder hochladen',exact:true}).click();
      await expect(page.getByRole('button',{name:'Boulder hinzufügen',exact:true})).toBeDisabled();
      await expect(page.getByText('2 Boulder übertragen',{exact:true})).toBeVisible({timeout:12000});
      expect(requests).toBe(2);
      expect(await page.evaluate(()=>window.setterQA.uploads)).toEqual(['thumbnail','video','thumbnail','video']);
    });

    test('edit filters, all results, update, pending error retention and delete confirmation', async ({page}) => {
      await openSetter(page,'/setter/edit','&many');
      await expect(page.getByText('125 Boulder', {exact:false}).first()).toBeVisible();
      await page.getByRole('button',{name:'Weitere Boulder anzeigen (75)',exact:true}).click();
      await expect(page.getByText('125 Boulder · 100 angezeigt',{exact:true})).toBeVisible();
      await page.getByRole('button',{name:'Weitere Boulder anzeigen (25)',exact:true}).click();
      await expect(page.getByRole('button',{name:/Weitere Boulder anzeigen/})).toHaveCount(0);
      await expect(page.getByRole('button',{name:/ bearbeiten$/})).toHaveCount(125);
      await page.getByRole('button',{name:'Filter öffnen',exact:true}).click();
      await page.getByRole('button',{name:'Farbe Blau',exact:true}).click();
      await expect(page.getByRole('button',{name:/Boulder anzeigen$/})).toBeInViewport();
      await shot(page,`edit-filter-${width}`);
      await page.getByRole('button',{name:/Boulder anzeigen$/}).click();
      await page.getByRole('button',{name:'Farbe Blau entfernen',exact:true}).click();
      await page.getByRole('textbox',{name:'Boulder suchen',exact:true}).fill('Kleine Kante');
      await page.getByRole('button',{name:'Kleine Kante bearbeiten',exact:true}).click();
      await page.getByLabel('Name',{exact:true}).fill('Desktop geändert');
      await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeInViewport();
      await page.evaluate(()=>{window.setterQA.fail=true;window.setterQA.delay=200;});
      await page.getByRole('button',{name:'Speichern',exact:true}).click();
      await expect(page.getByRole('alert')).toContainText('Testfehler');
      await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Desktop geändert');
      await page.evaluate(()=>{window.setterQA.fail=false;});
      await page.getByRole('button',{name:'Speichern',exact:true}).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button',{name:'Kleine Kante bearbeiten',exact:true}).click();
      await page.getByRole('button',{name:'Boulder löschen',exact:true}).click();
      await expect(page.getByRole('alertdialog')).toContainText('Kleine Kante');
      await page.getByRole('alertdialog').getByRole('button',{name:'Abbrechen',exact:true}).click();
      expect(await page.evaluate(()=>window.setterQA.writes.filter(w=>w.kind==='delete-boulder'))).toEqual([]);
    });

    test('status selection, collapse, map filter and batch status mutation', async ({page}) => {
      await openSetter(page,'/setter/status');
      await page.getByRole('button',{name:'Alle Ergebnisse wählen',exact:true}).click();
      await page.getByRole('button',{name:'Alle einklappen',exact:true}).click();
      await expect(page.getByText('12 ausgewählte Boulder in eingeklappten Gruppen. Die Auswahl bleibt aktiv.')).toBeVisible();
      await expect(page.getByRole('button',{name:'Abschrauben',exact:true})).toBeInViewport();
      await shot(page,`status-selection-${width}`);
      await page.getByRole('button',{name:'Abschrauben',exact:true}).click();
      await expect(page.getByRole('alertdialog')).toContainText('12 ausgewählte Boulder');
      await page.getByRole('alertdialog').getByRole('button',{name:'Abschrauben',exact:true}).click();
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await page.getByRole('button',{name:/^Hängt 0$/}).click();
      await expect(page.getByText('Keine Boulder gefunden',{exact:true})).toBeVisible();
      await page.getByRole('button',{name:'Zurücksetzen',exact:true}).click();
      await page.getByRole('button',{name:'Hallenkarte',exact:true}).click();
      await expect(page.getByRole('button',{name:/Bug A, \d+ Boulder filtern/})).toBeVisible();
      await page.getByRole('button',{name:/Bug A, \d+ Boulder filtern/}).click();
      await expect(page.getByRole('button',{name:'Sektor Bug A entfernen',exact:true})).toBeVisible();
      expect(await page.evaluate(()=>window.setterQA.writes.map(w=>w.kind))).toEqual(['update-status']);
    });

    test('calendar datepicker, full-height form, create and delete, past/list toggle', async ({page}) => {
      await openSetter(page,'/setter/schedule','&calendar');
      await page.getByRole('gridcell',{name:/^Samstag, 19\. September 2026/}).click();
      await expect(page.getByRole('button',{name:'Datum wählen',exact:true})).toContainText('19. September');
      await page.getByRole('button',{name:'Datum wählen',exact:true}).click();
      await expect(page.getByRole('grid').last()).toBeVisible();
      await shot(page,`schedule-datepicker-${width}`);
      await page.keyboard.press('Escape');
      await page.getByRole('button',{name:'Bug A',exact:true}).click();
      await page.getByLabel('Uhrzeit',{exact:true}).fill('18:45');
      await expect(page.getByRole('button',{name:'Termin erstellen',exact:true})).toBeInViewport();
      await page.getByRole('button',{name:'Termin erstellen',exact:true}).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('region',{name:'Tagesplanung'})).toContainText('18:45');
      await page.getByRole('button',{name:'Termin Bug A löschen',exact:true}).click();
      await page.getByRole('alertdialog').getByRole('button',{name:'Löschen',exact:true}).click();
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await page.getByRole('button',{name:'Liste',exact:true}).click();
      await page.getByRole('button',{name:'Vergangen',exact:true}).click();
      await expect(page.getByRole('heading',{name:/31. August 2026/})).toBeVisible();
      expect(await page.evaluate(()=>window.setterQA.writes.map(w=>w.kind))).toEqual(['create-schedule','delete-schedule']);
    });
  });
}

for (const role of ['setter','admin','member','loggedout']) test(`desktop access routing: ${role}`,async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await openSetter(page,'/setter?view=schedule',`&role=${role}`);
  if(role==='setter'||role==='admin') await expect(page.getByRole('heading',{name:'Planung',exact:true,level:1})).toBeVisible();
  else if(role==='member') { await expect(page.getByRole('status')).toContainText('Kein Zugriff'); await expect(page.getByRole('button',{name:'Neuer Termin',exact:true})).toHaveCount(0); }
  else await expect(page.getByRole('heading',{name:'Anmeldung',exact:true})).toBeVisible();
});

for (const [width,height] of [[375,812],[768,1024],[1280,720],[1920,1080]]) {
  test(`setter error counters and singular labels: ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height});
    await openSetter(page,'/setter/edit','&many');
    await expect(page.getByRole('status').filter({hasText:'125 Boulder'})).toContainText('50 angezeigt');
    await page.getByRole('button',{name:/Weitere Boulder anzeigen/}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button',{name:/Weitere Boulder anzeigen/})).toBeVisible();
    await page.getByLabel('Boulder suchen',{exact:true}).fill('e');
    await page.evaluate(async()=>{window.setterQA.readError='attributes';await window.setterQA.refetch();});
    await expect(page.getByRole('alert')).toContainText('Boulder konnten nicht geladen werden');
    await expect(page.getByRole('status').filter({hasText:/\d+ Boulder/})).toHaveCount(0);
    await expect(page.getByRole('button',{name:/Weitere Boulder anzeigen/})).toHaveCount(0);
    await expect(page.getByLabel('Boulder suchen',{exact:true})).toHaveValue('e');
    await page.screenshot({path:`test-results/session-recovery-20260915/${width}-counter-error.png`,animations:'disabled'});
    await page.evaluate(()=>{window.setterQA.readError=null;window.setterQA.readDelay=500;});
    await page.getByRole('button',{name:'Erneut versuchen',exact:true}).click();
    await expect(page.getByRole('button',{name:'Wird geladen …',exact:true})).toBeDisabled();
    await expect(page.getByRole('status').filter({hasText:'125 Boulder'})).toContainText('50 angezeigt');
    await expect(page.getByLabel('Boulder suchen',{exact:true})).toHaveValue('e');
    await openSetter(page,'/setter/edit','&error');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('status').filter({hasText:/\d+ Boulder/})).toHaveCount(0);
    await openSetter(page,'/setter/edit','&empty');
    await expect(page.getByRole('status').filter({hasText:'0 Boulder'})).toBeVisible();
    await expect(page.getByText('Keine Boulder gefunden',{exact:true})).toBeVisible();
    await openSetter(page,'/setter/status');
    await page.getByLabel('Boulder suchen',{exact:true}).fill('Kleine Kante 6');
    await expect(page.getByRole('status').filter({hasText:'1 Boulder'})).toHaveText('1 Boulder · 1 Sektor');
    await page.screenshot({path:`test-results/session-recovery-20260915/${width}-singular.png`,animations:'disabled'});
    await page.evaluate(async()=>{window.setterQA.readError='boulders';await window.setterQA.refetch();});
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button',{name:'Alle',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Hängt',exact:true})).toBeVisible();
    await openSetter(page,'/setter/schedule');
    await page.getByRole('button',{name:'Neuer Termin',exact:true}).click();
    await expect(page.getByText('0 Teilbereiche ausgewählt',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Bug A',exact:true}).click();
    await expect(page.getByText('1 Teilbereich ausgewählt',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Bug B',exact:true}).click();
    await expect(page.getByText('2 Teilbereiche ausgewählt',{exact:true})).toBeVisible();
  });
  test(`shared upload actions: ${width}px, all progress states and filled batch`, async ({page}) => {
    await page.setViewportSize({width,height});
    for (const state of ['empty','active','error','waiting_network','restoring','completed']) {
      await openSetter(page,'/setter/create',state==='empty'?'':`&uploadState=${state}`);
      await assertUploadActions(page);
      await page.screenshot({path:`test-results/setter-upload-dock-20260915/${width}-${state}.png`,animations:'disabled'});
      await page.getByRole('button',{name:'Upload-Übersicht öffnen',exact:true}).click();
      await expect(page.getByRole('dialog')).toContainText('Upload-Übersicht');
      await expect(page.getByRole('button',{name:'Upload-Übersicht schließen',exact:true})).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('button',{name:'Upload-Übersicht öffnen',exact:true})).toBeFocused();
    }
    await page.getByRole('button',{name:'Boulder hinzufügen',exact:true}).click();
    await page.getByLabel('Name',{exact:true}).fill('Dock-Test');
    await page.getByLabel('Video',{exact:true}).setInputFiles({name:'qa.mp4',mimeType:'video/mp4',buffer:Buffer.from('mock only')});
    await page.getByLabel('Vorschaubild',{exact:true}).setInputFiles({name:'qa.png',mimeType:'image/png',buffer:await readFile('src/assets/boulderkarte-original.png')});
    await page.getByRole('combobox',{name:'Sektor wählen',exact:true}).click();
    await page.getByRole('option').first().click();
    await page.getByRole('button',{name:'Zum Stapel hinzufügen',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Radix keeps an exiting dialog mounted during its close animation. Wait
    // for the complete transition before testing the next dialog's keyboard layer.
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await assertUploadActions(page);
    const upload = page.getByRole('button',{name:'1 Boulder hochladen',exact:true});
    await expect(upload).toBeInViewport();
    const overview = (await page.getByRole('button',{name:'Upload-Übersicht öffnen',exact:true}).boundingBox())!;
    expect((await upload.boundingBox())!.y).toBeGreaterThan(overview.y+overview.height);
    await page.screenshot({path:`test-results/setter-upload-dock-20260915/${width}-batch.png`,animations:'disabled'});
    await page.getByRole('button',{name:'Upload-Übersicht öffnen',exact:true}).click();
    await expect(page.getByRole('button',{name:'Upload-Übersicht schließen',exact:true})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Dock-Test',{exact:true})).toBeVisible();
  });
}
