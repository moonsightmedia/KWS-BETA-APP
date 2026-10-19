import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const repo = path.resolve(__dirname, '..');
const fixture = path.join(repo, 'test/fixtures/onboarding-hooks.ts');
export default defineConfig({
  root: repo,
  plugins: [react(), {
    name: 'isolated-onboarding-reads', enforce: 'pre',
    resolveId(source) {
      if (/(?:@\/|\/src\/)hooks\/(useAuth|useBoulders|useColors|useSectors|useHasRole|useIsAdmin)(?:\.tsx?)?$/.test(source.replace(/\\/g, '/'))) return fixture;
    },
  }],
  server: { host: '127.0.0.1', port: 5220, strictPort: true },
  cacheDir: 'node_modules/.vite-onboarding',
  resolve: { alias: { '@': path.join(repo, 'src') }, dedupe: ['react', 'react-dom'] },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:5220/qa'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('isolated-public-fixture-key'),
    'import.meta.env.VITE_TELEMETRY_ENABLED': JSON.stringify('false'),
    'import.meta.env.VITE_MONITORING_ENABLED': JSON.stringify('true'),
  },
  optimizeDeps: { entries: ['test/fixtures/onboarding.html'] },
});
