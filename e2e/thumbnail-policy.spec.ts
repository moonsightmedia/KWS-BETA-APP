import{test,expect,type Page}from'@playwright/test';
import{mkdir}from'node:fs/promises';
import path from'node:path';

const api='https://beta-api.kletterwelt-sauerland.de';
const ids=['03a06939-cbe7-48e0-94f6-23620ba301e1','09173fdd-77de-4b45-b19e-8c31c7c56450'];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5WQAAAAASUVORK5CYII=','base64');
async function prepare(page:Page,backend=api){
 const activity={models:0,otherWrites:0,analyzeOrigins:[] as string[]};
 const rows=[...ids.map((id,index)=>({id,name:`Bereits übernommen ${index+1}`,color:'Grün',color_2:null,sector_id:'sector',status:'haengt',volume_only:false,thumbnail_url:`${api}/storage/v1/object/public/beta-videos/thumbnail-focus/${index?'live-confirmed':'confirmed'}-2026-10-20/${id}-11d6c01908492a81a9a9.png`})),
 {id:'volume',name:'Nur Volumen',color:'Grün',color_2:null,sector_id:'sector',status:'haengt',volume_only:true,thumbnail_url:api+'/photos/volume.png'},
 {id:'missing-volume',name:'Unbekannter Volumentyp',color:'Grün',color_2:null,sector_id:'sector',status:'haengt',thumbnail_url:api+'/photos/unknown.png'},
 {id:'original',name:'Neues Original',color:'Grün',color_2:null,sector_id:'sector',status:'haengt',volume_only:false,thumbnail_url:api+'/photos/original.png'}];
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname.endsWith('/api/analyze')){activity.models++;activity.analyzeOrigins.push(url.origin);return route.fulfill({json:{version:'fixture',image_hash:'fixture-hash',image:'data:image/png;base64,'+png.toString('base64'),width:100,height:100,candidates:[],selected:[]}});}
  if(request.method()!=='GET'){activity.otherWrites++;return route.abort();}
  if(url.origin===backend&&url.pathname==='/rest/v1/boulders'){
   expect(url.searchParams.get('select')).toContain('volume_only');return route.fulfill({json:rows});
  }
  if(url.origin===api&&url.pathname.endsWith('.png'))return route.fulfill({body:png,contentType:'image/png'});
  if(url.hostname==='127.0.0.1')return route.continue();
  return route.abort();
 });
 return activity;
}
test('published variants and volume originals never reenter analysis or publication',async({page})=>{
 const activity=await prepare(page);await page.goto('/test/fixtures/thumbnail-policy.html');
 await expect(page.getByText(/0 geprüft · 2 bereits online übernommen · 2 Originale geschützt/)).toBeVisible();
 await expect(page.getByRole('article')).toHaveCount(1);await expect(page.getByRole('article',{name:'Neues Original'})).toBeVisible();
 await expect.poll(()=>activity.models).toBe(1);
 await page.getByRole('combobox',{name:'Prüfstatus'}).click();await page.getByRole('option',{name:'Online übernommen',exact:true}).click();
 await expect(page.getByRole('article')).toHaveCount(2);
 for(const article of await page.getByRole('article').all()){await expect(article.getByRole('button',{name:'Passt',exact:true})).toBeDisabled();await expect(article.getByRole('button',{name:'Korrigieren',exact:true})).toBeDisabled();}
 await page.getByRole('combobox',{name:'Prüfstatus'}).click();await page.getByRole('option',{name:'Original geschützt',exact:true}).click();
 await expect(page.getByText('Nur Volumen · Original bleibt',{exact:true})).toBeVisible();await expect(page.getByText('Volumentyp unbekannt · Original bleibt',{exact:true})).toBeVisible();
 expect(activity.models).toBe(1);expect(activity.otherWrites).toBe(0);await expect(page.getByRole('button',{name:'0 online übernehmen',exact:true})).toBeDisabled();
 const saved=await page.evaluate(()=>new Promise<number>((resolve,reject)=>{
  const opening=indexedDB.open('kws-thumbnail-review-v1');opening.onerror=()=>reject(opening.error);
  opening.onsuccess=()=>{const db=opening.result,request=db.transaction('decisions').objectStore('decisions').count();request.onsuccess=()=>{db.close();resolve(request.result);};request.onerror=()=>reject(request.error);};
 }));expect(saved).toBe(0);
});
for(const mode of ['native','review'])test(`${mode} analysis uses the configured API origin instead of the app localhost`,async({page})=>{
 const backend=mode==='review'?'https://review-api.kletterwelt-sauerland.de':api;
 const activity=await prepare(page,backend);await page.goto(`/test/fixtures/thumbnail-policy.html?${mode}`);
 await expect.poll(()=>activity.analyzeOrigins.length).toBeGreaterThan(0);
 expect(activity.analyzeOrigins.every(origin=>origin===backend)).toBe(true);expect(activity.otherWrites).toBe(0);
});
for(const width of[375,768,1280,1920])test(`protected catalog visual loops at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});const activity=await prepare(page);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/test/fixtures/thumbnail-policy.html');await expect(page.getByRole('article',{name:'Neues Original'})).toBeVisible();
 const out=path.resolve('output/thumbnail-integration-20261020');await mkdir(out,{recursive:true});
 await page.screenshot({path:path.join(out,`policy-loop1-${width}.png`),fullPage:true});
 await page.getByRole('combobox',{name:'Prüfstatus'}).click();await page.getByRole('option',{name:'Alle Bilder',exact:true}).click();
 await expect(page.getByRole('article')).toHaveCount(5);await page.screenshot({path:path.join(out,`policy-loop2-${width}.png`),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(activity.otherWrites).toBe(0);expect(errors).toEqual([]);
});
