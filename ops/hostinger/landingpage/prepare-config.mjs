import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const [input,output]=process.argv.slice(2);
if(!input||!output||process.argv.length!==4)throw Error('Usage: node prepare-config.mjs current-Caddyfile new-candidate');
if(existsSync(output))throw Error('Candidate exists; preserve it and use a new output path');
const source=readFileSync(input,'utf8').replaceAll('\r\n','\n');
if(source.includes('@landingAliases')||source.includes('handle /landingpage'))throw Error('Landing already configured; inspect instead of adding duplicate routes');
// Accept only the reviewed production SPA fallback. A changed config needs review.
const fallback=/\n([ \t]*)handle \{\s*\n[ \t]*root \* \/web\s*\n[ \t]*header Cache-Control no-store\s*\n[ \t]*try_files \{path\} \/index\.html/g;
const matches=[...source.matchAll(fallback)];
if(matches.length!==1)throw Error('Production fallback differs; review the current server configuration');
const at=matches[0].index;
const routes=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'routes.caddy'),'utf8').replace(/^\uFEFF/,'');
const candidate=source.slice(0,at)+'\n'+routes+source.slice(at);
writeFileSync(output,candidate);
writeFileSync(output+'.json',JSON.stringify({inputSha256:createHash('sha256').update(readFileSync(input)).digest('hex'),candidateSha256:createHash('sha256').update(candidate).digest('hex'),liveConfigChanged:false},null,2)+'\n');
console.log('Candidate written. Validate and compare with the current server before applying. No live files changed.');
