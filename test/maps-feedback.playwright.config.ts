import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '../e2e', testMatch: 'maps-feedback.spec.ts', outputDir: '../output/maps-feedback-20261020/artifacts', timeout: 60_000,
  reporter: 'list', fullyParallel: false, use: { baseURL: 'http://127.0.0.1:5232', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { cwd: '..', command: 'node node_modules/vite/bin/vite.js --config test/maps-feedback.vite.config.ts', url: 'http://127.0.0.1:5232/test/fixtures/maps-feedback.html', reuseExistingServer: false, timeout: 60_000 },
});
