import { defineConfig } from "vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 750,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");

          if (!id.includes("node_modules")) {
            if (
              normalizedId.includes("/apps/web/src/i18n.ts") ||
              normalizedId.includes("/apps/web/src/state/auth-store.ts") ||
              normalizedId.includes("/apps/web/src/state/realtime-room.ts") ||
              normalizedId.includes("/apps/web/src/state/room-client.ts") ||
              normalizedId.includes("/apps/web/src/state/selection-store.ts") ||
              normalizedId.includes("/packages/physics-schema/src/catalog.ts") ||
              normalizedId.includes("/packages/shared/src/access-policy.ts")
            ) {
              return "app-shared";
            }

            return;
          }

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/")
          ) {
            return "react-vendor";
          }

          if (id.includes("/zustand/")) {
            return "state-vendor";
          }

          if (id.includes("/three/")) {
            return "three-core";
          }

          if (id.includes("/colyseus.js/")) {
            return "realtime-vendor";
          }
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:2567",
        changeOrigin: true,
      },
      "/colyseus": {
        target: "http://127.0.0.1:2567",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
