import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: 'training-ui.spec.ts', outputDir: './test-results/training-artifacts',
  timeout: 40_000, fullyParallel: false, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5184', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npx vite --config vite.training-preview.config.ts', url: 'http://127.0.0.1:5184/training', reuseExistingServer: true, timeout: 60_000 },
});
