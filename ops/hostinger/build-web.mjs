import {spawnSync} from 'node:child_process';
import {cpSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const revision=process.argv[2];
if(process.argv.length!==3||!/^[a-f0-9]{40}$/.test(revision||''))throw Error('Usage: node ops/hostinger/build-web.mjs exact-git-revision');
process.env.VITE_RELEASE_REVISION=revision;
function run(args){const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});if(result.status!==0)throw Error('Build stopped: '+args[0]);}
// Same committed version and same production mode as the previous app-only build.
run(['node_modules/vite/bin/vite.js','build','--mode','hostinger']);
mkdirSync(join(root,'output'),{recursive:true});
const release=join(mkdtempSync(join(root,'output/web-release-')),'landing');
run(['ops/hostinger/landingpage/build.mjs',release]);
run(['ops/hostinger/landingpage/verify-bundle.mjs',release]);
const manifest=JSON.parse(readFileSync(join(release,'manifest.json'),'utf8'));
const destination=resolve(root,'dist/landing');
cpSync(join(release,'public/landing'),destination,{recursive:true});
const {schema,release:landingRelease,canonical,routesSha256,files}=manifest;
writeFileSync(join(destination,'release.json'),JSON.stringify({schema,revision,release:landingRelease,canonical,routesSha256,files},null,2)+'\n');
writeFileSync(join(root,'dist/release.json'),JSON.stringify({revision,landing_release:manifest.release})+'\n');
console.log(JSON.stringify({revision,landing_release:manifest.release,files:manifest.files.length,combined:true}));
