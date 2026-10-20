import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

// Standalone design entry: no app root, backend credentials or release plugins.
export default defineConfig({
  root: process.cwd(),
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  server: { host: '127.0.0.1', port: 5214, strictPort: true },
  build: {
    outDir: 'output/video-feed/build',
    rollupOptions: { input: 'docs/design/boulder-video-feed/index.html' },
  },
});
