import { defineConfig } from 'vite';
import path from 'node:path';
import base from './thumbnail-setter.vite.config';
const boundary = path.resolve('test/fixtures/thumbnail-existing-boundary.ts');
export default defineConfig({
  ...base, cacheDir: 'node_modules/.vite-thumbnail-existing',
  plugins: [{ name: 'isolated-editable-thumbnail-boundaries', enforce: 'pre', resolveId(id) {
    if (/(?:@\/|\/src\/)(?:lib\/(?:authenticatedFetch|backendConfig)|utils\/resumableUpload)(?:\.tsx?)?$/.test(id.replace(/\\/g, '/'))) return boundary;
  } }, ...(base.plugins ?? [])],
  server: { host: '127.0.0.1', port: 5334, strictPort: true },
  optimizeDeps: { entries: ['test/fixtures/thumbnail-existing.html'] },
});
