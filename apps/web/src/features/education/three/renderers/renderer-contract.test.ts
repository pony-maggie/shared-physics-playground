import { describe, expect, test } from "vitest";

import { getExperiment3DRenderer, getExperiment3DRoles } from "./index";

describe("3D renderer contract", () => {
  test.each(["inclined_plane", "projectile_motion", "pendulum"] as const)(
    "%s has a renderer and semantic focus roles",
    (concept) => {
      expect(getExperiment3DRenderer(concept)).toBeTypeOf("function");
      expect(getExperiment3DRoles(concept)).toContain("moving-object");
      expect(getExperiment3DRoles(concept).length).toBeGreaterThanOrEqual(3);
    },
  );
});
