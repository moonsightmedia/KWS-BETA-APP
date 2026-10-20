import {expect,test} from '@playwright/test';
for(const width of [375,768,1280,1920])test(`birthday normalization and confirmed saving at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto('/test/fixtures/designmotion-five.html');
  const birthday=page.getByLabel('Geburtsdatum',{exact:false});
  await birthday.fill('31022000');await birthday.press('Tab');
  await expect(birthday).toHaveValue('31.02.2000');
  await expect(page.getByLabel('Bestätigtes Profil')).toHaveText('null');
  await page.getByRole('button',{name:'Speichern',exact:true}).click();
  await expect(birthday).toHaveAttribute('aria-invalid','true');
  await expect(birthday).toBeFocused();
  await birthday.fill('29/02/2000');await birthday.press('Tab');
  await expect(birthday).toHaveValue('29.02.2000');
  await birthday.fill('29022000');await birthday.press('Enter');
  await expect(birthday).toBeDisabled();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Bestätigtes Profil')).toHaveText(JSON.stringify({first_name:'Alex',last_name:'König',full_name:'Alex König',birth_date:'2000-02-29'}));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('birthday clearing remains explicit and a failed save retains input',async({page})=>{
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto('/test/fixtures/designmotion-five.html?failure');
  const birthday=page.getByLabel('Geburtsdatum',{exact:false});
  await birthday.fill('');await birthday.press('Tab');
  await expect(page.getByLabel('Bestätigtes Profil')).toHaveText('null');
  await page.getByRole('button',{name:'Speichern',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Eingaben bleiben erhalten');
  await expect(birthday).toHaveValue('');
  await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Abbrechen',exact:true}).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
});
