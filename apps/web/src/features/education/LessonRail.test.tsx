import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

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

describe("LessonRail", () => {
  test("changes active step and reports focused roles", () => {
    const onStepChange = vi.fn();

    render(
      <LessonRail
        activeStep="predict"
        flow={flow}
        language="en"
        measurements={{ speed: 4.2 }}
        onStepChange={onStepChange}
        onVariation={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Measure" }));

    expect(onStepChange).toHaveBeenCalledWith("measure", ["measurement-line"]);
  });

  test("applies a variation from the Try step", () => {
    const onVariation = vi.fn();

    render(
      <LessonRail
        activeStep="try"
        flow={flow}
        language="en"
        measurements={{ speed: 4.2 }}
        onStepChange={() => undefined}
        onVariation={onVariation}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change angle" }));

    expect(onVariation).toHaveBeenCalledWith({ angleDeg: 30 });
  });
});
