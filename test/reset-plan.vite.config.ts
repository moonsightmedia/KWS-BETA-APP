import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const repo = path.resolve(__dirname, '..');
const hooks = path.join(repo, 'test/fixtures/reset-plan-hooks.ts');
// Explicit QA-only server. Real public read hooks run against local synthetic REST data.
export default defineConfig({ root: repo, plugins: [react(), {
  name: 'local-reset-plan-data', configureServer(server) {
    server.middlewares.use('/qa/rest/v1', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'GET') { res.statusCode = 405; res.end('{}'); return; }
      const url = new URL(req.url || '/', 'http://localhost');
      const when = new Date(); when.setDate(when.getDate() + 1); when.setHours(10, 0, 0, 0);
      const later = new Date(when); later.setDate(later.getDate() + 3);
      const sectors = [{ id: 'a', name: 'Atta-Höhle', boulder_count: 12 }, { id: 'b', name: 'Felsenmeer', boulder_count: 8 }, { id: 'c', name: 'Grotte D', boulder_count: 9 }];
      const rows = [{ id: '1', sector_id: 'a', scheduled_at: when.toISOString(), note: 'Während des Schraubens bleibt dieser Teilbereich gesperrt.' }, { id: '2', sector_id: 'b', scheduled_at: when.toISOString(), note: null }, { id: '3', sector_id: 'c', scheduled_at: later.toISOString(), note: 'Neue Boulder ab dem Nachmittag.' }];
      const offset = Number(url.searchParams.get('offset') || 0);
      res.end(JSON.stringify(url.pathname === '/sector_schedule' ? rows.slice(offset, offset + 500) : url.pathname === '/sectors' ? sectors : []));
    });
  },
}], server: { host: '127.0.0.1', port: 5182, strictPort: true },
  resolve: { alias: [
    ...['hooks/useAuth', 'hooks/useBoulders', 'hooks/useSectors', 'hooks/useColors', 'hooks/useBoulderCommunity', 'hooks/useHasRole', 'hooks/useIsAdmin', 'hooks/useNotifications', 'hooks/usePreloadBoulderThumbnails', 'lib/profileCompat'].map(name => ({ find: `@/${name}`, replacement: hooks })),
    { find: '@', replacement: path.join(repo, 'src') },
  ], dedupe: ['react', 'react-dom'] },
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:5182/qa'), 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('isolated-public-fixture-key') },
  optimizeDeps: { entries: ['test/fixtures/reset-plan.html'] },
});
