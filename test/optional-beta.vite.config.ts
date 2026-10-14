import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const repo = path.resolve(__dirname, '..');
// Explicit local-only QA mode; E2E routes mock network writes and account hooks.
export default defineConfig({root:repo,plugins:[react()],
  server:{host:'127.0.0.1',port:5183,strictPort:true},
  resolve:{alias:{'@':path.join(repo,'src')},dedupe:['react','react-dom']},
  define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:5183/qa'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('isolated-public-fixture-key'),
    'import.meta.env.VITE_TELEMETRY_ENABLED':JSON.stringify('false')},
  optimizeDeps:{entries:['test/fixtures/beta-placeholder.html','test/fixtures/setter-workspace.html']}
});
