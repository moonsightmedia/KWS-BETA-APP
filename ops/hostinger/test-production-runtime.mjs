import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {createClient}=createRequire('/app/package.json')('@supabase/supabase-js');
const config=JSON.parse(readFileSync(0,'utf8'));
assert.equal(config.database,'postgres');assert.equal(config.publicWrites,false);
const origin='http://127.0.0.1:9082';
const checks=[],accounts=[],notifications=[];
function check(name,condition){checks.push({check:name,passed:Boolean(condition)});console.log(JSON.stringify(checks.at(-1)));assert(condition,name);}
async function api(path,token=config.anon,body,method=body===undefined?'GET':'POST',extra={}) {
 const response=await fetch(origin+path,{method,headers:{apikey:config.anon,Authorization:'Bearer '+token,'content-type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{data=raw}
 return {status:response.status,data};
}
async function account(role){
 const email='migration-cutover-'+role+'-'+randomUUID()+'@example.invalid';const password=randomBytes(32).toString('base64url');
 const created=await api('/auth/v1/admin/users',config.service,{email,password,email_confirm:true,user_metadata:{full_name:'KWS private cutover check'}});
 assert(created.status===200&&created.data.id,'Synthetic account creation');
 const item={id:created.data.id,role};accounts.push(item);
 const assigned=role==='user'?{status:201}:await api('/rest/v1/user_roles',config.service,{user_id:item.id,role});
 check('assign_'+role,assigned.status===201);
 const login=await api('/auth/v1/token?grant_type=password',config.anon,{email,password});
 check('password_login_'+role,login.status===200&&login.data.user.id===item.id);item.token=login.data.access_token;item.refresh=login.data.refresh_token;return item;
}
let client,channel,timer;
try {
 const user=await account('user'),setter=await account('setter'),admin=await account('admin');
 let result=await api('/auth/v1/user',user.token);check('authenticated_user',result.status===200&&result.data.id===user.id);
 result=await api('/auth/v1/token?grant_type=refresh_token',config.anon,{refresh_token:user.refresh});check('session_refresh',result.status===200&&result.data.user.id===user.id);user.token=result.data.access_token;
 result=await api('/auth/v1/admin/users',config.anon);check('guest_cannot_list_accounts',[401,403].includes(result.status));
 result=await api('/rest/v1/boulders?select=id');check('public_boulder_count_preserved',result.status===200&&result.data.length===config.boulders);
 result=await api('/rest/v1/sectors?select=id');check('public_sector_count_preserved',result.status===200&&result.data.length===config.sectors);
 result=await api('/rest/v1/profiles?select=id');check('guest_cannot_read_profiles',result.status===200&&result.data.length===0);
 result=await api('/rest/v1/profiles?select=id&id=eq.'+user.id,user.token);check('own_profile_visible',result.status===200&&result.data.length===1);
 result=await api('/rest/v1/profiles?select=id,email,birth_date&id=eq.'+admin.id,user.token);check('other_private_profile_hidden',result.status===200&&result.data.length===0);
 result=await api('/rest/v1/rpc/get_community_display_names',user.token,{p_user_ids:[admin.id]});check('community_names_without_private_fields',result.status===200&&result.data.length===1&&Object.keys(result.data[0]).sort().join(',')==='full_name,id');
 for(const item of [user,setter]){
  result=await api('/rest/v1/user_roles',item.token,{user_id:item.id,role:'admin'});check(item.role+'_cannot_promote_self',[401,403].includes(result.status));
  result=await api('/rest/v1/colors',item.token,{name:'Denied cutover test '+randomUUID(),hex:'#101010'});check(item.role+'_cannot_create_admin_color',[401,403].includes(result.status));
 }
 const device='private-cutover-probe-'+randomUUID();
 result=await api('/rest/v1/push_tokens',config.service,{user_id:user.id,token:device,platform:'android'});check('private_push_fixture',result.status===201);
 result=await api('/rest/v1/notification_preferences?user_id=eq.'+user.id,config.service,{push_enabled:false},'PATCH');check('private_push_delivery_disabled',[200,204].includes(result.status));
 const body={tokens:[{token:device,platform:'android'}],payload:{title:'Private runtime test',body:'Delivery disabled',action_url:'/'}};
 for(const [label,token,status] of [['guest',config.anon,401],['forged','invalid-cutover-token',401],['foreign-owner',setter.token,403]]){
  result=await api('/functions/v1/send-push-notification',token,body);check('push_'+label+'_denied',result.status===status);
 }
 for(const [label,token] of [['owner',user.token],['internal-service',config.service]]){
  result=await api('/functions/v1/send-push-notification',token,body);check('push_'+label+'_respects_disabled_delivery',result.status===200&&result.data.success===false&&result.data.results[0].error==='PUSH_DISABLED');
 }
 result=await api('/functions/v1/nonexistent');check('unknown_function_hidden',result.status===404);
 result=await api('/realtime/v1/api/tenants');check('realtime_admin_hidden',result.status===404);
 const health=await fetch('http://127.0.0.1:9085/health').then(r=>r.json());check('video_queue_idle',health.ok&&health.queue===0);
 for(const [item,status] of [[user,403],[setter,404]]){
  const response=await fetch('http://127.0.0.1:9085/upload-status.php?session_id=migration-nonexistent',{headers:{Authorization:'Bearer '+item.token}});check('video_role_'+item.role,response.status===status);
 }
 client=createClient(origin,config.anon,{auth:{persistSession:false,autoRefreshToken:false},realtime:{transport:WebSocket}});
 await client.realtime.setAuth(user.token);const received=[];
 let resolveReady,rejectReady;const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject});
 timer=setTimeout(()=>rejectReady(new Error('Realtime subscription timeout')),35000);
 channel=client.channel('private-cutover-'+randomUUID()).on('system',{event:'*'},payload=>{if(payload.status==='ok'&&payload.extension==='postgres_changes'){clearTimeout(timer);resolveReady()}})
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},event=>received.push(event.new.id))
 .subscribe(status=>{if(status==='CHANNEL_ERROR'){clearTimeout(timer);rejectReady(new Error('Realtime channel failed'))}});
 await ready;check('authenticated_realtime_subscription',true);
 for(const item of [user,setter]){
  const id=randomUUID();notifications.push(id);result=await api('/rest/v1/notifications',config.service,{id,user_id:item.id,title:'Private cutover check',message:'Realtime verification',type:'admin_announcement'});check('insert_realtime_'+item.role,result.status===201);
 }
 const deadline=Date.now()+15000;while(!received.includes(notifications[0])&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,100));
 await new Promise(resolve=>setTimeout(resolve,1500));check('realtime_receives_own_notification',received.includes(notifications[0]));check('realtime_hides_other_notification',!received.includes(notifications[1]));
} finally {
 clearTimeout(timer);if(client&&channel)await client.removeChannel(channel);client?.realtime.disconnect();
 for(const id of notifications){const result=await api('/rest/v1/notifications?id=eq.'+id,config.service,undefined,'DELETE');assert([200,204].includes(result.status),'Synthetic notification cleanup')}
 for(const item of [...accounts].reverse()){const result=await api('/auth/v1/admin/users/'+item.id,config.service,undefined,'DELETE');assert([200,204].includes(result.status),'Synthetic account cleanup')}
}
const users=await api('/auth/v1/admin/users?page=1&per_page=100',config.service);check('original_user_count_after_cleanup',users.status===200&&users.data.users.length===config.users);
console.log(JSON.stringify({production_runtime_verified:true,passed:checks.length,test_accounts_removed:true,emails_sent:0,pushes_sent:0,public_routes_enabled:false}));
