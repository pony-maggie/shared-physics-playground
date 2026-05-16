import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getApparatusTemplate } from "../../../../../../../packages/physics-schema/src/apparatus-kit";
import { PhysicsApparatusScene } from "./PhysicsApparatusScene";

describe("PhysicsApparatusScene", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("publishes semantic role metadata for the template", () => {
    render(
      <PhysicsApparatusScene
        playbackProgress={0.5}
        showMeasurements
        template={getApparatusTemplate("inclined-plane-rig")}
      />,
    );

    const metadata = screen.getByTestId("apparatus-scene");
    expect(metadata.getAttribute("data-roles")).toBe(
      "surface,moving-object,measurement-line",
    );
    expect(metadata.getAttribute("data-template-id")).toBe("inclined-plane-rig");
    expect(document.querySelector("group")?.getAttribute("data-template-id")).toBeNull();
  });
});
