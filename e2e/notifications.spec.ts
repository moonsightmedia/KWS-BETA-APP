import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const output = 'test-results/notifications-20260915';
const owner = '11111111-1111-4111-8111-111111111111';
const phase = process.env.KWS_NOTIFICATIONS_PHASE || 'after';
test.use({ trace: 'off', video: 'off' });
const preferences = { user_id: owner, in_app_enabled: true, push_enabled: false, boulder_new: true, competition_update: true, feedback_reply: true, admin_announcement: true, schedule_reminder: true, updated_at: '2026-09-15T09:00:00Z' };
function records() {
  return Array.from({ length: 67 }, (_, i) => ({ id: `22222222-2222-4222-8222-${String(999999999999-i).padStart(12,'0')}`, user_id: owner,
    type: ['boulder_new','schedule_reminder','feedback_reply','admin_announcement'][i%4],
    title: ['12 neue Boulder warten auf dich','Morgen wird im Bug geschraubt','Eine Antwort auf dein Feedback','Neuigkeiten aus der Halle'][i%4],
    message: ['Von der leichten Platte bis zur nächsten Herausforderung: Entdecke die neuen Linien in Bug und Grotte.', 'Deine Projekte im Bug sind noch bis heute Abend an der Wand.', 'Danke für deinen Hinweis! Wir haben die fehlende Zuordnung geprüft und angepasst.', 'Am Samstag öffnet die Halle ab 10 Uhr. Alle weiteren Informationen findest du hier.'][i%4],
    read: i%3===0, read_at: null, data: {}, created_at: new Date(Date.UTC(2026,8,15,10)-i*3600000).toISOString(), action_url: i%4===0?'/boulders?show=new':null,
  }));
}
async function open(page: Page, extra = '') {
  const rows = records(); let prefs = {...preferences};
  const state = { failRead: extra.includes('error'), failWrite: extra.includes('writeFail'), missingPreferences: extra.includes('missingPreferences') };
  const requests: Array<{ method: string; path: string; body: Record<string, unknown> | null }> = [];
  await page.clock.setFixedTime(new Date('2026-09-15T12:00:00Z'));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  const auth = `export const useAuth=()=>({user:{id:'${owner}',email:'alex@example.invalid',user_metadata:{first_name:'Alex'}},session:{access_token:'isolated-test-token',user:{id:'${owner}'}},loading:false});export const useIsAdmin=()=>({isAdmin:false,loading:false});export const useHasRole=()=>({hasRole:false,loading:false});`;
  for(const hook of ['useAuth','useIsAdmin','useHasRole']) await page.route(`**/src/hooks/${hook}.ts*`,r=>r.fulfill({contentType:'application/javascript',body:auth}));
  await page.route('**/src/integrations/supabase/client.ts*',r=>r.fulfill({contentType:'application/javascript',body:`const c={on(_type,_filter,cb){window.__notificationEmit=cb;return c},subscribe(){return c}};export const supabase={channel(){return c},removeChannel(){},auth:{getSession:async()=>({data:{session:{access_token:'isolated-test-token',user:{id:'${owner}'}}},error:null})}};`}));
  await page.route('**/rest/v1/**',async r=>{
    const url=new URL(r.request().url());const q=url.searchParams;const method=r.request().method();
    requests.push({ method, path: url.pathname + url.search, body: method === 'POST' || method === 'PATCH' ? r.request().postDataJSON() : null });
    if(state.failRead&&method==='GET') return r.fulfill({status:503,json:{message:'isolated failure'}});
    if(url.pathname.endsWith('notification_preferences')) {
      if(method==='POST'||method==='PATCH'){ if(state.failWrite)return r.fulfill({status:403,json:{}});prefs={...prefs,...r.request().postDataJSON()}; state.missingPreferences = false; }
      return r.fulfill({json:state.missingPreferences ? [] : [prefs]});
    }
    if(url.pathname.endsWith('get_unread_count'))return r.fulfill({json:rows.filter(n=>!n.read).length});
    let selected=rows.filter(n=>(q.get('user_id') === 'eq.' + n.user_id)&&(!q.get('read')||n.read===(q.get('read')==='eq.true'))&&(!q.get('type')||(q.get('type')!.startsWith('in.') ? q.get('type')!.slice(4,-1).split(',').includes(n.type) : n.type===q.get('type')!.slice(3)))&&(!q.get('id')||n.id===q.get('id')!.slice(3)));
    if(q.get('created_at')?.startsWith('lte.')) selected = selected.filter(n => n.created_at <= q.get('created_at')!.slice(4));
    if(q.get('or')) { const cursor=q.get('or')!.match(/created_at.lt.([^,]+)/)?.[1]; const id=q.get('or')!.match(/id.lt.([^)]*)/)?.[1];if(cursor)selected=selected.filter(n=>n.created_at<cursor || (n.created_at === cursor && n.id < (id || ''))); }
    if(extra.includes('empty'))selected=[];
    if(method==='PATCH'){ if(state.failWrite)return r.fulfill({status:403,json:{}});selected.forEach(n=>Object.assign(n,r.request().postDataJSON())); }
    return r.fulfill({headers:{'content-range':`0-0/${selected.length}`,'access-control-expose-headers':'content-range'},json:selected.slice(0,Number(q.get('limit')||1000))});
  });
  await page.goto('/test/fixtures/notifications.html?'+extra);
  await page.evaluate(()=>document.fonts.ready);await mkdir(output,{recursive:true});
  return {rows, state, requests, getPreferences: () => prefs};
}
for(const width of [375,768,1280,1920])test(`visual notifications ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});await open(page);
  await page.getByRole('button',{name:'Benachrichtigungen',exact:true}).click();
  await expect(page.getByText('12 neue Boulder warten auf dich').first()).toBeVisible();
  await expect(page.getByText('44 ungelesen',{exact:true}).last()).toBeVisible();
  await page.screenshot({path:`${output}/${phase}-inbox-${width}.png`,fullPage:true,animations:'disabled'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  await open(page,'route=/profile/notifications');
  await expect(page.getByRole('switch').first()).toBeVisible();
  await page.screenshot({path:`${output}/${phase}-settings-${width}.png`,fullPage:true,animations:'disabled'});
});

async function inbox(page: Page) {
  await page.getByRole('button',{name:'Benachrichtigungen',exact:true}).click();
  await expect(page.locator('article[data-notification-id]').first()).toBeVisible();
}
test('opening is read-only and all 67 messages can be paged, including tied timestamps', async ({page}) => {
  const ctx = await open(page); ctx.rows[30].created_at = ctx.rows[29].created_at;
  await inbox(page);
  await expect(page.locator('article[data-notification-id]')).toHaveCount(30);
  const more = page.getByRole('button',{name:'Ältere Mitteilungen laden'});
  await more.click(); await expect(page.locator('article[data-notification-id]')).toHaveCount(60);
  await more.click(); await expect(page.locator('article[data-notification-id]')).toHaveCount(67);
  await more.click(); await expect(more).toHaveCount(0);
  expect(ctx.requests.filter(r => r.method !== 'GET')).toHaveLength(0);
});
test('unread and topic filters apply on the server; empty filters remain usable', async ({page}) => {
  const ctx = await open(page); await inbox(page);
  await page.getByRole('button',{name:'Ungelesen',exact:true}).click();
  await expect(page.locator('article[data-notification-id]')).toHaveCount(30);
  await page.getByRole('combobox',{name:'Thema auswählen'}).click();
  await page.getByRole('option',{name:'Feedback',exact:true}).click();
  const matching = ctx.rows.filter(n=>!n.read && n.type === 'feedback_reply');
  await expect(page.locator('article[data-notification-id]')).toHaveCount(matching.length);
  await page.getByRole('combobox',{name:'Thema auswählen'}).click();
  await page.getByRole('option',{name:'Wettkämpfe',exact:true}).click();
  await expect(page.getByText('Zu diesem Thema ist alles gelesen')).toBeVisible();
  await page.getByRole('button',{name:'Alle Mitteilungen anzeigen'}).click();
  await expect(page.locator('article[data-notification-id]')).toHaveCount(30);
});
test('failed individual read leaves counter unchanged; retry succeeds without reopening', async ({page}) => {
  const ctx = await open(page,'writeFail'); await inbox(page);
  const item = page.locator(`[data-notification-id="${ctx.rows[1].id}"]`);
  await item.getByRole('button',{name:/Als gelesen markieren:/}).click();
  await expect(item.getByRole('alert')).toContainText('nicht gespeichert');
  await expect(page.getByText('44 ungelesen',{exact:true}).last()).toBeVisible();
  expect(ctx.rows[1].read).toBe(false);
  ctx.state.failWrite = false;
  await item.getByRole('button',{name:/Als gelesen markieren:/}).click();
  await expect(page.getByText('43 ungelesen',{exact:true}).last()).toBeVisible();
  await expect(item.getByText('Gelesen',{exact:true})).toBeVisible();
});
test('mark all includes older pages but leaves future arrivals unread', async ({page}) => {
  const ctx = await open(page); await inbox(page);
  ctx.rows.push({...ctx.rows[1], id:'future-message', created_at:'2026-09-15T12:00:01.000Z'});
  await page.getByRole('button',{name:'Alle als gelesen markieren'}).click();
  await expect(page.getByText('Alle bisherigen Mitteilungen sind gelesen.')).toBeVisible();
  await expect(page.getByText('1 ungelesen',{exact:true}).last()).toBeVisible();
  expect(ctx.rows.filter(n=>!n.read).map(n=>n.id)).toEqual(['future-message']);
  const write = ctx.requests.find(r=>r.method==='PATCH');
  expect(write?.path).toContain('created_at=lte.');
  expect(write?.path).toContain('user_id=eq.'+owner);
});
test('read errors are not an empty inbox or a false zero and can be retried', async ({page}) => {
  const ctx = await open(page,'error');
  await page.getByRole('button',{name:'Benachrichtigungen',exact:true}).click();
  await expect(page.getByText('Mitteilungen nicht verfügbar')).toBeVisible();
  await expect(page.getByRole('button',{name:'Alle als gelesen markieren'})).toBeDisabled();
  await expect(page.getByText('Noch keine Mitteilungen',{exact:true})).toHaveCount(0);
  await page.screenshot({path:`${output}/loop2-error-1280.png`,fullPage:true});
  ctx.state.failRead = false;
  await page.getByRole('button',{name:'Erneut versuchen'}).click();
  await expect(page.locator('article[data-notification-id]')).toHaveCount(30);
  await expect(page.getByText('44 ungelesen',{exact:true}).last()).toBeVisible();
});
test('preference failure preserves switches; confirmed master pause also disables push', async ({page}) => {
  const ctx = await open(page,'route=/profile/notifications&writeFail');
  const control = page.getByRole('switch',{name:'Neue Boulder',exact:true});
  await expect(control).toBeChecked(); await control.click();
  await expect(page.getByRole('alert')).toBeVisible(); await expect(control).toBeChecked();
  ctx.state.failWrite = false; await control.click(); await expect(control).not.toBeChecked();
  await page.getByRole('switch',{name:'Mitteilungen empfangen',exact:true}).click();
  await expect(page.getByText('Mitteilungen sind pausiert. Deine Themenauswahl bleibt gespeichert.')).toBeVisible();
  expect(ctx.getPreferences().in_app_enabled).toBe(false); expect(ctx.getPreferences().push_enabled).toBe(false);
  expect(ctx.getPreferences().boulder_new).toBe(false); expect(ctx.getPreferences().feedback_reply).toBe(true);
});
test('unavailable settings never display default-on controls', async ({page}) => {
  const ctx = await open(page,'route=/profile/notifications&error');
  await expect(page.getByText('Einstellungen nicht verfügbar')).toBeVisible();
  await expect(page.getByRole('switch')).toHaveCount(0); ctx.state.failRead = false;
  await page.getByRole('button',{name:'Erneut versuchen'}).click();
  await expect(page.getByRole('switch')).toHaveCount(6);
});
test('missing preferences require explicit setup; reading never silently opts in', async ({page}) => {
  const ctx = await open(page,'route=/profile/notifications&missingPreferences');
  await expect(page.getByRole('button',{name:'Mitteilungen einrichten'})).toBeVisible();
  await expect(page.getByRole('switch')).toHaveCount(0); expect(ctx.requests.filter(r=>r.method!=='GET')).toHaveLength(0);
  await page.getByRole('button',{name:'Mitteilungen einrichten'}).click();
  await expect(page.getByRole('switch')).toHaveCount(6);
  expect(ctx.getPreferences().push_enabled).toBe(false);
});
test('desktop hover previews without focus theft; click pins and Escape returns focus', async ({page}) => {
  await page.setViewportSize({width:1280,height:900}); await open(page);
  const link = page.getByRole('link',{name:'Mitteilungen einstellen'}); await link.focus();
  const bell = page.getByRole('button',{name:'Benachrichtigungen',exact:true}); await bell.hover();
  await expect(page.getByRole('dialog')).toBeVisible(); await expect(link).toBeFocused();
  await page.mouse.move(10,450); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(link).toBeFocused();
  await bell.hover(); await expect(page.getByRole('dialog')).toBeVisible(); await bell.click();
  await page.mouse.move(10,450); await page.waitForTimeout(450); await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('combobox',{name:'Thema auswählen'}).click(); await page.getByRole('option',{name:'Boulder',exact:true}).click();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(bell).toBeFocused();
});
test('mobile footer stays reachable while scrolling and close restores focus', async ({page}) => {
  await page.setViewportSize({width:375,height:740}); await open(page); await inbox(page);
  const dialog=page.getByRole('dialog'); const box=await dialog.boundingBox(); expect(box?.x).toBe(0); expect(box?.width).toBe(375); expect(Math.round((box?.y||0)+(box?.height||0))).toBe(740);
  const scroll = page.locator('[data-notification-scroll]'); await scroll.evaluate(el=>el.scrollTo({top:el.scrollHeight}));
  await expect(page.getByRole('button',{name:'Ältere Mitteilungen laden'})).toBeVisible(); await expect(page.getByRole('button',{name:'Einstellungen',exact:true})).toBeVisible();
  await page.screenshot({path:`${output}/loop2-scroll-375.png`,fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Benachrichtigungen schließen'}).click(); await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Benachrichtigungen',exact:true})).toBeFocused();
});
test('realtime refreshes updates and inserts once without sending another push', async ({page}) => {
  const ctx = await open(page); await inbox(page);
  const before = ctx.requests.length; ctx.rows[0].title = 'Aktualisierte Sammelmeldung';
  await page.evaluate(row => window['__notificationEmit']({eventType:'UPDATE',new:row}),ctx.rows[0]);
  await expect(page.getByText('Aktualisierte Sammelmeldung')).toBeVisible();
  const item = {...ctx.rows[1], id:'incoming-message', title:'Neue Testnachricht',created_at:'2026-09-15T11:00:00.000Z'}; ctx.rows.unshift(item);
  await page.evaluate(row => {window['__notificationEmit']({eventType:'INSERT',new:row});window['__notificationEmit']({eventType:'INSERT',new:row});},item);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(1);
  await expect(page.locator('[data-notification-id="incoming-message"]')).toHaveCount(1);
  expect(ctx.requests.slice(before).filter(r=>r.method!=='GET')).toHaveLength(0);
});
test('bulk read failure preserves unread state and can be retried', async ({page}) => {
  const ctx = await open(page,'writeFail'); await inbox(page);
  await page.getByRole('button',{name:'Alle als gelesen markieren'}).click();
  await expect(page.getByText('Nicht alle Änderungen wurden bestätigt. Bitte erneut versuchen.')).toBeVisible();
  await expect(page.getByText('44 ungelesen',{exact:true}).last()).toBeVisible();
  ctx.state.failWrite = false;
  await page.getByRole('button',{name:'Alle als gelesen markieren'}).click();
  await expect(page.getByText('0 ungelesen',{exact:true}).last()).toBeVisible();
  await page.getByRole('button',{name:'Ungelesen',exact:true}).click();
  await expect(page.getByText('Alles gelesen',{exact:true})).toBeVisible();
  await page.screenshot({path:`${output}/loop2-empty-1280.png`,fullPage:true,animations:'disabled'});
});
test('later page errors keep current messages and expose retry', async ({page}) => {
  const ctx = await open(page); await inbox(page); ctx.state.failRead = true;
  await page.getByRole('button',{name:'Ältere Mitteilungen laden'}).click();
  await expect(page.getByText('Ältere Mitteilungen konnten nicht geladen werden.')).toBeVisible();
  await expect(page.locator('article[data-notification-id]')).toHaveCount(30);
  ctx.state.failRead = false; await page.getByRole('button',{name:'Ältere Mitteilungen laden'}).click();
  await expect(page.locator('article[data-notification-id]')).toHaveCount(60);
});
test('opening a linked unread message confirms read and routes without document reload', async ({page}) => {
  const ctx = await open(page); await inbox(page);
  const originalUrl = page.url();
  await page.locator(`[data-notification-id="${ctx.rows[4].id}"]`).getByRole('button',{name:'Ansehen'}).click();
  await expect(page.getByTestId('route')).toHaveText('/boulders?show=new');
  expect(ctx.rows[4].read).toBe(true); expect(page.url()).toBe(originalUrl);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
