import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'node:path';
import tokens from '../../../tailwind.config';

// An isolated local design entry. No app root, auth, API, release or version plugin.
export default defineConfig({
  envDir: false,
  plugins: [react()],
  cacheDir: 'node_modules/.vite-thumbnail-inline-ux',
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  css: { postcss: { plugins: [tailwindcss({ ...tokens, content: [...tokens.content as string[], './docs/design/thumbnail-inline-ux/**/*.{html,tsx}'] }), autoprefixer()] } },
  server: { host: '127.0.0.1', port: 5342, strictPort: true, headers: {
    'Content-Security-Policy': "default-src 'self'; connect-src 'self' ws://127.0.0.1:5342; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; form-action 'none'; frame-ancestors 'self'",
  } },
  build: { outDir: 'output/thumbnail-inline-ux/build', copyPublicDir: false,
    rollupOptions: { input: 'docs/design/thumbnail-inline-ux/index.html' } },
});
