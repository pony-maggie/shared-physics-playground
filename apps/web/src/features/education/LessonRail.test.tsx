import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import type { LessonFlow } from "./lesson-flow";
import { LessonRail } from "./LessonRail";

const flow: LessonFlow = {
  concept: "inclined_plane",
  steps: [
    { focusRoles: ["moving-object"], id: "predict", prompt: "Predict it.", title: "Predict" },
    { focusRoles: ["path"], id: "run", prompt: "Run it.", title: "Run" },
    {
      focusRoles: ["measurement-line"],
      id: "measure",
      measurementKeys: ["speed"],
      prompt: "Measure it.",
      title: "Measure",
    },
    {
      focusRoles: ["force-vector"],
      id: "explain",
      prompt: "Explain it.",
      title: "Explain",
    },
    {
      focusRoles: ["moving-object"],
      id: "try",
      prompt: "Try it.",
      title: "Try Variation",
      variation: { label: "Change angle", variables: { angleDeg: 30 } },
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe("LessonRail", () => {
  test("renders lesson steps as static guidance instead of navigation buttons", () => {
    render(
      <LessonRail
        activeStep="predict"
        flow={flow}
        language="en"
        measurements={{ speed: 4.2 }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Predict" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Run" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Measure" })).toBeNull();
    expect(screen.getByText("Predict it.")).toBeTruthy();
    expect(screen.getByText("Run it.")).toBeTruthy();
    expect(screen.getByText("Measure it.")).toBeTruthy();
    expect(screen.getByText("4.2")).toBeTruthy();
  });

  test("shows the Try step as guidance without rendering a variation button", () => {
    render(
      <LessonRail
        activeStep="try"
        flow={flow}
        language="en"
        measurements={{ speed: 4.2 }}
      />,
    );

    expect(screen.getByText("Try it.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Change angle" })).toBeNull();
  });
});
