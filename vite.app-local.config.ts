import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Real index.html → main.tsx → App, real authentication, real isolated review
// API/media. No fixture aliases, role stubs or simulated upload/dialog entry.
const env = dotenv.parse(fs.readFileSync('output/app-inline/frontend.env'));
if (env.VITE_SUPABASE_URL !== 'https://beta-api.kletterwelt-sauerland.de' || !env.VITE_STORE_REVIEW_ANON_KEY) throw new Error('Verified public frontend configuration required.');
export default defineConfig({
  envDir:false, plugins:[react()],
  resolve:{alias:{'@':path.resolve('src')},dedupe:['react','react-dom']},
  define:{ ...Object.fromEntries(Object.entries(env).map(([key,value])=>[`import.meta.env.${key}`,JSON.stringify(value)])),
    'import.meta.env.VITE_LOCAL_REVIEW_ONLY':JSON.stringify('true'),
    'import.meta.env.VITE_THUMBNAIL_FOCUS':JSON.stringify('true'),
    'import.meta.env.VITE_THUMBNAIL_API_PATH':JSON.stringify('/thumbnail-focus'),
    ...Object.fromEntries(['VITE_SENTRY_ENABLED','VITE_MONITORING_ENABLED','VITE_TELEMETRY_ENABLED','VITE_TRAINING_UI_PREVIEW'].map(key=>[`import.meta.env.${key}`,JSON.stringify('false')])),
  },
  server:{host:'127.0.0.1',port:5343,strictPort:true,proxy:{
    '/thumbnail-focus':{target:'https://review-api.kletterwelt-sauerland.de',changeOrigin:true,secure:true,
      configure(proxy){proxy.on('proxyReq',request=>request.removeHeader('origin'));}},
  }},
  build:{outDir:'output/app-inline/build',copyPublicDir:false},
});
