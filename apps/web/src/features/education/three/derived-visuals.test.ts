import { describe, expect, test } from "vitest";

import { SIMULATION_CONCEPTS } from "../../../../../../packages/prompt-contracts/src/simulation-spec";
import { createExperimentVisualMetadata, deriveFocusedRoles } from "./derived-visuals";
import { getExperiment3DRoles } from "./renderers";

describe("derived 3D visual metadata", () => {
  test.each(SIMULATION_CONCEPTS)("keeps %s lesson focus roles inside renderer roles", (concept) => {
    const focusedRoles = deriveFocusedRoles(concept, ["moving-object", "path", "not-a-role"]);
    const availableRoles = getExperiment3DRoles(concept);

    expect(focusedRoles.length).toBeGreaterThan(0);
    expect(focusedRoles.every((role) => availableRoles.includes(role))).toBe(true);
  });

  test("creates stable metadata for viewer and e2e checks", () => {
    const metadata = createExperimentVisualMetadata({
      activeStep: "measure",
      concept: "inclined_plane",
      displayLayers: {
        forces: true,
        labels: true,
        measurements: true,
        trails: true,
      },
      requestedRoles: ["measurement-line"],
    });

    expect(metadata.focusKey).toBe("inclined_plane:measure:measurement-line");
    expect(metadata.availableRoles).toContain("moving-object");
    expect(metadata.displayLayerKey).toBe("forces,labels,measurements,trails");
  });
});
