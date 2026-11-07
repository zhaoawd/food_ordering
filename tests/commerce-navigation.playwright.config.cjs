/* global __dirname */
const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'commerce-navigation.browser.spec.cjs',workers:1,timeout:15000,outputDir:'../test-results/commerce-navigation',use:{baseURL:'http://127.0.0.1:18774',viewport:{width:430,height:932},deviceScaleFactor:3},webServer:{command:'node tests/commerce-navigation-browser-server.cjs',cwd:require('node:path').resolve(__dirname,'..'),url:'http://127.0.0.1:18774',reuseExistingServer:false}});
