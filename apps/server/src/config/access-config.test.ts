import { fileURLToPath } from "node:url";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { getUserAccessPolicy } from "../../../../packages/shared/src/access-policy";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const serverAppDir = path.join(repoRoot, "apps/server");

describe("loadRuntimeAccessConfig", () => {
  it("loads the repo access config when the server starts from apps/server", async () => {
    const originalCwd = process.cwd();

    try {
      process.chdir(serverAppDir);
      vi.resetModules();
      const { loadRuntimeAccessConfig } = await import("./access-config");

      const config = loadRuntimeAccessConfig();
      const access = getUserAccessPolicy(config, "machengyu519@gmail.com");

      expect(access).toEqual({
        tier: "pro",
        defaultStageSlug: "my-stage",
        maxStages: 50,
        maxObjectsPerStage: 10,
        canCreateStages: true,
        defaultRoomSlug: "my-stage",
        maxOwnedObjects: 10,
        canCreateNamedRooms: true,
      });
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
    }
  });
});
