import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'../e2e',testMatch:'thumbnail-setter.spec.ts',outputDir:'../output/thumbnail-setter/artifacts',timeout:60000,expect:{timeout:10000},reporter:'list',
 use:{baseURL:'http://127.0.0.1:5244',trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{cwd:'..',command:'node node_modules/vite/bin/vite.js --config test/thumbnail-setter.vite.config.ts',url:'http://127.0.0.1:5244/test/fixtures/thumbnail-setter.html',reuseExistingServer:true},
});
