import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

// Separate, serve-only harness. The ordinary app and its authentication stay
// unchanged. No Supabase client, remote data or credentials are used here.
export default defineConfig(({ command }) => {
  if (command !== 'serve') throw new Error('Die Training-Demo ist ausschließlich eine lokale Entwicklungsvorschau.');
  return {
    server: { host: '127.0.0.1', port: 5184, strictPort: true },
    optimizeDeps: { entries: ['test/fixtures/training-preview.tsx'] },
    define: { 'import.meta.env.VITE_TRAINING_UI_PREVIEW': JSON.stringify('true') },
    resolve: { alias: { '@': path.resolve(__dirname, './src') }, dedupe: ['react', 'react-dom'] },
    plugins: [{
      name: 'isolated-training-preview', enforce: 'pre' as const, apply: 'serve' as const,
      resolveId(source: string) {
        if (source === '@/lib/profileCompat') return path.resolve(__dirname, 'test/fixtures/training-preview-hooks.ts');
        if (/(?:@\/|\/src\/)hooks\/(useAuth|useHasRole|useIsAdmin)(?:\.tsx?)?$/.test(source.replace(/\\/g, '/'))) return path.resolve(__dirname, 'test/fixtures/training-preview-hooks.ts');
      },
      transformIndexHtml() {
        return '<!doctype html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>KWS · Training-Vorschau</title><link rel="stylesheet" href="/fonts.css"></head><body><div id="root"></div><script type="module" src="/test/fixtures/training-preview.tsx"></script></body></html>';
      },
    }, react()],
  };
});
