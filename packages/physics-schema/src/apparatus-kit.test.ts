import { describe, expect, it } from "vitest";

import {
  APPARATUS_TEMPLATES,
  getApparatusTemplate,
  validateApparatusTemplate,
} from "./apparatus-kit";

describe("apparatus kit", () => {
  it("defines the first reusable physics apparatus templates", () => {
    expect(Object.keys(APPARATUS_TEMPLATES)).toEqual([
      "inclined-plane-rig",
      "spring-cart-rig",
      "lever-balance-rig",
      "circular-wheel-rig",
    ]);
  });

  it("requires unique semantic part ids and motion metadata", () => {
    const template = getApparatusTemplate("inclined-plane-rig");

    expect(validateApparatusTemplate(template)).toEqual({ ok: true, issues: [] });
    expect(template.parts.map((part) => part.role)).toEqual([
      "surface",
      "moving-object",
      "measurement-line",
    ]);
    expect(template.parts.find((part) => part.role === "moving-object")?.motion).toMatchObject({
      kind: "path",
      path: {
        from: [-1.45, 0.28, 0],
        to: [1.45, 0.28, 0],
      },
    });
  });

  it("marks the circular template as wheel-friendly", () => {
    expect(getApparatusTemplate("circular-wheel-rig")).toMatchObject({
      concept: "circular_motion",
      sourceHint: {
        articraftTerms: expect.arrayContaining(["wheel", "skateboard", "wheelchair", "fan"]),
      },
    });
  });
});
