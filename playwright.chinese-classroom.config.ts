import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',testMatch:'chinese-classroom.spec.ts',timeout:35_000,fullyParallel:true,workers:2,
 outputDir:'tmp/chinese-classroom-layout/test-results',reporter:'list',
 use:{baseURL:'http://127.0.0.1:5187',headless:true,locale:'zh-CN',viewport:{width:1024,height:768},launchOptions:{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'},trace:'retain-on-failure'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',url:'http://127.0.0.1:5187',reuseExistingServer:false,timeout:30_000},
});
