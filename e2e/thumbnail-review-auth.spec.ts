import {expect,test} from '@playwright/test';
test('explicit thumbnail login returns to the fixed review destination and keeps local decisions',async({page})=>{
  const requests:string[]=[];
  await page.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  await page.route('**/src/hooks/useAuth.ts*',route=>route.fulfill({contentType:'application/javascript',body:"export {useAuth} from '/test/thumbnail-auth-mock.tsx';"}));
  page.on('request',r=>{if(r.method()==='POST')requests.push(r.url());});
  await page.goto('/test/thumbnail-auth.html');
  await expect(page.getByText(/Deine Prüfauswahl bleibt auf diesem Gerät gespeichert/)).toBeVisible();
  await page.evaluate(()=>localStorage.setItem('qa-review-retained','97-confirmed'));
  await page.getByLabel('E-Mail',{exact:true}).fill('setter@example.invalid');
  await page.getByLabel('Passwort',{exact:true}).fill('fixture-only-password');
  await page.locator('form').getByRole('button',{name:'Anmelden',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Prüfliste nach Anmeldung · /setter/thumbnails');
  expect(await page.evaluate(()=>localStorage.getItem('qa-review-retained'))).toBe('97-confirmed');
  expect(requests).toEqual([]);
});
