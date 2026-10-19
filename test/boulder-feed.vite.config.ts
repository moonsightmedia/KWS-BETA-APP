import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

const fixtures = path.resolve('test/fixtures/boulder-feed-data.tsx');
export default defineConfig({
  plugins: [{ name: 'isolated-boulder-feed-test', enforce: 'pre', resolveId(source) {
    const normalized = source.replace(/\\/g, '/');
    if (/(?:@\/|\/src\/)hooks\/(useAuth|useBoulders|useSectors|useColors|useMonitoringFilters|useBoulderNotification)(?:\.tsx?)?$/.test(normalized)
      || /(?:@\/|\/src\/)components\/(ProfileMenu|ContentSafetyActions|boulder\/BoulderMapPanel)(?:\.tsx?)?$/.test(normalized)
      || /(?:@\/|\/src\/)(utils\/monitoring|lib\/backendConfig)(?:\.tsx?)?$/.test(normalized)) return fixtures;
  }, load(id) { if (/\/integrations\/supabase\/client\./.test(id.replace(/\\/g, '/'))) throw new Error('Live backend is forbidden in feed tests.'); } }, react()],
  resolve: { alias: { '@': path.resolve('src') } },
  server: { host: '127.0.0.1', port: 5217, strictPort: true, watch: { ignored: ['**/output/**'] } },
  optimizeDeps: { entries: ['test/fixtures/boulder-feed.html'] },
  build: { outDir: 'output/video-feed/integration-build', rollupOptions: { input: 'test/fixtures/boulder-feed.html' } },
});
