import {readFileSync,writeFileSync,readdirSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname,extname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const args=process.argv.slice(2);
if(args.length>1)throw Error('Usage: node ops/hostinger/landingpage/build.mjs [new-output-directory]');
const output=resolve(args[0]||join(root,'output/landing-release',new Date().toISOString().replace(/[:.]/g,'-')));
if(existsSync(output))throw Error('Use a new output directory; existing releases are preserved');
const source=join(root,'public/landing');const target=join(output,'public/landing');mkdirSync(target,{recursive:true});
for(const entry of readdirSync(source,{withFileTypes:true})){
 if(!entry.isFile()||!['.html','.css','.js','.svg','.webp','.png','.ico','.txt','.xml'].includes(extname(entry.name)))throw Error('Unexpected landing asset '+entry.name);
 copyFileSync(join(source,entry.name),join(target,entry.name));
}
let html=readFileSync(join(target,'index.html'),'utf8').replace(/((?:href|src)=")\.\//g,'$1/landing/');
const canonical='https://beta.kletterwelt-sauerland.de/landingpage';
if(!html.includes(`rel="canonical" href="${canonical}"`))throw Error('Missing canonical metadata');
writeFileSync(join(target,'index.html'),html);
let css=readFileSync(join(target,'landing.css'),'utf8');
css=css.replace(/\.\.\/fonts\/([\w.-]+)/g,(_,name)=>{
 mkdirSync(join(target,'fonts'),{recursive:true});copyFileSync(join(root,'public/fonts',name),join(target,'fonts',name));return './fonts/'+name;
});
copyFileSync(join(root,'public/fonts/poppins-LICENSE.txt'),join(target,'fonts/poppins-LICENSE.txt'));
writeFileSync(join(target,'landing.css'),css);
copyFileSync(join(root,'ops/hostinger/landingpage/routes.caddy'),join(output,'routes.caddy'));
const files=[];
function inventory(dir){for(const name of readdirSync(dir,{withFileTypes:true})){const path=join(dir,name.name);if(name.isDirectory())inventory(path);else files.push({path:relative(output,path).replaceAll('\\','/'),bytes:readFileSync(path).length,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})}}
inventory(join(output,'public'));
const routesSha256=createHash('sha256').update(readFileSync(join(output,'routes.caddy'))).digest('hex');
const release=createHash('sha256').update(JSON.stringify({files,routesSha256})).digest('hex').slice(0,16);
const manifest={schema:1,release,routesSha256,canonical,createdAt:new Date().toISOString(),storeLinks:/class="store-button"[^>]*disabled/.test(html)?'placeholders-by-user-request':'configured-review-required',logo:'current public/landing assets; confirm final brand approval before publishing',files};
writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({output,release,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),canonical}));
