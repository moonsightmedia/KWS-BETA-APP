import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import https from 'node:https';
const root=path.resolve(__dirname,'..');
// Explicit local QA only: the real demo API, never production reads/writes.
const proxy = (host: string, prefix: string) => ({
  target: `https://${host}`, changeOrigin: true, secure: true, ws: true,
  agent: new https.Agent({lookup: (_hostname, options, callback) => {
    callback(null, ...(options?.all ? [[{address:'187.7.70.230',family:4}]] : ['187.7.70.230',4]) as [any, any]);
  }}),
  rewrite: (requestPath: string) => requestPath.replace(prefix, ''),
  selfHandleResponse: true,
  configure: (server: any) => {
    server.on('proxyReq', (request: any) => request.removeHeader('accept-encoding'));
    server.on('proxyRes', (upstream: any, _request: any, response: any) => {
      const headers = {...upstream.headers}; delete headers['content-length'];
      if (String(headers['content-type']).includes('application/json')) {
        const chunks: Buffer[]=[]; upstream.on('data',(chunk: Buffer)=>chunks.push(chunk));
        upstream.on('end',()=>{
          const body=Buffer.concat(chunks).toString().replaceAll('https://review-api.kletterwelt-sauerland.de','http://127.0.0.1:4198/__review-api').replaceAll('https://review-video.kletterwelt-sauerland.de','http://127.0.0.1:4198/__review-video');
          response.writeHead(upstream.statusCode,headers);response.end(body);
        });
      } else {response.writeHead(upstream.statusCode,headers);upstream.pipe(response);}
    });
  },
});
export default defineConfig({root,plugins:[react()],server:{host:'127.0.0.1',port:4198,strictPort:true,
  proxy:{'/__review-api':proxy('review-api.kletterwelt-sauerland.de','/__review-api'),
    '/__review-video':proxy('review-video.kletterwelt-sauerland.de','/__review-video')}},
  resolve:{alias:[{find:'@/lib/backendConfig',replacement:path.join(root,'test/fixtures/store-review-backend.ts')},
    {find:'@',replacement:path.join(root,'src')}],dedupe:['react','react-dom']},
  define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('https://api.fixture.invalid'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('fixture-only-public'),
    'import.meta.env.VITE_TELEMETRY_ENABLED':'"false"','import.meta.env.VITE_MONITORING_ENABLED':'"false"',
    'import.meta.env.VITE_SENTRY_DSN':'""','import.meta.env.VITE_TRAINING_UI_PREVIEW':'"false"'},
});
