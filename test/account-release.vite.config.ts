import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const repo = path.resolve(__dirname, '..');
const hooks = path.join(repo, 'test/fixtures/account-release-hooks.tsx');
// Exact substitutions apply only to this explicitly started local QA server.
export default defineConfig({ root: repo, plugins: [react()], server: { host: '127.0.0.1', port: 4180, strictPort: true },
  resolve: { alias: [
    ...['hooks/useAuth', 'lib/accountDeletion', 'lib/profileCompat', 'integrations/supabase/storage', 'integrations/supabase/client', 'components/DashboardPageLayout', 'hooks/useBoulders', 'hooks/useSectors', 'hooks/useColors', 'hooks/useBoulderCommunity'].map(name => ({ find: `@/${name}`, replacement: hooks })),
    { find: '@', replacement: path.join(repo, 'src') },
  ], dedupe: ['react', 'react-dom'] },
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify('1.0.230-qa') },
  optimizeDeps: { entries: ['test/fixtures/account-release.html'] },
});
