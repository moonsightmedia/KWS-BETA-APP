import {test,expect} from '@playwright/test';
test('disabled feature preserves the normal editor and original upload',async({page})=>{
 let analysis=0;await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page.on('request',request=>{if(request.url().includes('/api/analyze'))analysis++;});
 await page.goto('/test/fixtures/thumbnail-setter.html?state=hierarchy');
 const submit=page.getByRole('button',{name:'Zum Stapel hinzufügen',exact:true});await expect(submit).toBeEnabled();
 await expect(page.locator('[data-thumbnail-focus]')).toHaveCount(0);
 await submit.click();await expect(page.locator('[data-fixture-result]')).toHaveText('Original gespeichert');expect(analysis).toBe(0);
});
