import { describe, expect, test } from "vitest";

import { SIMULATION_CONCEPTS } from "../../../../../../../packages/prompt-contracts/src/simulation-spec";
import { getExperiment3DRenderer, getExperiment3DRoles } from "./index";

describe("3D renderer contract", () => {
  test.each(SIMULATION_CONCEPTS)(
    "%s has a renderer and semantic focus roles",
    (concept) => {
      expect(getExperiment3DRenderer(concept)).toBeTypeOf("function");
      expect(getExperiment3DRoles(concept)).toContain("moving-object");
      expect(getExperiment3DRoles(concept)).toContain("measurement-line");
      expect(getExperiment3DRoles(concept).length).toBeGreaterThanOrEqual(3);
    },
  );
});
