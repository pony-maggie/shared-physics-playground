import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Experiment3DViewer } from "./Experiment3DViewer";
import type { ExperimentViewerState } from "./types";

const viewerState: ExperimentViewerState = {
  activeStep: "predict",
  cameraPreset: "default",
  displayLayers: {
    forces: true,
    labels: true,
    measurements: true,
    trails: true,
  },
  focusedRoles: ["moving-object"],
};

describe("Experiment3DViewer", () => {
  test("renders a 3D viewer shell with scene metadata", () => {
    render(
      <Experiment3DViewer
        language="en"
        measurements={{ accelerationMps2: 3.2 }}
        plan={{
          concept: "inclined_plane",
          guidingQuestions: ["What changes?", "Why?"],
          objective: "Observe acceleration.",
          title: "Inclined plane",
          variables: { angleDeg: 25, frictionCoefficient: 0.1, lengthM: 4, massKg: 1 },
        }}
        playback={{
          isRunning: false,
          pause: () => undefined,
          play: () => undefined,
          progress: 0,
          progressPercent: 0,
          reset: () => undefined,
        }}
        viewerState={viewerState}
      />,
    );

    expect(screen.getByTestId("experiment-3d-viewer").getAttribute("data-concept")).toBe(
      "inclined_plane",
    );
    expect(screen.getByTestId("experiment-3d-viewer").getAttribute("data-playback-progress")).toBe(
      "0",
    );
    expect(screen.getByTestId("experiment-3d-viewer").getAttribute("data-running")).toBe("false");
    expect(screen.getByTestId("r3f-canvas")).toBeTruthy();
    expect(screen.getByText("Inclined plane")).toBeTruthy();
  });
});
