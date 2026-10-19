import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const root=path.resolve(__dirname,'..');
// Explicit local QA only: the real demo API, never production reads/writes.
export default defineConfig({root,plugins:[react()],server:{host:'127.0.0.1',port:4198,strictPort:true},
  resolve:{alias:[{find:'@/lib/backendConfig',replacement:path.join(root,'test/fixtures/store-review-backend.ts')},
    {find:'@',replacement:path.join(root,'src')}],dedupe:['react','react-dom']},
  define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('https://api.fixture.invalid'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('fixture-only-public'),
    'import.meta.env.VITE_TELEMETRY_ENABLED':'"false"','import.meta.env.VITE_MONITORING_ENABLED':'"false"',
    'import.meta.env.VITE_SENTRY_DSN':'""','import.meta.env.VITE_TRAINING_UI_PREVIEW':'"false"'},
});
