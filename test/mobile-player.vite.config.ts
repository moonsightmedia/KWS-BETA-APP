import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const fixture = path.resolve('test/fixtures/mobile-player-data.tsx');
export default defineConfig({
  cacheDir: 'node_modules/.vite-mobile-player',
  plugins: [{ name: 'isolated-mobile-player-test', enforce: 'pre', resolveId(source) {
    const normalized = source.replace(/\\/g, '/');
    if (/(?:@\/|\/src\/)hooks\/(useAuth|useBoulders|useColors|useBoulderCommunity)(?:\.tsx?)?$/.test(normalized)
      || /(?:@\/|\/src\/)components\/(ContentSafetyActions|AccountAvatar|Sidebar|DashboardHeader)(?:\.tsx?)?$/.test(normalized)
      || /(?:@\/|\/src\/)utils\/monitoring(?:\.tsx?)?$/.test(normalized)) return fixture;
  }, load(id) { if (/\/integrations\/supabase\/client\./.test(id.replace(/\\/g, '/'))) throw new Error('Live backend is forbidden in mobile-player tests.'); } }, react()],
  resolve: { alias: { '@': path.resolve('src') } },
  server: { host: '127.0.0.1', port: 5241, strictPort: true, watch: { ignored: ['**/output/**'] } },
  optimizeDeps: { entries: ['test/fixtures/mobile-player.html', 'test/fixtures/video-fullscreen.html'] },
  build: { outDir: 'output/mobile-player-integration/build', rollupOptions: { input: ['test/fixtures/mobile-player.html', 'test/fixtures/video-fullscreen.html'] } },
});
