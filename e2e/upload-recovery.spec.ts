import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test.use({trace:'off',video:'off',timezoneId:'Europe/Berlin'});
const owner='00000000-0000-4000-8000-000000000001';
const base={user_id:owner,file_type:'video',file_size:100,status:'uploading',progress:100,error:null,created_at:'2026-08-24T12:00:00Z',updated_at:'2026-08-24T12:00:00Z'};
const oldLogs=Array.from({length:11},(_,i)=>({...base,id:`log-${i}`,session_id:`job-${i}`,boulder_id:`boulder-${i}`,file_name:`IMG_${9210+i}.mov`}));
const readyBoulders=oldLogs.map(l=>({id:l.boulder_id,beta_video_upload_session_id:l.session_id,beta_video_status:'ready',beta_video_url:'https://fixture.invalid/video.mp4'}));
async function open(page:Page,scenario='ready') {
  const state={writes:0,reads:0,failed:scenario==='error',boulders:scenario==='mixed' ? [{id:'boulder-0'}, {...readyBoulders[1],beta_video_status:'processing'}, {...readyBoulders[2],beta_video_upload_session_id:'different-job'}] : readyBoulders};
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.route('**/src/hooks/useAuth.tsx*',r=>r.fulfill({contentType:'application/javascript',body:`const session={user:{id:'${owner}'},access_token:'fixture-only'};export const useAuth=()=>({session});`}));
  await page.route('**/src/lib/authenticatedFetch.ts*',r=>r.fulfill({contentType:'application/javascript',body:`export const authenticatedFetch=(input,init)=>fetch(input,init);export const getCurrentSession=async()=>({user:{id:'${owner}'},access_token:'fixture-only'});`}));
  await page.route('**/rest/v1/**',async r=>{
    const url=new URL(r.request().url());
    if(r.request().method()!=='GET'){state.writes++;await r.abort();return;}
    state.reads++;
    expect(r.request().headers().authorization).toBe('Bearer fixture-only');
    expect(r.request().headers().apikey).toBeTruthy();
    if(state.failed){await r.fulfill({status:503,json:{message:'fixture unavailable'}});return;}
    if(url.pathname.endsWith('upload_logs')) {
      expect(url.searchParams.get('user_id')).toBe(`eq.${owner}`);
      await r.fulfill({json:scenario==='mixed' ? oldLogs.slice(0,3).map((l,i)=>({...l,progress:i===0?40:100,error:i===0?'Originaler Netzwerkfehler':null})) : oldLogs});
    } else await r.fulfill({json:state.boulders});
  });
  await page.goto('/test/fixtures/upload-recovery.html');
  await expect(page.getByRole('button',{name:'Upload-Übersicht öffnen'})).toBeVisible();
  return state;
}
test('actual provider excludes all eleven exact ready sessions without writes or automatic uploads',async({page})=>{
  const state=await open(page);await page.getByRole('button',{name:'Upload-Übersicht öffnen'}).click();
  await expect(page.getByText('Keine offenen Uploads',{exact:true})).toBeVisible();
  await expect(page.getByText(/IMG_/)).toHaveCount(0);expect(state.writes).toBe(0);expect(state.reads).toBe(2);
});
test('load failure is not a successful empty queue, retry reconciles safely',async({page})=>{
  const state=await open(page,'error');await page.getByRole('button',{name:'Upload-Übersicht öffnen'}).click();
  await expect(page.getByRole('status')).toContainText('konnten nicht geprüft');
  await expect(page.getByText('Keine offenen Uploads',{exact:true})).toHaveCount(0);
  state.failed=false;await page.getByRole('button',{name:'Status erneut prüfen'}).click();
  await expect(page.getByText('Keine offenen Uploads',{exact:true})).toBeVisible();expect(state.writes).toBe(0);
});
test('reselecting a file rechecks server completion before any write',async({page})=>{
  const state=await open(page,'mixed');await page.getByRole('button',{name:'Upload-Übersicht öffnen'}).click();
  await expect(page.getByRole('button',{name:'Datei neu wählen'})).toHaveCount(1);
  state.boulders=readyBoulders;
  await page.locator('input[type=file]').setInputFiles({name:'IMG_9210.mov',mimeType:'video/quicktime',buffer:Buffer.alloc(100)});
  await expect(page.getByText(/Der Serverstatus hat sich geändert/)).toBeVisible();
  await expect(page.getByText('Keine offenen Uploads',{exact:true})).toBeVisible();expect(state.writes).toBe(0);
});
test('actual logger late progress PATCH is conditional and cannot reopen completed row',async({page})=>{
  await open(page);let databaseStatus='uploading';const calls:string[]=[];
  await page.route('**/rest/v1/upload_logs?session_id=eq.logger-fixture*',async r=>{
    const query=new URL(r.request().url()).searchParams;const body=r.request().postDataJSON();calls.push(query.get('status')||'');
    if(!query.has('status') || ['pending','compressing','uploading'].includes(databaseStatus)) databaseStatus=body.status;
    await r.fulfill({status:204});
  });
  await page.evaluate(async()=>{
    const {UploadLogger}=await import('/src/utils/uploadLogger.ts');const logger=new UploadLogger('logger-fixture','fixture-only');
    await logger.updateStatus('completed',100);await logger.updateProgress(100);
  });
  expect(databaseStatus).toBe('completed');expect(calls).toEqual(['','in.(pending,compressing,uploading)']);
});
for(const width of [375,768,1280,1920]) test(`two visual loops and recovery states at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const state=await open(page,'mixed');const trigger=page.getByRole('button',{name:'Upload-Übersicht öffnen'});
  await expect(trigger).toContainText('1 Status prüfen');await trigger.click();const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('Datei benötigt');await expect(dialog).toContainText('Verarbeitung auf dem Server');await expect(dialog).toContainText('Status prüfen');
  await expect(dialog).toContainText('24.8.2026');await expect(dialog).toContainText('Originaler Netzwerkfehler');
  await expect(dialog.getByRole('button',{name:'Datei neu wählen'})).toHaveCount(1);
  await expect(dialog.getByText(/100\s*%/)).toHaveCount(0);
  await expect(dialog.getByRole('button',{name:'Status erneut prüfen'})).toBeInViewport();
  const box=(await dialog.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.y+box.height).toBeLessThanOrEqual(901);
  if(width<768){expect(box.x).toBe(0);expect(box.width).toBe(width);expect(box.y+box.height).toBeCloseTo(900,0);}
  await mkdir('test-results/upload-recovery-20260915',{recursive:true});
  await page.screenshot({path:`test-results/upload-recovery-20260915/loop1-${width}.png`,animations:'disabled'});
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
  await trigger.press('Enter');await expect(dialog).toBeVisible();
  await dialog.getByRole('button',{name:'Status erneut prüfen'}).click();await expect(dialog.getByRole('button',{name:'Status erneut prüfen'})).toBeEnabled();
  await expect(dialog.getByRole('button',{name:'Datei neu wählen'})).toHaveCount(1);
  await page.screenshot({path:`test-results/upload-recovery-20260915/loop2-${width}.png`,animations:'disabled'});
  expect(state.writes).toBe(0);
});
