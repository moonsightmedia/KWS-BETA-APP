import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: 'training-release-gate.spec.ts',
  outputDir: './test-results/training-release-gate-artifacts',
  timeout: 60_000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5191', screenshot: 'only-on-failure' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5191 --strictPort',
    env: { VITE_TRAINING_UI_PREVIEW: 'false', VITE_SUPABASE_URL: 'https://api.fixture.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture-only' },
    url: 'http://127.0.0.1:5191', reuseExistingServer: false, timeout: 60_000,
  },
});
