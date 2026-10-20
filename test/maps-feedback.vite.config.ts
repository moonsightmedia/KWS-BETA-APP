import { defineConfig } from 'vite';
import path from 'node:path';
import base from './reset-plan.vite.config';
import snapshot from './fixtures/hall-hierarchy-snapshot.json';
const repo = path.resolve(__dirname, '..');
const nextNames = ['Atta-Höhle', 'Felsenmeer', 'Bilstein', 'Durchbruch', 'Wandelwand'];
export default defineConfig({
  ...base,
  cacheDir: 'node_modules/.vite-maps-feedback',
  plugins: [...(base.plugins ?? []).filter(plugin => (plugin as { name?: string })?.name !== 'local-reset-plan-data'), {
    name: 'isolated-map-feedback-data', configureServer(server) {
      server.middlewares.use('/qa/rest/v1', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method !== 'GET') { res.statusCode = 405; res.end('{}'); return; }
        const url = new URL(req.url || '/', 'http://localhost');
        const rows = nextNames.map((name, index) => ({ id: `schedule-${index}`, sector_id: snapshot.sectors.find(sector => sector.name === name)!.id,
          scheduled_at: index < 2 ? '2026-10-26T09:00:00Z' : index < 4 ? '2026-10-29T09:00:00Z' : '2026-11-02T09:00:00Z', note: 'Isolierte Beispieldaten.' }));
        const data = url.pathname === '/sectors' ? snapshot.sectors : url.pathname === '/sector_schedule' ? rows
          : url.pathname === '/hall_maps' ? [snapshot.map] : url.pathname === '/sector_map_regions' ? snapshot.regions : [];
        res.end(JSON.stringify(data));
      });
    },
  }],
  server: { host: '127.0.0.1', port: 5232, strictPort: true },
  resolve: { ...base.resolve, alias: [
    { find: '@/hooks/useHallMaps', replacement: path.join(repo, 'test/fixtures/maps-feedback-read-hooks.ts') },
    ...(base.resolve?.alias as Array<{ find: string; replacement: string }>),
  ] },
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:5232/qa'), 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('isolated-public-fixture-key') },
  optimizeDeps: { entries: ['test/fixtures/maps-feedback.html'] },
});
