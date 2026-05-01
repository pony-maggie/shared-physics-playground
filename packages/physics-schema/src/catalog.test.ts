import { describe, expect, it } from "vitest";

import {
  getObjectTemplate,
  OBJECT_CATALOG,
  OBJECT_KINDS,
} from "./catalog";

describe("object catalog", () => {
  it("defines the approved MVP object kinds", () => {
    expect(OBJECT_KINDS).toEqual([
      "cube",
      "ball",
      "ramp",
      "spring",
      "wheel",
      "trigger-zone",
    ]);
    expect(Object.keys(OBJECT_CATALOG)).toEqual(OBJECT_KINDS);
  });

  it("returns the spring template with the expected budget cost", () => {
    expect(getObjectTemplate("spring")).toMatchObject({
      kind: "spring",
      budgetCost: 3,
    });
  });
});
