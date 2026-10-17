import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

// Local review of the real shared component, without auth or live data.
export default defineConfig(({ command }) => {
  if (command !== 'serve') throw new Error('Loading preview is serve-only.');
  return {
    server: { host: '127.0.0.1', port: 5190, strictPort: true },
    optimizeDeps: { entries: ['test/fixtures/loading-preview.tsx'] },
    resolve: { alias: { '@': path.resolve(__dirname, './src') }, dedupe: ['react', 'react-dom'] },
    plugins: [{ name: 'loading-preview', transformIndexHtml: () => '<!doctype html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beta · Startvorschau</title><link rel="stylesheet" href="/fonts.css"></head><body><div id="root"></div><script type="module" src="/test/fixtures/loading-preview.tsx"></script></body></html>' }, react()],
  };
});
