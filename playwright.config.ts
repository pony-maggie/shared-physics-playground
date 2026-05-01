import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:4173",
  },
  webServer: [
    {
      command: "npm run dev",
      cwd: "./apps/server",
      url: "http://127.0.0.1:2567/healthz",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4173",
      cwd: "./apps/web",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
