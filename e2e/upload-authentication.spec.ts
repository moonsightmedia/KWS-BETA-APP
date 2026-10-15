import { test, expect, type Page } from '@playwright/test';
test.use({trace:'off',video:'off'});
const user = {id:'00000000-0000-4000-8000-000000000001',email:'setter@example.invalid',aud:'authenticated',role:'authenticated',user_metadata:{},app_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const version = (headers: Record<string,string>) => {
  const bearer = headers['x-upload-auth'] ?? headers.authorization;
  const claim = bearer?.split('.')[1];
  return claim ? JSON.parse(Buffer.from(claim,'base64').toString()).version : 0;
};
async function open(page: Page, invalidRefresh = false) {
  const state = {refreshes:0, expiredVersion:0, saves:0, jobs:0, rejectedSave:false, parts:new Set<number>(), thumbParts:0, resumes:0, sessionId:''};
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.route('**/src/integrations/supabase/client.ts*',r=>r.fulfill({contentType:'application/javascript',body:"export * from '/test/fixtures/session-sdk.ts';"}));
  for (const hook of ['usePreloadSectorImages','usePreloadBoulderThumbnails']) await page.route(`**/src/hooks/${hook}.ts*`,r=>r.fulfill({contentType:'application/javascript',body:`export const ${hook}=()=>{};`}));
  await page.route('**/src/utils/nativeVideoUpload.ts*',r=>r.fulfill({contentType:'application/javascript',body:"export const getVideoApiBase=()=> 'https://video.fixture.invalid'; export const prepareVideoFileForChunkedUpload=async file=>({kind:'file',file,compressed:false,cleanup:async()=>{}});"}));
  await page.route('**/src/integrations/supabase/storage.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const compressThumbnail=async file=>file;'}));
  await page.route('**/rest/v1/**',async r=>{
    const path=new URL(r.request().url()).pathname;
    if (r.request().method()==='GET') {
      if(path.endsWith('/profiles')) await r.fulfill({json:{id:user.id,email:user.email}});
      else if(path.endsWith('/user_roles')) await r.fulfill({json:[{user_id:user.id}]});
      else await r.fulfill({json:[]});
      return;
    }
    const tokenVersion=version(r.request().headers());
    if(path.endsWith('/boulders') && r.request().method()==='PATCH' && !state.rejectedSave) {state.rejectedSave=true;state.expiredVersion=Math.max(state.expiredVersion,tokenVersion);}
    if(tokenVersion<=state.expiredVersion) {await r.fulfill({status:401,json:{code:'PGRST303',message:'JWT expired'}});return;}
    if(path.endsWith('/boulders') && r.request().method()==='PATCH') state.saves++;
    await r.fulfill({json:path.includes('/rpc/')?true:[]});
  });
  await page.route('**/upload-status.php?**',async r=>{
    const tokenVersion=version(r.request().headers());
    if(tokenVersion<=state.expiredVersion) {await r.fulfill({status:401,json:{error:'Invalid or expired token'}});return;}
    const id=new URL(r.request().url()).searchParams.get('session_id');
    state.resumes++;
    await r.fulfill({json:{session_id:id,uploaded_chunks:id===state.sessionId?[...state.parts]:[]}});
  });
  await page.route('**/upload.php',async r=>{
    const headers=r.request().headers();
    const tokenVersion=version(headers);
    if(tokenVersion<=state.expiredVersion) {await r.fulfill({status:401,json:{error:'Invalid or expired token'}});return;}
    if(headers['x-file-type']==='image/jpeg') {state.thumbParts++;await r.fulfill({json:{url:'https://assets.fixture.invalid/fixture.jpg',urls:{}}});return;}
    const index=Number(headers['x-chunk-number']);
    if(state.sessionId) expect(headers['x-upload-session-id']).toBe(state.sessionId);
    state.sessionId=headers['x-upload-session-id'];
    expect(state.parts.has(index),'accepted chunk must not be transmitted twice').toBe(false);
    state.parts.add(index);
    if(index===0) {state.expiredVersion=Math.max(state.expiredVersion,tokenVersion);await r.fulfill({json:{}});}
    else {state.jobs++;await r.fulfill({json:{status:'queued',job_id:'fixture-job'}});}
  });
  await page.route('**/qa/supabase/auth/v1/**',async r=>{
    if(!r.request().url().includes('/token')) {await r.fulfill({json:user});return;}
    const password=new URL(r.request().url()).searchParams.get('grant_type')==='password';
    if(password) invalidRefresh=false;
    if(!password) state.refreshes++;
    if(invalidRefresh&&!password) {await r.fulfill({status:400,json:{code:'refresh_token_not_found',message:'Invalid Refresh Token: Refresh Token Not Found'}});return;}
    const nextVersion=Math.max(2,state.expiredVersion+1);
    const token=`fixture.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,version:nextVersion})).toString('base64')}.fake`;
    await r.fulfill({json:{access_token:token,refresh_token:'fixture-refresh-only',token_type:'bearer',expires_in:3600,user}});
  });
  await page.goto('/test/fixtures/upload-authentication.html');
  await expect(page.getByTestId('auth-state')).toHaveText('Angemeldet');
  return state;
}

test('actual UploadProvider and installed SDK recover mid-video and final thumbnail JWT expiry',async({page})=>{
  const state=await open(page);
  await page.getByRole('button',{name:'Test-Uploads starten'}).click();
  await expect(page.getByTestId('status-video')).toHaveText('completed');
  await expect(page.getByTestId('status-thumbnail')).toHaveText('completed');
  expect([...state.parts]).toEqual([0,1]);
  expect(state.jobs).toBe(1);expect(state.saves).toBe(1);expect(state.thumbParts).toBe(1);
  expect(state.refreshes).toBeGreaterThanOrEqual(1);expect(state.refreshes).toBeLessThanOrEqual(2);
  await expect(page.getByLabel('Entwurf')).toHaveValue('Nicht verlieren');
  await expect(page.getByRole('dialog',{name:'Bitte erneut anmelden',exact:true})).toHaveCount(0);
});

test('real reconnect keeps workspace and original video then resumes same session without duplicate parts',async({page})=>{
  const state=await open(page,true);
  await page.getByRole('button',{name:'Test-Uploads starten'}).click();
  await expect(page.getByRole('dialog',{name:'Bitte erneut anmelden',exact:true})).toBeVisible();
  await expect(page.getByTestId('status-video')).toHaveText('error');
  await expect(page.getByTestId('file-video')).toHaveText('Original erhalten');
  await expect(page.getByLabel('Entwurf')).toHaveValue('Nicht verlieren');
  const originalSession=state.sessionId;
  await page.getByLabel('Passwort',{exact:true}).fill('fixture-password-not-real');
  await page.getByRole('button',{name:'Erneut anmelden',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Bitte erneut anmelden',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Fortsetzen video',exact:true}).click();
  await expect(page.getByTestId('status-video')).toHaveText('completed');
  expect(state.sessionId).toBe(originalSession);expect([...state.parts]).toEqual([0,1]);expect(state.jobs).toBe(1);
  await expect(page.getByLabel('Entwurf')).toHaveValue('Nicht verlieren');
  expect(page.url()).toContain('/test/fixtures/upload-authentication.html');
});
