import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const root = path.resolve(__dirname, '..');
export default defineConfig({ root, plugins: [react()], server: { host: '127.0.0.1', port: 4192, strictPort: true }, resolve: { alias: { '@': path.join(root, 'src') }, dedupe: ['react', 'react-dom'] }, define: { 'import.meta.env.VITE_MONITORING_ENABLED': JSON.stringify('true'), 'import.meta.env.VITE_MONITORING_CHANNEL': JSON.stringify('test'), 'import.meta.env.VITE_APP_VERSION': JSON.stringify('1.0.244'), 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:4192/qa'), 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('fixture-public'), 'import.meta.env.VITE_SENTRY_DSN': JSON.stringify('') }, optimizeDeps: { entries: ['test/fixtures/monitoringPrivacy.html'] } });
