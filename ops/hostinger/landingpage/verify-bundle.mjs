import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,join,relative,extname} from 'node:path';
import {createHash} from 'node:crypto';
const directory=resolve(process.argv[2]||'');
if(process.argv.length!==3)throw Error('Usage: node verify-bundle.mjs release-directory');
const manifest=JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8'));
if(manifest.schema!==1||manifest.canonical!=='https://beta.kletterwelt-sauerland.de/landingpage')throw Error('Invalid target');
const files=new Map(manifest.files.map(file=>[file.path,file]));
let count=0;
function check(dir){for(const entry of readdirSync(dir)){const file=join(dir,entry),stat=lstatSync(file);if(stat.isSymbolicLink())throw Error('Symlink in package');if(stat.isDirectory()){check(file);continue}const name=relative(directory,file).replaceAll('\\','/');if(!name.startsWith('public/landing/'))throw Error('File outside landing');const expected=files.get(name),bytes=readFileSync(file);if(!expected||bytes.length!==expected.bytes||createHash('sha256').update(bytes).digest('hex')!==expected.sha256)throw Error('Integrity mismatch '+name);count++;}}
check(join(directory,'public'));if(count!==files.size)throw Error('Missing files');
if(createHash('sha256').update(readFileSync(join(directory,'routes.caddy'))).digest('hex')!==manifest.routesSha256)throw Error('Route configuration mismatch');
for(const name of ['index.html','privacy.html','imprint.html','community-rules.html']){
const html=readFileSync(join(directory,'public/landing',name),'utf8');
if(name!=='index.html'&&(/<script\b/i.test(html)||!html.includes('content="noindex,follow"')))throw Error('Legal page must be static and noindex');
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
 const ref=match[1];if(ref.startsWith('#')||/^(https:\/\/|mailto:|tel:)/.test(ref)||['/privacy','/imprint','/community-rules'].includes(ref))continue;
 if(!ref.startsWith('/landing/'))throw Error('Noncanonical relative asset '+ref);
 const assetPath=new URL(ref,manifest.canonical).pathname;
 if(!files.has('public'+assetPath))throw Error('Unbundled asset '+ref);
}
}
const css=readFileSync(join(directory,'public/landing/landing.css'),'utf8');
for(const match of css.matchAll(/url\(['"]?([^)'" ]+)['"]?\)/g)){
 const ref=resolve(directory,'public/landing',match[1]);if(!ref.startsWith(join(directory,'public/landing')+'/')&&!ref.startsWith(join(directory,'public/landing')+'\\'))throw Error('External font');if(!existsSync(ref))throw Error('Missing font');
}
console.log(JSON.stringify({verified:true,release:manifest.release,files:count,canonical:manifest.canonical,storeLinks:manifest.storeLinks}));
