import{defineConfig}from'vite';
import react from'@vitejs/plugin-react-swc';
import path from'node:path';
const fixture=path.resolve('test/fixtures/thumbnail-policy-hooks.tsx');
export default defineConfig({
  cacheDir:'node_modules/.vite-thumbnail-policy',
  plugins:[{name:'isolated-thumbnail-policy',enforce:'pre',resolveId(source){
    if(source==='@capacitor/core'||/(?:@\/|\/src\/)(?:hooks\/(?:useAuth|useHasRole)|lib\/(?:authenticatedFetch|backendConfig)|utils\/(?:nativeVideoUpload|resumableUpload))(?:\.tsx?)?$/.test(source.replace(/\\/g,'/')))return fixture;
  },load(id){if(id.replace(/\\/g,'/').includes('/integrations/supabase/client.'))throw Error('Live backend is forbidden in thumbnail policy tests.');}},react()],
  define:{'import.meta.env.VITE_THUMBNAIL_FOCUS':JSON.stringify('true'),'import.meta.env.VITE_THUMBNAIL_API_PATH':JSON.stringify('/thumbnail-focus'),'import.meta.env.VITE_THUMBNAIL_LOCAL_CATALOG':JSON.stringify('false')},
  resolve:{alias:{'@':path.resolve('src')}},
  server:{host:'127.0.0.1',port:5248,strictPort:true,watch:{ignored:['**/output/**','**/test-results/**']}},
  optimizeDeps:{entries:['test/fixtures/thumbnail-policy.html']},
});
