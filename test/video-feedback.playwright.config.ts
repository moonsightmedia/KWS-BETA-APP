import { defineConfig } from '@playwright/test';

const feed = process.env.VIDEO_FEEDBACK_SUITE === 'feed';
export default defineConfig({
  testDir: '../e2e', testMatch: feed ? 'boulder-feed.spec.ts' : 'mobile-player-detail.spec.ts',
  outputDir: '../output/video-feedback-20261020/artifacts', workers: 1, retries: 0, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:5231', viewport: { width: 375, height: 812 }, hasTouch: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { cwd: '..', command: `npx vite --config test/${feed ? 'boulder-feed' : 'mobile-player'}.vite.config.ts --port 5231`, url: 'http://127.0.0.1:5231', reuseExistingServer: false },
});
