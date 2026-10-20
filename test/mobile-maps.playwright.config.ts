import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'../e2e',testMatch:'mobile-portrait-maps.spec.ts',outputDir:'../output/mobile-maps/artifacts',timeout:120000,expect:{timeout:10000},
 reporter:'list',use:{actionTimeout:5000,baseURL:'http://127.0.0.1:5234',trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{cwd:'..',command:'node node_modules/vite/bin/vite.js --config test/mobile-maps.vite.config.ts',url:'http://127.0.0.1:5234/test/fixtures/setter-desktop.html',reuseExistingServer:true}});
