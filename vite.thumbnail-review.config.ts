import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Explicit operator profile. No user/role stubs; online writes require real login.
if (process.env.THUMBNAIL_ENV_FILE) dotenv.config({path:process.env.THUMBNAIL_ENV_FILE});
export default defineConfig({
  plugins:[react(),{
    name:'local-thumbnail-catalog',
    configureServer(server){
      server.middlewares.use('/__thumbnail-data/',(req,res)=>{
        const relative=decodeURIComponent((req.url||'').split('?')[0]).replace(/^\//,'');
        if(!/^(inventory\.json|photos\/[a-f0-9]{64}\.jpg|results\/[a-f0-9]{64}\.json)$/.test(relative)||req.method!=='GET'){res.statusCode=404;res.end();return;}
        const file=path.resolve(__dirname,'.thumbnail-data',relative);
        if(!fs.existsSync(file)){res.statusCode=404;res.end();return;}
        res.setHeader('Content-Type',file.endsWith('.jpg')?'image/jpeg':'application/json; charset=utf-8');
        res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
        fs.createReadStream(file).pipe(res);
      });
    },
  }],
  resolve:{alias:{'@':path.resolve(__dirname,'src')},dedupe:['react','react-dom']},
  define:{
    'import.meta.env.VITE_TELEMETRY_ENABLED':JSON.stringify('false'),
    'import.meta.env.VITE_SENTRY_ENABLED':JSON.stringify('false'),
    'import.meta.env.VITE_SENTRY_DSN':JSON.stringify(''),
    'import.meta.env.VITE_MONITORING_ENABLED':JSON.stringify('false'),
    'import.meta.env.VITE_THUMBNAIL_FOCUS':JSON.stringify('true'),
    'import.meta.env.VITE_THUMBNAIL_API_PATH':JSON.stringify('/__thumbnail-service'),
    'import.meta.env.VITE_THUMBNAIL_LOCAL_CATALOG':JSON.stringify('true'),
  },
  server:{host:'127.0.0.1',port:5228,strictPort:true,proxy:{
    '/__thumbnail-service':{target:'http://127.0.0.1:5227',changeOrigin:true,rewrite:p=>p.replace('/__thumbnail-service',''),configure(proxy){proxy.on('proxyReq',request=>request.removeHeader('origin'));}},
  }},
  build:{outDir:'.thumbnail-data/build'},
});
