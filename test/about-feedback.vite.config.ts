import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const repo = path.resolve(__dirname, '..');
const hooks = path.join(repo, 'test/fixtures/about-feedback-hooks.ts');
export default defineConfig({
  root: repo,
  plugins: [react(), {
    name: 'isolated-about-feedback', enforce: 'pre',
    resolveId(source) {
      const id = source.replace(/\\/g, '/');
      if (/(?:@\/|\/src\/)hooks\/(useAuth|useHasRole|useIsAdmin|useAccountProfile)(?:\.tsx?)?$/.test(id)
        || /(?:@\/|\/src\/)lib\/authenticatedFetch(?:\.ts)?$/.test(id)) return hooks;
      if (source === '@capacitor/core') return path.join(repo, 'test/fixtures/about-feedback-capacitor.ts');
      if (source === '@capacitor/app') return path.join(repo, 'test/fixtures/about-feedback-app.ts');
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.startsWith('/qa/rest/v1/user_roles')) {
          const id = new URL(request.url, 'http://127.0.0.1:5233').searchParams.get('user_id');
          response.setHeader('Content-Type', 'application/json');
          if (id === 'eq.fixture-error') { response.statusCode = 503; response.end('{}'); return; }
          response.end(JSON.stringify(id === 'eq.fixture-admin' ? [{ role: 'admin' }] : id === 'eq.fixture-setter' ? [{ role: 'setter' }] : []));
          return;
        }
        if (request.url === '/version.json') {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ version: '1.0.251', buildTimestamp: '2026-10-20T12:00:00.000Z', revision: 'fixture-current' }));
          return;
        }
        next();
      });
    },
  }],
  server: { host: '127.0.0.1', port: 5233, strictPort: true, watch: { ignored: ['**/output/**', '**/test-results/**'] } },
  cacheDir: 'node_modules/.vite-about-feedback',
  resolve: { alias: { '@': path.join(repo, 'src') }, dedupe: ['react', 'react-dom'] },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify('1.0.251'),
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify('2026-10-20T12:00:00.000Z'),
    'import.meta.env.VITE_RELEASE_REVISION': JSON.stringify('fixture-current'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:5233/qa'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('isolated-fixture-public-key'),
    'import.meta.env.VITE_TELEMETRY_ENABLED': JSON.stringify('false'),
    'import.meta.env.VITE_MONITORING_ENABLED': JSON.stringify('false'),
  },
  optimizeDeps: { entries: ['test/fixtures/about-feedback.html'] },
});
