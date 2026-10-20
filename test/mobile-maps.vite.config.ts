import {defineConfig} from 'vite';
import path from 'node:path';
import base from './maps-feedback.vite.config';
import snapshot from './fixtures/hall-hierarchy-snapshot.json';
const repo=path.resolve(__dirname,'..');
// Isolated UI verification: recorded synthetic mutations, no production credentials.
export default defineConfig({
 ...base,
 cacheDir: 'node_modules/.vite-mobile-maps',
 plugins:[{name:'local-map-photo',configureServer(server){server.middlewares.use('/qa/rest/v1/hall_maps',(req,res)=>{
  if(req.method!=='GET'){res.statusCode=405;res.end();return;}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify([{...snapshot.map,image_url:'/src/assets/boulderkarte-original.png'}]));
 });}},...(base.plugins??[])],
 server:{host:'127.0.0.1',port:5234,strictPort:true},
 resolve:{...base.resolve,alias:[
  ...['hooks/useAuth','hooks/useColors','hooks/useSectors','hooks/useBoulders','hooks/useBoulderCommunity','hooks/useSectorSchedule','contexts/UploadContext'].map(name=>({find:`@/${name}`,replacement:path.join(repo,'test/fixtures/setter-hooks.ts')})),
  {find:'@/hooks/useHallMaps',replacement:path.join(repo,'test/fixtures/admin-hallmap-hooks.ts')},
  ...(base.resolve?.alias as Array<{find:string;replacement:string}>),
 ]},
 define:{...base.define,
  'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:5234/qa'),
  'import.meta.env.VITE_TELEMETRY_ENABLED':JSON.stringify('false'),
  'import.meta.env.VITE_SENTRY_ENABLED':JSON.stringify('false'),
  'import.meta.env.VITE_MONITORING_ENABLED':JSON.stringify('false'),
 },
 optimizeDeps:{entries:['test/fixtures/setter-desktop.html','test/fixtures/admin-hallmap.html','test/fixtures/maps-feedback.html']},
});
