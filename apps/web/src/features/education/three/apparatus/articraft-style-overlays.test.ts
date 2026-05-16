import { describe, expect, it } from "vitest";

import { createArticraftStyleOverlayMetadata } from "./articraft-style-overlays";

describe("Articraft-style overlay metadata", () => {
  it("exposes semantic part colors and measurement joint overlay state", () => {
    expect(
      createArticraftStyleOverlayMetadata({
        availableRoles: ["moving-object", "measurement-line", "force-vector"],
        displayLayers: { forces: true, labels: true, measurements: true, trails: false },
        focusedRoles: ["moving-object"],
      }),
    ).toEqual({
      debugJointOverlay: "measurement",
      debugPartColors: "semantic",
      highlightedRoles: ["moving-object"],
      roleColorKey: "moving-object:active,measurement-line:available,force-vector:available",
    });
  });
});
