import {expect,test,type Page} from '@playwright/test';

async function setup(page:Page,query='') {
  let tick={id:'tick-undo',boulder_id:'undo-boulder',user_id:'designmotion-user',status:'top',attempt_count:7,note:'Private Notiz',is_favorite:true,is_project:true,created_at:'2026-10-01',updated_at:'2026-10-20'};
  const writes:Array<{method:string;body:Record<string,unknown>;query:string}>=[];
  let fail=false,conflict=false;
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.route('**/src/hooks/useAuth.tsx*',route=>route.fulfill({contentType:'application/javascript',body:"export * from '/test/fixtures/designmotion-auth.tsx';"}));
  await page.route('**/src/lib/backendConfig.ts*',route=>route.fulfill({contentType:'application/javascript',body:"export const backendConfig={supabaseUrl:location.origin+'/fixture-api',publicKey:'fixture-only'};export const backendStorageKey=k=>k;"}));
  await page.route('**/fixture-api/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname.endsWith('/boulder_ticks')) {
      if(request.method()==='GET') return route.fulfill({json:[tick]});
      const body=request.postDataJSON();writes.push({method:request.method(),body,query:url.search});
      if(fail)return route.fulfill({status:503,json:{message:'Verbindung unterbrochen'}});
      if(conflict)return route.fulfill({json:[]});
      tick={...tick,...body};
      return route.fulfill({json:[tick]});
    }
    return route.fulfill({json:[]});
  });
  await page.goto('/test/fixtures/designmotion-four.html'+query);
  return {writes,get tick(){return tick;},set fail(value:boolean){fail=value;},set conflict(value:boolean){conflict=value;}};
}

test('project removal and undo patch only the marker and preserve tracking',async({page})=>{
  const data=await setup(page);
  const project=page.getByRole('button',{name:'Projekt',exact:true});
  await expect(project).toHaveAttribute('aria-pressed','true');
  await project.click();await page.getByRole('button',{name:'Rückgängig',exact:true}).click();
  await expect(project).toHaveAttribute('aria-pressed','true');
  await expect(page.getByText('Wieder in deinen Projekten.',{exact:true})).toBeVisible();
  expect(data.writes.map(w=>[w.method,w.body])).toEqual([['PATCH',{is_project:false}],['PATCH',{is_project:true}]]);
  expect(data.writes[1].query).toContain('user_id=eq.designmotion-user');
  expect(data.writes[1].query).toContain('id=eq.tick-undo');
  expect(data.writes[1].query).toContain('is_project=eq.false');
  expect(data.tick).toMatchObject({note:'Private Notiz',attempt_count:7,status:'top',is_favorite:true});
});
test('failed removal never offers undo; failed undo never claims restored',async({page})=>{
  const data=await setup(page);const project=page.getByRole('button',{name:'Projekt',exact:true});
  await expect(project).toHaveAttribute('aria-pressed','true');data.fail=true;
  await project.click();await expect(project).toBeEnabled();await expect(project).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:'Rückgängig',exact:true})).toHaveCount(0);
  data.fail=false;await project.click();await expect(page.getByRole('button',{name:'Rückgängig',exact:true})).toBeVisible();data.conflict=true;
  await page.getByRole('button',{name:'Rückgängig',exact:true}).click();
  await expect(page.getByText('Nicht wiederhergestellt. Bitte erneut als Projekt markieren.',{exact:true})).toBeVisible();
  await expect(project).toHaveAttribute('aria-pressed','false');
});
for(const target of ['Konto wechseln','Track schließen'])test(`undo expires when ${target}`,async({page})=>{
  const data=await setup(page);const project=page.getByRole('button',{name:'Projekt',exact:true});
  await expect(project).toHaveAttribute('aria-pressed','true');await project.click();
  await expect(page.getByRole('button',{name:'Rückgängig',exact:true})).toBeVisible();
  await page.getByRole('button',{name:target,exact:true}).click();
  await expect(page.getByRole('button',{name:'Rückgängig',exact:true})).toHaveCount(0);expect(data.writes).toHaveLength(1);
});
test('a later marker change invalidates the previous undo',async({page})=>{
  await setup(page);const project=page.getByRole('button',{name:'Projekt',exact:true});
  await expect(project).toHaveAttribute('aria-pressed','true');await project.click();
  await expect(page.getByRole('button',{name:'Rückgängig',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Gespeichert',exact:true}).click();
  await expect(page.getByRole('button',{name:'Rückgängig',exact:true})).toHaveCount(0);
});
test('undo offer expires after ten seconds without another write',async({page})=>{
  const data=await setup(page);const project=page.getByRole('button',{name:'Projekt',exact:true});
  await expect(project).toHaveAttribute('aria-pressed','true');await project.click();
  await expect(page.getByRole('button',{name:'Rückgängig',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Rückgängig',exact:true})).toHaveCount(0,{timeout:12000});expect(data.writes).toHaveLength(1);
});
for(const width of [375,768,1280,1920])test(`editor focus, validation and pending lock at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});await setup(page,'?editor');
  const name=page.getByLabel('Name',{exact:true});await expect(name).toBeFocused();
  await name.fill('');await page.getByRole('button',{name:'Speichern',exact:true}).click();await expect(name).toBeFocused();await expect(name).toHaveAttribute('aria-invalid','true');
  await name.fill('Neuer Name');await page.getByRole('button',{name:'Speichern',exact:true}).click();
  await expect(page.getByRole('button',{name:'Wird gespeichert …',exact:true})).toBeDisabled();
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByLabel('Speicheranzahl')).toHaveText('1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('editor failure retains input and permits retry',async({page})=>{
  await setup(page,'?editor&error');await page.getByLabel('Name',{exact:true}).fill('Bleibt erhalten');
  await page.getByRole('button',{name:'Speichern',exact:true}).click();
  await expect(page.getByRole('button',{name:'Erneut speichern',exact:true})).toBeEnabled();
  await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Bleibt erhalten');await expect(page.getByLabel('Speicheranzahl')).toHaveText('0');
});
