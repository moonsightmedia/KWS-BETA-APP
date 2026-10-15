import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '../e2e', testMatch: ['reset-plan.spec.ts', 'home-reset-layout.spec.ts'],
  outputDir: '../test-results/oct15-reset-artifacts', timeout: 60_000,
  reporter: 'list', fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5182', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { cwd: '..', command: 'node node_modules/vite/bin/vite.js --config test/reset-plan.vite.config.ts', url: 'http://127.0.0.1:5182/test/fixtures/reset-plan.html', reuseExistingServer: false, timeout: 60_000 },
});
