const params=new URLSearchParams(location.search);
let pending=true;let reports=true;let blocked=true;
export const useAuth=()=>({user:params.get('state')==='guest'?null:{id:'self-fixture'},session:{access_token:'test-only'}});
export const reportReasons=[['harassment','Beleidigung oder Belästigung'],['sexual','Sexueller Inhalt'],['violence','Gewalt oder gefährlicher Inhalt'],['rights','Verletzung von Rechten'],['other','Sonstiges']] as const;
function check(){if(params.get('state')==='error')throw new Error('Testfehler: Aktion nicht bestätigt.');}
export async function reportContent(){check();}
export async function blockUser(_target:string,value:boolean){check();blocked=value;}
export async function getBlockedUsers(){check();return blocked&&params.get('state')!=='empty'?[{blocked_id:'another-user-fixture'}]:[];}
export async function readDisplayProfiles(){return[{id:'another-user-fixture',full_name:'Testperson mit einem besonders langen Anzeigenamen'}];}
export async function getPendingComments(){check();return pending&&params.get('state')!=='empty'?[{id:'comment-fixture',boulder_id:'boulder-fixture',comment:'Ein hilfreicher Testkommentar, der zunächst privat auf eine Freigabe wartet.'}]:[];}
export async function getOpenReports(){check();return reports&&params.get('state')!=='empty'?[{id:'report-fixture',kind:'comment',target_id:'comment-fixture',subject_user_id:'another-user-fixture',reason:'harassment',content_text:'Ein gemeldeter Testkommentar.',boulder_id:'boulder-fixture',detail:'Isolierte Meldung: Bitte diesen Kommentar prüfen.'}]:[];}
export async function moderateContent(_kind:string,_target:string,action:string){check();if(action==='approve'||action==='reject')pending=false;if(action==='resolve')reports=false;}
export const Capacitor={getPlatform:()=>params.get('platform')||'ios',isNativePlatform:()=>params.get('platform')!=='web'};
export const isNativePushSupported=()=>Capacitor.getPlatform()==='android';
export const getPushDeviceId=()=> 'isolated-device';
export const getPushPermissionStatus=async()=> 'granted';
export const initializePushNotifications=async()=>true;
export const requestPermission=async()=>true;
export const unregisterPushOnDevice=async()=>{};
export const notificationRequest=async()=>({data:[{id:'fixture-device',platform:'android'}]});
export const defaultNotificationPreferences={in_app_enabled:true,push_enabled:false,boulder_new:true,competition_update:true,feedback_reply:true,admin_announcement:true,schedule_reminder:true};
export const useNotificationPreferences=()=>({data:{...defaultNotificationPreferences,updated_at:'2026-10-12T00:00:00Z'},isLoading:false,isError:false});
export const useUpdateNotificationPreferences=()=>({mutateAsync:async()=>{check();}});
