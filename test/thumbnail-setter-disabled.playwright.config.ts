import {defineConfig} from '@playwright/test';
import base from './thumbnail-setter.playwright.config';
export default defineConfig({...base,testMatch:'thumbnail-setter-disabled.spec.ts',outputDir:'../output/thumbnail-setter/disabled-artifacts',
 use:{...base.use,baseURL:'http://127.0.0.1:5245'},
 webServer:{cwd:'..',command:'node node_modules/vite/bin/vite.js --config test/thumbnail-setter-disabled.vite.config.ts',url:'http://127.0.0.1:5245/test/fixtures/thumbnail-setter.html',reuseExistingServer:true},
});
