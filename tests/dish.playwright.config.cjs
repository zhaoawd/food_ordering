/* global __dirname */
const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'dish.browser.spec.cjs',workers:1,timeout:20000,outputDir:'../test-results/dish',use:{baseURL:'http://127.0.0.1:18769',viewport:{width:430,height:932},deviceScaleFactor:3},webServer:{command:'node tests/address-browser-server.cjs',cwd:require('node:path').resolve(__dirname,'..'),url:'http://127.0.0.1:18769',reuseExistingServer:false}});
