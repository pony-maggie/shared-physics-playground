import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "smoke",
          include: ["tests/smoke/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "web",
          include: ["apps/web/src/**/*.test.ts", "apps/web/src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./apps/web/src/test/setup-storage.ts"],
        },
      },
      {
        test: {
          name: "server",
          include: ["apps/server/src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "packages",
          include: ["packages/*/src/**/*.test.ts"],
        },
      },
    ],
  },
});
