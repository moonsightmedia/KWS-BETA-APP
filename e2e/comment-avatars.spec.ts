import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const owner='11111111-1111-4111-8111-111111111111';
const peer='22222222-2222-4222-8222-222222222222';
const boulder='33333333-3333-4333-8333-333333333333';
const output='test-results/comment-avatars-20261014';
test.use({trace:'off',video:'off'});
async function open(page:Page, mode='photo') {
  const requests:Array<{path:string;body:unknown}>=[];
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.route('**/qa-comment-*.svg',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#36B531"/><circle cx="50" cy="35" r="18" fill="#192436"/><path d="M15 100a35 45 0 0170 0" fill="#192436"/></svg>'}));
  await page.route('**/src/hooks/useAuth.ts*',r=>r.fulfill({contentType:'application/javascript',body:`const user={id:'${owner}',email:'alex@example.invalid',user_metadata:{avatar_url:'/qa-comment-stale.svg'}};export const useAuth=()=>({user,session:{access_token:'fixture-only'},loading:false});`}));
  await page.route('**/src/components/ContentSafetyActions.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const ContentSafetyActions=()=>null;'}));
  await page.route('**/rest/v1/**',r=>{
    const path=new URL(r.request().url()).pathname;const body=r.request().method()==='POST'?r.request().postDataJSON():null;requests.push({path,body});
    if(path.endsWith('/profiles'))return r.fulfill({json:[{full_name:'Alex Berg',avatar_url:mode==='none'?null:mode==='broken'?'/missing-avatar.png':'/qa-comment-own.svg'}]});
    if(path.endsWith('/boulder_comments'))return r.fulfill({json:[
      {id:'own-comment',boulder_id:boulder,user_id:owner,comment:'Mein Kommentar',created_at:'2026-10-14T12:00:00Z',updated_at:'2026-10-14T12:00:00Z',edited:false,moderation_status:'pending'},
      {id:'peer-comment',boulder_id:boulder,user_id:peer,comment:'Ein anderer Kommentar',created_at:'2026-10-14T11:00:00Z',updated_at:'2026-10-14T11:00:00Z',edited:false,moderation_status:'approved'},
    ]});
    if(path.endsWith('/get_community_display_names'))return r.fulfill({json:[{id:owner,full_name:'Alex Berg'},{id:peer,full_name:'Bea Stein'}]});
    if(path.endsWith('/get_comment_author_avatars'))return mode==='failure'?r.fulfill({status:503,json:{}}):r.fulfill({json:[{id:owner,avatar_url:'/qa-comment-stale.svg'},{id:peer,avatar_url:mode==='photo'?'/qa-comment-peer.svg':null}]});
    return r.fulfill({json:[]});
  });
  await page.goto('/test/fixtures/comment-avatars.html');
  const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Kommentare (2)',exact:true})});
  await expect(section.getByText('Mein Kommentar',{exact:true})).toBeVisible();
  return {section,requests};
}
for(const width of [375,768,1280,1920])test('comment author and composer photos '+width,async({page})=>{
  await page.setViewportSize({width,height:1100});const {section,requests}=await open(page);
  await expect(section.locator('img[src="/qa-comment-own.svg"]')).toHaveCount(2);
  await expect(section.locator('img[src="/qa-comment-peer.svg"]')).toHaveCount(1);
  await expect(section.getByText('Wartet auf Freigabe durch Marketing')).toBeVisible();
  expect(requests.find(r=>r.path.endsWith('/get_comment_author_avatars'))?.body).toEqual({p_boulder_id:boulder,p_user_ids:[owner,peer]});
  await section.scrollIntoViewIfNeeded();await mkdir(output,{recursive:true});await page.screenshot({path:output+'/comments-'+width+'.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
});
test('saved own photo immediately updates comment and composer without refetching comments',async({page})=>{
  const {section,requests}=await open(page);await expect(section.locator('img[src="/qa-comment-own.svg"]')).toHaveCount(2);
  const reads=requests.filter(r=>r.path.endsWith('/boulder_comments')).length;
  await page.getByRole('button',{name:'Gespeichertes Foto aktualisieren'}).click();
  await expect(section.locator('img[src="/qa-comment-new.svg"]')).toHaveCount(2);
  expect(requests.filter(r=>r.path.endsWith('/boulder_comments'))).toHaveLength(reads);
});
for(const mode of ['none','broken','failure'])test('comment fallback keeps composer usable: '+mode,async({page})=>{
  const {section}=await open(page,mode);
  if(mode!=='failure') {await expect(section.locator('img')).toHaveCount(0);await expect(section.getByText('AB',{exact:true})).toHaveCount(2);}
  await section.getByRole('textbox',{name:'Kommentar schreiben',exact:true}).fill('Entwurf bleibt bedienbar');
  await expect(section.getByRole('button',{name:'Kommentar senden',exact:true})).toBeEnabled();
  await expect(section.getByText('Ein anderer Kommentar',{exact:true})).toBeVisible();
});
