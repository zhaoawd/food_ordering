/* global __dirname */
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: "eval-r1.browser.spec.cjs",
  workers: 1,
  outputDir: "../test-results/eval-r1",
  use: {
    baseURL: "http://127.0.0.1:18766",
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
  },
  webServer: {
    command: "node tests/eval-r1-browser-server.cjs",
    cwd: require("node:path").resolve(__dirname, ".."),
    url: "http://127.0.0.1:18766",
    reuseExistingServer: false,
  },
});
