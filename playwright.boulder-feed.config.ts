import { defineConfig } from '@playwright/test';
const port = Number(process.env.BOULDER_FEED_TEST_PORT ?? 5217);
export default defineConfig({
  testDir: './e2e', testMatch: 'boulder-feed.spec.ts', outputDir: './output/video-feed/playwright', workers: 1,
  timeout: 45000, expect: { timeout: 7000 }, reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, viewport: { width: 375, height: 812 }, hasTouch: true, trace: 'retain-on-failure', launchOptions: process.env.PLAYWRIGHT_CHROME_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE } : undefined },
  webServer: { command: 'node node_modules/vite/bin/vite.js --config test/boulder-feed.vite.config.ts', url: `http://127.0.0.1:${port}/test/fixtures/boulder-feed.html`, reuseExistingServer: false, timeout: 60000 },
});
