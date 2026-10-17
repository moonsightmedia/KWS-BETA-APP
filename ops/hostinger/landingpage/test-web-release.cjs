// Exercise the built files through the same pinned Caddy and reviewed routes as production.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {chromium,request}=require('playwright');
const root=path.resolve(__dirname,'../../..'),revision=process.argv[2],port=Number(process.env.LANDING_QA_PORT||4192);
assert(/^[a-f0-9]{40}$/.test(revision||''));
const output=path.join(root,'test-results/playwright-artifacts/landing-release');fs.mkdirSync(output,{recursive:true});
const caddy=path.join(output,'Caddyfile');
fs.writeFileSync(caddy,`{\nadmin off\n}\nhttp://:80 {\n${fs.readFileSync(path.join(__dirname,'routes.caddy'),'utf8')}\nhandle {\nroot * /web\nheader X-Robots-Tag "noindex, follow"\ntry_files {path} /index.html\nfile_server\n}\n}\n`);
const name='kws-ci-landing-'+process.pid;
function docker(args){const p=spawnSync('docker',args,{encoding:'utf8'});if(p.status!==0)throw Error(p.stderr||'Docker failed');return p.stdout;}
async function main(){let running=false,browser,api;const results=[];try{
 docker(['run','-d','--name',name,'--read-only','--cap-drop=ALL','--cap-add=NET_BIND_SERVICE','--security-opt=no-new-privileges:true','--tmpfs','/data:size=16m','--tmpfs','/config:size=16m','--tmpfs','/metrics:size=16m','-p',`127.0.0.1:${port}:80`,'-v',`${caddy}:/etc/caddy/Caddyfile:ro`,'-v',`${path.join(root,'dist')}:/web:ro`,'-v',`${path.join(root,'dist/landing')}:/landing:ro`,'caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f']);running=true;
 const base=`http://127.0.0.1:${port}`;api=await request.newContext();
 for(let i=0;i<30;i++){try{if((await api.get(base+'/landingpage')).status()===200)break;}catch{}if(i===29)throw Error('Caddy did not become ready');await new Promise(r=>setTimeout(r,200));}
 const app=await(await api.get(base+'/release.json')).json(),landing=await(await api.get(base+'/landing/release.json')).json();assert.equal(app.revision,revision);assert.equal(landing.revision,revision);assert.equal(app.landing_release,landing.release);
 for(const alias of ['/landing','/landing/','/landing/index.html','/landingpage/']){const r=await api.get(base+alias+'?qa=ci',{maxRedirects:0});assert.equal(r.status(),308);assert.equal(r.headers().location,'/landingpage?qa=ci');}
 assert.equal((await api.get(base+'/landing/missing-qa-asset.png')).status(),404);
 for(const p of ['/robots.txt','/sitemap.xml','/googlef8c88b5192841789.html','/favicon.ico'])assert.equal((await api.get(base+p)).status(),200);
 browser=await chromium.launch();
 for(const width of [375,768,1280,1920]){
  const context=await browser.newContext({viewport:{width,height:930},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],urls=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>urls.push(r.url()));page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  for(const p of ['/landingpage','/imprint','/privacy','/community-rules']){
   const response=await page.goto(base+p,{waitUntil:'networkidle'});assert.equal(response.status(),200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,p+' '+width);
   assert(!/lovable|Beta Dashboard/i.test(await page.locator('head').innerHTML()));
   if(p==='/landingpage'){
    assert(!response.headers()['x-robots-tag']);assert.equal(await page.locator('.store-button').count(),2);
    assert(await page.locator('.store-button').evaluateAll(es=>es.every(e=>e.disabled||/^https:\/\/(apps\.apple\.com|play\.google\.com)\//.test(e.href||''))));
    for(const topic of ['climbing','kids','training']){await page.locator(`.upcoming-art[data-upcoming="${topic}"]`).click();assert.equal(await page.locator('.upcoming-gallery-stage').getAttribute('data-active'),topic);}
    await page.locator('[data-partner="kws"]').click();assert.equal(await page.locator('.collaboration-map').getAttribute('data-selected'),'kws');await page.locator('.partner-toggle').click();assert.equal(await page.locator('.collaboration-map').getAttribute('data-selected'),'moonsight');
   }else{assert.equal(response.headers()['x-robots-tag'],'noindex, follow');assert.equal(await page.locator('script').count(),0);}
   await page.screenshot({path:path.join(output,p.slice(1)+'-'+width+'.png')});results.push({width,page:p,overflow:false});
  }
  assert.deepEqual(errors,[]);assert(urls.every(url=>url.startsWith(base+'/')),'Unexpected third-party request');assert.deepEqual(await context.cookies(),[]);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);await context.close();
 }
 const marker='KWS-CI-PRIVATE-MARKER';await api.get(base+'/landingpage?private='+marker,{headers:{Cookie:marker,Referer:'https://example.org/'+marker,'User-Agent':marker}});
 const log=docker(['exec',name,'cat','/metrics/access.jsonl']);assert(!log.includes(marker));const allowed=new Set(['level','ts','logger','msg','status','page']);const records=log.trim().split('\n').map(JSON.parse);assert(records.length>0);assert(records.every(r=>Object.keys(r).every(k=>allowed.has(k))&&/^\d{4}-\d{2}-\d{2}T\d{2}:00Z$/.test(r.ts)));
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({revision,landingRelease:landing.release,counterPrivacy:true,results},null,2));console.log(JSON.stringify({revision,landingRelease:landing.release,pages:results.length,counterPrivacy:true}));
}finally{if(browser)await browser.close();if(api)await api.dispose();if(running)docker(['rm','-f',name]);}}
main().catch(e=>{console.error(e);process.exitCode=1;});
