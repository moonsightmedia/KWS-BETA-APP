import { test, expect, type Page } from '@playwright/test';
test.use({trace:'off',video:'off'});
const user = {id:'00000000-0000-4000-8000-000000000001',email:'setter@example.invalid',aud:'authenticated',role:'authenticated',user_metadata:{},app_metadata:{},created_at:'2026-01-01T00:00:00Z'};
async function open(page: Page) {
  const state = { refreshes:0, writes:0, invalid:false, badPassword:false, denied:false, roleFailures:0, expireReads:false, rejected:0 };
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.route('**/src/integrations/supabase/client.ts*',r=>r.fulfill({contentType:'application/javascript',body:"export * from '/test/fixtures/session-sdk.ts';"}));
  for (const hook of ['usePreloadSectorImages','usePreloadBoulderThumbnails']) await page.route(`**/src/hooks/${hook}.ts*`,r=>r.fulfill({contentType:'application/javascript',body:`export const ${hook}=()=>{};`}));
  await page.route('**/rest/v1/**',async r=>{
    const path=new URL(r.request().url()).pathname;
    if(r.request().method()!=='GET') {state.writes++;await r.fulfill({json:[]});return;}
    if(state.expireReads && /hall_maps|sector_schedule/.test(path)) {
      const token=r.request().headers().authorization?.split('.')[1];
      if(token && JSON.parse(Buffer.from(token,'base64').toString()).version===1) {state.rejected++;await r.fulfill({status:401,json:{code:'PGRST303',message:'JWT expired'}});return;}
    }
    if(path.endsWith('/profiles')) await r.fulfill({json:{id:user.id,email:user.email}});
    else if(path.endsWith('/user_roles')) {if(state.denied) state.roleFailures++;await r.fulfill({status:state.denied?503:200,json:state.denied?{}:[{user_id:user.id}]});}
    else if(path.endsWith('/hall_maps')) await r.fulfill({json:[{id:'map',name:'Testkarte',is_active:true,image_url:'',width:100,height:100}]});
    else await r.fulfill({json:[]});
  });
  await page.route('**/qa/supabase/auth/v1/**',async r=>{
    if(r.request().url().includes('/token')) {
      const password=new URL(r.request().url()).searchParams.get('grant_type')==='password';
      if(password && state.badPassword) {await r.fulfill({status:400,json:{code:'invalid_credentials',message:'Invalid login credentials'}});return;}
      if(!password) state.refreshes++;
      if(state.invalid&&!password) {await r.fulfill({status:400,json:{code:'refresh_token_not_found',message:'Invalid Refresh Token: Refresh Token Not Found'}});return;}
      const token=`fixture.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,version:2})).toString('base64')}.fake`;
      await r.fulfill({json:{access_token:token,refresh_token:'fixture-refresh-2',token_type:'bearer',expires_in:3600,user}});
    } else await r.fulfill({json:user});
  });
  await page.goto('/test/fixtures/session-recovery.html');
  await expect(page.getByTestId('auth-state')).toHaveText('Angemeldet');
  await expect(page.getByTestId('read-state')).toContainText('Planung: geladen · Karte: geladen');
  return state;
}
test('real SDK refresh and later getSession finish without an auth callback deadlock',async({page})=>{
  const state=await open(page);
  await page.getByLabel('Entwurf',{exact:true}).fill('Nicht verlieren');
  await page.getByRole('button',{name:'Token erneuern',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Erneuerung abgeschlossen');
  await expect(page.getByTestId('token-state')).toHaveText('Erneuert');
  await page.getByRole('button',{name:'Sitzung prüfen',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Sitzung geprüft');
  await expect(page.getByLabel('Entwurf',{exact:true})).toHaveValue('Nicht verlieren');
  expect(state.refreshes).toBe(1);
});
test('legacy awaited callback reproduces the SDK lock without network delay',async({page})=>{
  await open(page);
  const result=await page.evaluate(async()=>{
    const {supabase}=await import('/test/fixtures/session-sdk.ts');
    // Isolated legacy pattern, not a mutation of production code or auth.
    supabase.auth.onAuthStateChange(async event=>{if(event==='TOKEN_REFRESHED') await supabase.from('profiles').select('id');});
    return Promise.race([supabase.auth.refreshSession().then(()=> 'finished'),new Promise(resolve=>setTimeout(()=>resolve('blocked'),500))]);
  });
  expect(result).toBe('blocked');
});
test('resume synchronizes a new token for the same user even without TOKEN_REFRESHED',async({page})=>{
  await open(page);
  await page.getByLabel('Entwurf',{exact:true}).fill('Sicherer Entwurf');
  await page.evaluate(async()=>{const {replaceStoredSession}=await import('/test/fixtures/session-sdk.ts');replaceStoredSession();document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.getByTestId('token-state')).toHaveText('Erneuert');
  await expect(page.getByLabel('Entwurf',{exact:true})).toHaveValue('Sicherer Entwurf');
});
test('actual map and schedule hooks recover expired GETs, sharing one refresh',async({page})=>{
  const state=await open(page); state.expireReads=true;
  await page.getByRole('button',{name:'Seiten erneut laden',exact:true}).click();
  await expect(page.getByTestId('token-state')).toHaveText('Erneuert');
  await expect(page.getByTestId('read-state')).toContainText('Planung: geladen · Karte: geladen');
  expect(state.refreshes).toBe(1);expect(state.rejected).toBeGreaterThanOrEqual(1);
});
test('role lookup failure on resume does not revoke cached navigation roles',async({page})=>{
  const state=await open(page);
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('nav_isSetter'))).toBe('true');
  state.denied=true;
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(()=>state.roleFailures).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(()=>[localStorage.getItem('nav_isAdmin'),localStorage.getItem('nav_isSetter')])).toEqual(['true','true']);
  await expect(page.getByTestId('auth-state')).toHaveText('Angemeldet');
});
for(const [width,height] of [[375,812],[768,1024],[1280,720],[1920,1080]]) test(`expired session reauth preserves an open draft at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height});
  const state=await open(page);
  await page.getByRole('button',{name:'Editor öffnen',exact:true}).click();
  await page.getByLabel('Editor-Entwurf').fill('Boulder bleibt erhalten');
  // SDK operation only on the isolated fixture; no real session/storage altered.
  state.invalid=true;
  await page.evaluate(async()=>{const {supabase}=await import('/test/fixtures/session-sdk.ts');await supabase.auth.refreshSession();});
  await expect(page.getByRole('dialog',{name:'Bitte erneut anmelden',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog',{name:'Bitte erneut anmelden',exact:true})).toBeVisible();
  await expect(page.getByLabel('Konto',{exact:true})).toHaveValue(user.email);
  await expect(page.getByLabel('Konto',{exact:true})).toHaveAttribute('readonly','');
  await expect(page.getByLabel('Passwort',{exact:true})).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({path:`test-results/session-recovery-20260915/${width}-reauth.png`,animations:'disabled'});
  state.badPassword=true;
  await page.getByLabel('Passwort',{exact:true}).fill('fixture-wrong-password');
  await page.getByRole('button',{name:'Erneut anmelden',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Anmeldung nicht möglich');
  await expect(page.getByLabel('Passwort',{exact:true})).toHaveValue('');
  state.badPassword=false;
  await page.getByLabel('Passwort',{exact:true}).fill('fixture-password-not-real');
  await page.getByRole('button',{name:'Erneut anmelden',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Bitte erneut anmelden',exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Editor-Entwurf')).toHaveValue('Boulder bleibt erhalten');
  await page.getByRole('button',{name:'Editor schließen',exact:true}).click();
  await expect(page.getByLabel('Entwurf',{exact:true})).toHaveValue('Boulder bleibt erhalten');
  expect(page.url()).toContain('/test/fixtures/session-recovery.html');
});
