import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { dashboardBoulders, dashboardSectors, dashboardRatings, dashboardGrades, dashboardComments } from './fixtures/setter-dashboard-data';
import { v2Boulders, v2Ratings, v2Grades, v2Comments, dashboardSectors as v2Sectors } from './fixtures/setter-dashboard-v2-data';
const repo = path.resolve(__dirname, '..');
const hooks = path.join(repo, 'test/fixtures/reset-plan-hooks.ts');
export default defineConfig({
  root: repo, cacheDir: 'node_modules/.vite-setter-dashboard',
  plugins: [react(), { name: 'isolated-setter-dashboard', configureServer(server) {
    server.middlewares.use('/qa/rest/v1', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method !== 'GET') { res.statusCode = 405; res.end('{}'); return; }
      const url = new URL(req.url || '/', 'http://localhost');
      const state = url.searchParams.get('qa_state');
      if (state === 'error' && url.pathname === '/boulder_ratings') { res.statusCode = 503; res.end('{"message":"Isolierter Testfehler"}'); return; }
      const collections = { '/boulders': dashboardBoulders, '/sectors': dashboardSectors, '/boulder_ratings': dashboardRatings, '/boulder_grade_feedback': dashboardGrades, '/boulder_comments': dashboardComments };
      const variant = url.searchParams.get('qa_design') === 'v2'
        ? { ...collections, '/boulders': v2Boulders, '/sectors': v2Sectors, '/boulder_ratings': v2Ratings, '/boulder_grade_feedback': v2Grades, '/boulder_comments': v2Comments } : collections;
      const catalog = variant['/sectors'].map(sector => sector.area);
      // The final fixture includes a real catalog entry without any sector row.
      const isFinal = !['v1', 'v2', 'v3', 'v4'].includes(url.searchParams.get('qa_design_view') ?? '');
      const collection = url.pathname === '/sector_areas' ? catalog : (variant[url.pathname as keyof typeof variant] ?? []);
      const activeFilter = url.searchParams.get('boulder_id')?.match(/^in\.\((.*)\)$/)?.[1].split(',');
      const data = isFinal && url.pathname === '/sectors' ? collection.filter(row => row.id !== 'sector-empty') : collection;
      const cursor = url.searchParams.get('id')?.replace(/^gt\./, '');
      // Smaller server cap deliberately verifies pagination beyond short pages.
      const rows = [...data].filter(row => !activeFilter || ('boulder_id' in row && activeFilter.includes(row.boulder_id))).sort((a, b) => a.id.localeCompare(b.id)).filter(row => !cursor || row.id > cursor).slice(0, 73);
      const noFeedback = state === 'no-feedback' && /boulder_(ratings|grade_feedback|comments)$/.test(url.pathname);
      const send = () => res.end(JSON.stringify(state === 'empty' || noFeedback ? [] : rows));
      if (state === 'loading') setTimeout(send, 4000); else send();
    });
  } }],
  server: { host: '127.0.0.1', port: 5256, strictPort: true, watch: { ignored: ['**/output/**'] } },
  build: { rollupOptions: { input: path.join(repo, 'test/fixtures/setter-dashboard.html') } },
  css: { postcss: { plugins: [tailwindcss({ config: path.join(repo, 'test/setter-dashboard.tailwind.config.ts') }), autoprefixer()] } },
  resolve: { alias: [
    ...['hooks/useAuth', 'hooks/useHasRole', 'hooks/useIsAdmin', 'hooks/useNotifications', 'lib/profileCompat'].map(name => ({ find: `@/${name}`, replacement: hooks })),
    { find: '@/components/UploadOverview', replacement: path.join(repo, 'test/fixtures/setter-dashboard-uploads.tsx') },
    { find: '@/lib/supabaseRest', replacement: path.join(repo, 'test/fixtures/setter-dashboard-rest.ts') },
    { find: '@', replacement: path.join(repo, 'src') },
  ], dedupe: ['react', 'react-dom'] },
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:5256/qa'), 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('isolated-public-fixture-key') },
  optimizeDeps: { entries: ['test/fixtures/setter-dashboard.html'] },
});
