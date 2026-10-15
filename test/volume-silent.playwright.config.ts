import { defineConfig } from '@playwright/test';
import base from '../playwright.config';
import { fileURLToPath } from 'node:url';
const port = Number(process.env.PLAYWRIGHT_PORT || '5192');
export default defineConfig({
  ...base, testDir: '../e2e', outputDir: '../test-results/volume-silent-artifacts',
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: { command: `node node_modules/vite/bin/vite.js --config test/volume-silent.vite.config.ts --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 120000 },
});
