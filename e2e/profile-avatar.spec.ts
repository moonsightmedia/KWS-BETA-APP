import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const owner = '11111111-1111-4111-8111-111111111111';
const oldPhoto = '/qa-old-photo.svg';
const newPhoto = '/qa-new-photo.svg';
const output = 'test-results/notification-swipe-profile-20261014';
test.use({trace:'off',video:'off'});
async function open(page: Page, options: { removed?: boolean; failSave?: boolean } = {}) {
  const record = { id:owner,first_name:'Alex',last_name:'Berg',full_name:'Alex Berg',email:'alex@example.invalid',avatar_url:options.removed ? null : newPhoto };
  const writes: unknown[] = [];
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.route('**/qa-*-photo.svg',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#36B531"/><circle cx="50" cy="35" r="18" fill="#192436"/><path d="M15 100a35 45 0 0170 0" fill="#192436"/></svg>'}));
  const auth=`const user={id:'${owner}',email:'alex@example.invalid',user_metadata:{full_name:'Alex Berg',avatar_url:'${oldPhoto}'}};const session={access_token:'fixture-only'};export const useAuth=()=>({user,session,loading:false,resetPassword:async()=>{}});`;
  await page.route('**/src/hooks/useAuth.ts*',r=>r.fulfill({contentType:'application/javascript',body:auth}));
  await page.route('**/src/hooks/useIsAdmin.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const useIsAdmin=()=>({isAdmin:false,loading:false});'}));
  await page.route('**/src/hooks/useHasRole.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const useHasRole=()=>({hasRole:false,loading:false});'}));
  await page.route('**/src/components/DashboardPageLayout.tsx*',r=>r.fulfill({contentType:'application/javascript',body:"import React from '/node_modules/.vite/deps/react.js';export const DashboardPageLayout=({children})=>React.createElement('main',{className:'mx-auto max-w-5xl p-4 md:p-8'},children);"}));
  for(const component of ['BlockedUsers','AccountDeletion'])await page.route('**/src/components/'+component+'.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const '+component+'=()=>null;'}));
  await page.route('**/src/hooks/useBoulderCommunity.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const useMyTrackedBoulders=()=>({data:[]});export const useMyTrackingSessions=()=>({data:[]});'}));
  // Deliberately fail metadata synchronization: the saved profile must still win.
  await page.route('**/src/integrations/supabase/client.ts*',r=>r.fulfill({contentType:'application/javascript',body:"export const supabase={auth:{updateUser:async()=>({error:new Error('isolated metadata sync failure')})}};"}));
  await page.route('**/src/integrations/supabase/storage.ts*',r=>r.fulfill({contentType:'application/javascript',body:`export const uploadProfileAvatar=async()=> '${newPhoto}';export const deleteProfileAvatar=async()=>{};`}));
  await page.route('**/rest/v1/profiles?*',async r=>{
    if(r.request().method()==='PATCH') {
      writes.push(r.request().postDataJSON());
      if(options.failSave)return r.fulfill({status:503,json:{message:'Isolierter Speicherausfall'}});
      Object.assign(record,r.request().postDataJSON());return r.fulfill({json:[record]});
    }
    return r.fulfill({json:[record]});
  });
  await page.goto('/test/fixtures/profile-avatar.html');
  await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeEnabled();
  return {record,writes};
}
for(const width of [375,768,1280,1920]) test('profile photo consistent at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});await open(page);
  await expect(page.getByTestId('account-photo').locator('img')).toHaveAttribute('src',newPhoto);
  await expect(page.locator('main img').first()).toHaveAttribute('src',newPhoto);
  await mkdir(output,{recursive:true});await page.screenshot({path:output+'/profile-'+width+'.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
});
test('removed photo never returns from stale metadata, including after save and revisit',async({page})=>{
  await open(page,{removed:true});
  await expect(page.getByTestId('account-photo').locator('img')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Bild auswählen',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Speichern',exact:true}).click();
  await expect(page.getByRole('button',{name:'Profil bearbeiten',exact:true})).toBeVisible();
  await expect(page.locator('img')).toHaveCount(0);
  await page.getByRole('button',{name:'Profil bearbeiten',exact:true}).click();
  await expect(page.getByRole('button',{name:'Bild auswählen',exact:true})).toBeVisible();
});
test('removing photo automatically updates menu and profile despite failed auth sync',async({page})=>{
  const ctx=await open(page);await page.getByRole('button',{name:'Bild entfernen',exact:true}).click();
  await expect(page.getByText('Profilbild entfernt',{exact:true})).toBeVisible();
  await expect(page.locator('img')).toHaveCount(0);expect(ctx.record.avatar_url).toBeNull();
  expect(ctx.writes).toEqual([{avatar_url:null}]);
});
test('failed automatic photo save retains previous image and allows retry',async({page})=>{
  const ctx=await open(page,{failSave:true});
  await page.getByRole('button',{name:'Bild entfernen',exact:true}).click();
  await expect(page.getByText('Profilbild nicht entfernt',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Bild entfernen',exact:true})).toBeEnabled();
  await expect(page.getByTestId('account-photo').locator('img')).toHaveAttribute('src',newPhoto);
  expect(ctx.record.avatar_url).toBe(newPhoto);
});
test('replacement automatically saves photo alone, keeping unsaved name and email as drafts',async({page})=>{
  const ctx=await open(page,{removed:true});
  await page.getByLabel('Name',{exact:true}).fill('Entwurf Name');
  await page.getByLabel('E-Mail',{exact:true}).fill('draft@example.invalid');
  await page.locator('input[type=file]').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1h8AAAAASUVORK5CYII=','base64')});
  await expect(page.getByText('Profilbild gespeichert',{exact:true})).toBeVisible();
  await expect(page.getByTestId('account-photo').locator('img')).toHaveAttribute('src',newPhoto);
  await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Entwurf Name');
  await expect(page.getByLabel('E-Mail',{exact:true})).toHaveValue('draft@example.invalid');
  expect(ctx.writes).toEqual([{avatar_url:newPhoto}]);
  expect(ctx.record.full_name).toBe('Alex Berg');expect(ctx.record.email).toBe('alex@example.invalid');
});

for (const width of [375,768,1280,1920]) test('unsaved profile protects drafts and honors discard at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});
  const ctx=await open(page);
  await page.getByLabel('Name',{exact:true}).fill('Entwurf Name');
  await page.getByRole('button',{name:'Zum Profil',exact:true}).click();
  const dialog=page.getByRole('alertdialog',{name:'Änderungen verwerfen?'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Weiter bearbeiten'})).toBeFocused();
  await expect(dialog).toHaveCSS('opacity','1');
  await mkdir('output/usability',{recursive:true});
  await page.screenshot({path:`output/usability/profile-confirm-${width}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  await dialog.getByRole('button',{name:'Weiter bearbeiten'}).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Entwurf Name');
  await page.getByRole('button',{name:'Verlauf zurück',exact:true}).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Weiter bearbeiten'})).toBeFocused();
  await expect(dialog).toHaveCSS('opacity','1');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Entwurf Name');
  await page.getByRole('button',{name:'Zum Profil',exact:true}).click();
  await dialog.getByRole('button',{name:'Verwerfen',exact:true}).click();
  await expect(page.getByRole('button',{name:'Profil bearbeiten',exact:true})).toBeVisible();
  expect(ctx.writes).toEqual([]);
});

test('unchanged and reverted fields leave without warning; email edits also protected',async({page})=>{
  await open(page);
  await page.getByLabel('E-Mail',{exact:true}).fill('entwurf@example.invalid');
  await page.getByRole('button',{name:'Zum Profil',exact:true}).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button',{name:'Weiter bearbeiten'}).click();
  await page.getByLabel('E-Mail',{exact:true}).fill('alex@example.invalid');
  await page.getByRole('button',{name:'Zum Profil',exact:true}).click();
  await expect(page.getByRole('button',{name:'Profil bearbeiten',exact:true})).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('saved profile navigates without warning; failed save retains the protected draft',async({page})=>{
  await open(page,{failSave:true});
  await page.getByLabel('Name',{exact:true}).fill('Entwurf Name');
  await page.getByRole('button',{name:'Speichern',exact:true}).click();
  await expect(page.getByText('Speichern fehlgeschlagen',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Zum Profil',exact:true}).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button',{name:'Weiter bearbeiten'}).click();
  await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Entwurf Name');
  const ctx=await open(page);
  await page.getByLabel('Name',{exact:true}).fill('Gespeicherter Name');
  await page.getByRole('button',{name:'Speichern',exact:true}).click();
  await expect(page.getByRole('button',{name:'Profil bearbeiten',exact:true})).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(ctx.record.full_name).toBe('Gespeicherter Name');
});

test('browser reload asks before dropping unsaved profile edits',async({page})=>{
  await open(page);
  await page.getByLabel('Name',{exact:true}).fill('Entwurf Name');
  const dialogPromise=page.waitForEvent('dialog');
  // Schedule a real reload without waiting for a navigation we will cancel.
  await page.evaluate(()=>{window.setTimeout(()=>window.location.reload(),0);});
  const dialog=await dialogPromise;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Entwurf Name');
});


test('invalid profile fields retain drafts, expose inline errors and focus the first invalid field without a write',async({page})=>{
 const ctx=await open(page);
 const name=page.getByLabel('Name',{exact:true}),email=page.getByLabel('E-Mail',{exact:true});
 await name.fill('');await email.fill('ungueltig');
 await page.getByRole('button',{name:'Speichern',exact:true}).click();
 await expect(name).toBeFocused();await expect(name).toHaveAttribute('aria-invalid','true');
 await expect(email).toHaveValue('ungueltig');await expect(page.locator('#email-error')).toBeVisible();expect(ctx.writes).toEqual([]);
 await name.fill('Entwurf Name');await page.getByRole('button',{name:'Speichern',exact:true}).click();
 await expect(email).toBeFocused();await expect(name).toHaveValue('Entwurf Name');expect(ctx.writes).toEqual([]);
 await expect(name).toHaveAttribute('autocomplete','name');await expect(email).toHaveAttribute('autocomplete','email');
});
