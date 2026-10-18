import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const repo = path.resolve(__dirname, '..');
export default defineConfig({ root: repo, plugins: [react()], server: { host: '127.0.0.1', port: 4191, strictPort: true }, resolve: { alias: [{ find: '@/hooks/useAuth', replacement: path.join(repo, 'test/fixtures/launchMonitoring-hooks.ts') }, { find: '@/lib/liveMonitoringSubscription', replacement: path.join(repo, 'test/fixtures/liveMonitoring-subscription.ts') }, { find: '@', replacement: path.join(repo, 'src') }], dedupe: ['react', 'react-dom'] }, define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:4191/qa'), 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('isolated-fixture-public'), 'import.meta.env.VITE_TELEMETRY_ENABLED': JSON.stringify('false') }, optimizeDeps: { entries: ['test/fixtures/launchMonitoring.html'] } });
