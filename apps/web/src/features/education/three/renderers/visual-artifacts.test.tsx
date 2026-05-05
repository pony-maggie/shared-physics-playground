// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type {
  CircularMotionPlan,
  LensImagingPlan,
  ProjectileMotionPlan,
  RefractionPlan,
  SpringOscillatorPlan,
} from "../../../../../../../packages/prompt-contracts/src/simulation-spec";
import type { Experiment3DRendererProps, ExperimentViewerState } from "../types";
import { CircularMotion3D, LensImaging3D, Refraction3D, SpringOscillator3D } from "./AdditionalExperiment3D";
import { ProjectileMotion3D } from "./ProjectileMotion3D";

const predictViewerState: ExperimentViewerState = {
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

const measureViewerState: ExperimentViewerState = {
  ...predictViewerState,
  activeStep: "measure",
  focusedRoles: ["measurement-line"],
};

const playback = {
  isRunning: false,
  pause: () => undefined,
  play: () => undefined,
  progress: 0,
  progressPercent: 0,
  reset: () => undefined,
};

function baseProps<TPlan>(plan: TPlan, viewerState = predictViewerState): Experiment3DRendererProps<TPlan> {
  return {
    language: "en",
    measurements: {},
    plan,
    playback,
    registerObject: () => undefined,
    viewerState,
  } as Experiment3DRendererProps<TPlan>;
}

const projectilePlan: ProjectileMotionPlan = {
  concept: "projectile_motion",
  guidingQuestions: ["What changes?"],
  objective: "Explore projectile motion.",
  title: "Projectile motion",
  variables: {
    gravityMps2: 9.81,
    launchAngleDeg: 40,
    launchHeightM: 1,
    launchSpeedMps: 18,
  },
};

const springPlan: SpringOscillatorPlan = {
  concept: "spring_oscillator",
  guidingQuestions: ["What changes?"],
  objective: "Explore spring motion.",
  title: "Spring oscillator",
  variables: {
    amplitudeM: 0.4,
    dampingRatio: 0.05,
    massKg: 1,
    springConstantNpm: 80,
  },
};

const circularPlan: CircularMotionPlan = {
  concept: "circular_motion",
  guidingQuestions: ["What changes?"],
  objective: "Explore circular motion.",
  title: "Circular motion",
  variables: {
    massKg: 1,
    radiusM: 3,
    speedMps: 12,
  },
};

const refractionPlan: RefractionPlan = {
  concept: "refraction",
  guidingQuestions: ["What changes?"],
  objective: "Explore refraction.",
  title: "Refraction",
  variables: {
    incidentAngleDeg: 30,
    refractiveIndex1: 1,
    refractiveIndex2: 1.5,
  },
};

const lensPlan: LensImagingPlan = {
  concept: "lens_imaging",
  guidingQuestions: ["What changes?"],
  objective: "Explore lens imaging.",
  title: "Lens imaging",
  variables: {
    focalLengthCm: 10,
    objectDistanceCm: 30,
    objectHeightCm: 4,
  },
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("3D renderer visual artifacts", () => {
  test("projectile motion renders the ball and trajectory without a source block beside the ball", () => {
    const { container } = render(<ProjectileMotion3D {...baseProps(projectilePlan)} />);

    expect(container.querySelectorAll("spheregeometry")).toHaveLength(1);
    expect(container.querySelectorAll("boxgeometry")).toHaveLength(0);
  });

  test.each([
    ["spring oscillator", <SpringOscillator3D {...baseProps(springPlan)} />],
    ["circular motion", <CircularMotion3D {...baseProps(circularPlan)} />],
  ])("%s hides yellow measurement bars before the Measure step", (_name, element) => {
    const { container } = render(element);

    expect(container.querySelector('[color="#f4d35e"][emissive="#f4d35e"]')).toBeNull();
  });

  test("measurement bars are still available during the Measure step", () => {
    const { container } = render(<SpringOscillator3D {...baseProps(springPlan, measureViewerState)} />);

    expect(container.querySelector('[color="#8fa3b8"][emissive="#8fa3b8"]')).not.toBeNull();
  });

  test.each([
    ["refraction", <Refraction3D {...baseProps(refractionPlan)} />],
    ["lens imaging", <LensImaging3D {...baseProps(lensPlan)} />],
  ])("%s avoids yellow line-like helper geometry", (_name, element) => {
    const { container } = render(element);

    expect(container.querySelector('[color="#f4d35e"][emissive="#f4d35e"]')).toBeNull();
  });
});
