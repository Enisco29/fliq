import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:3001", viewport: { width: 390, height: 844 }, hasTouch: true, trace: "retain-on-failure", channel: process.env.PLAYWRIGHT_CHANNEL },
  webServer: { command: "npm run dev -- --port 3001", url: "http://127.0.0.1:3001", reuseExistingServer: !process.env.CI, timeout: 120000 },
});
