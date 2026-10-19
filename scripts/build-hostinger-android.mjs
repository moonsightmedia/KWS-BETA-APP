// Native build with public anon configuration only; never prints client key.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const site='https://beta.kletterwelt-sauerland.de';
const html=await (await fetch(site,{signal:AbortSignal.timeout(20000)})).text();
const entry=html.match(/src="([^"]*\/assets\/index-[^"]+\.js)"/)?.[1];
assert(entry,'Public bundle missing');
const bundle=await (await fetch(new URL(entry,site),{signal:AbortSignal.timeout(20000)})).text();
const key=(bundle.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)??[]).find(value=>{
  try{return JSON.parse(Buffer.from(value.split('.')[1],'base64url')).role==='anon';}catch{return false;}
});
assert(key,'Public anon configuration missing');
if(process.env.KWS_STORE_REVIEW_ENABLED==='true') {
  const reviewKey=process.env.KWS_STORE_REVIEW_ANON_KEY || '';
  let reviewRole;
  try { reviewRole=JSON.parse(Buffer.from(reviewKey.split('.')[1],'base64url')).role; } catch { /* Reject below. */ }
  assert(reviewRole==='anon' && reviewKey!==key,'Separate public review configuration required; privileged keys are forbidden');
}
const env={...process.env,VITE_SUPABASE_URL:'https://beta-api.kletterwelt-sauerland.de',
  VITE_STORE_REVIEW_ENABLED:process.env.KWS_STORE_REVIEW_ENABLED==='true'?'true':'false',
  VITE_STORE_REVIEW_ANON_KEY:process.env.KWS_STORE_REVIEW_ANON_KEY || '',
  VITE_SUPABASE_PUBLISHABLE_KEY:key,VITE_VIDEO_API_URL:'https://video.kletterwelt-sauerland.de',
  VITE_NATIVE_VIDEO_API_URL:'https://video.kletterwelt-sauerland.de',
  VITE_ALLINKL_API_URL:'https://video.kletterwelt-sauerland.de',
  VITE_AUTH_SITE_URL:site,VITE_USE_ALLINKL_STORAGE:'false',VITE_TELEMETRY_ENABLED:'false',
  VITE_MONITORING_ENABLED:process.env.KWS_MONITORING_ENABLED==='true'?'true':'false',
  VITE_MONITORING_CHANNEL:process.env.KWS_NATIVE_RELEASE_CHANNEL || 'apk',
  VITE_RELEASE_REVISION:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),
  VITE_SENTRY_DSN:process.env.KWS_MONITORING_ENABLED==='true'?(process.env.KWS_SENTRY_DSN||''):'',
  VITE_TRAINING_UI_PREVIEW:'false'};
const run=(args)=>new Promise((res,rej)=>{
  const child=spawn(process.execPath,args,{cwd:root,env,stdio:'inherit',windowsHide:true});
  child.on('error',rej);child.on('exit',code=>code===0?res():rej(new Error(`Build step failed (${code})`)));
});
await run(['node_modules/vite/bin/vite.js','build','--mode','hostinger','--base=./']);
await run(['node_modules/@capacitor/cli/bin/capacitor','sync','android']);
console.log('Hostinger native assets synced; Gradle build remains a separate explicit step.');
