import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../e2e',
  testMatch: 'mobile-player-detail.spec.ts',
  outputDir: '../test-results/mobile-player-artifacts',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5244', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    cwd: '..',
    command: 'npx vite --config test/mobile-player.vite.config.ts --port 5244',
    url: 'http://127.0.0.1:5244/test/fixtures/mobile-player.html',
    reuseExistingServer: !process.env.CI,
  },
});
