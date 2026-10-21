import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '../e2e', testMatch: 'thumbnail-existing.spec.ts', outputDir: '../output/thumbnail-existing/artifacts', timeout: 60000, expect: { timeout: 10000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5334', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: { cwd: '..', command: 'node node_modules/vite/bin/vite.js --config test/thumbnail-existing.vite.config.ts', url: 'http://127.0.0.1:5334/test/fixtures/thumbnail-existing.html', reuseExistingServer: false },
});
