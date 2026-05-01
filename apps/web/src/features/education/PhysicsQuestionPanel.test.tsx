// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { PhysicsQuestionPanel } from "./PhysicsQuestionPanel";

afterEach(() => {
  cleanup();
});

describe("PhysicsQuestionPanel", () => {
  test("submits a physics question", () => {
    const onPlan = vi.fn();
    render(<PhysicsQuestionPanel language="en" onPlan={onPlan} status={{ kind: "idle" }} />);

    fireEvent.change(screen.getByLabelText("Physics question"), {
      target: { value: "Why does a ball roll faster on a steeper slope?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Experiment" }));

    expect(onPlan).toHaveBeenCalledWith("Why does a ball roll faster on a steeper slope?");
  });

  test("shows a planning state", () => {
    render(<PhysicsQuestionPanel language="en" onPlan={() => {}} status={{ kind: "planning" }} />);

    expect(screen.getByRole("button", { name: "Generating..." }).hasAttribute("disabled")).toBe(true);
  });

  test("disables AI generation with an entitlement message", () => {
    const onPlan = vi.fn();
    render(
      <PhysicsQuestionPanel
        disabledReason="Sign in to generate a custom AI experiment."
        language="en"
        onPlan={onPlan}
        status={{ kind: "idle" }}
      />,
    );

    expect(screen.getByRole("button", { name: "Generate Experiment" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Sign in to generate a custom AI experiment.")).toBeTruthy();
  });

  test("shows supported experiments as prompt chips and uses one as a starter question", async () => {
    const onPlan = vi.fn();
    render(<PhysicsQuestionPanel language="en" onPlan={onPlan} status={{ kind: "idle" }} />);

    expect(await screen.findByRole("group", { name: "Supported experiments" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Inclined plane" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Refraction" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "RC circuit" })).toBeTruthy();

    fireEvent.click(await screen.findByRole("button", { name: "Projectile motion" }));
    expect((screen.getByLabelText("Physics question") as HTMLInputElement).value).toBe(
      "How far will a ball fly if I launch it upward?",
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate Experiment" }));
    expect(onPlan).toHaveBeenCalledWith("How far will a ball fly if I launch it upward?");
  });
});
