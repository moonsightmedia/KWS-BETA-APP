import{defineConfig}from'@playwright/test';
export default defineConfig({testDir:'../e2e',testMatch:'thumbnail-policy.spec.ts',outputDir:'../output/thumbnail-integration-20261020/policy-artifacts',workers:1,retries:0,timeout:45000,
 use:{baseURL:'http://127.0.0.1:5248',viewport:{width:375,height:812},screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{cwd:'..',command:'npx vite --config test/thumbnail-policy.vite.config.ts',url:'http://127.0.0.1:5248/test/fixtures/thumbnail-policy.html',reuseExistingServer:false,stdout:'pipe'},});
