// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { SIMULATION_CONCEPTS, type SimulationConcept } from "../../../../../packages/prompt-contracts/src/simulation-spec";
import type { PlannedSimulation } from "../../state/simulation-client";
import { InclinedPlaneExperiment } from "./InclinedPlaneExperiment";

const planned = {
  plan: {
    concept: "inclined_plane" as const,
    title: "Inclined plane and friction",
    objective: "Observe slope angle and friction.",
    variables: {
      angleDeg: 25,
      frictionCoefficient: 0.15,
      lengthM: 4,
      massKg: 1,
    },
    guidingQuestions: ["What happens when angle increases?", "What happens when friction increases?"],
  },
  measurements: {
    accelerationMps2: 3.15,
    timeToBottomS: 1.59,
    finalSpeedMps: 5.02,
    willSlide: true,
  },
  explanation: "The object slides because gravity wins over friction.",
};

function genericPlan(
  concept: Exclude<SimulationConcept, "inclined_plane" | "projectile_motion" | "spring_oscillator">,
  variables: Record<string, number>,
  measurements: Record<string, number | string | boolean | null>,
): PlannedSimulation {
  return {
    plan: {
      concept,
      title: concept,
      objective: "Explore parameters.",
      variables,
      guidingQuestions: ["What changes?"],
    } as PlannedSimulation["plan"],
    measurements,
    explanation: "A deterministic built-in experiment.",
  };
}

const conceptPlans: Record<SimulationConcept, PlannedSimulation> = {
  inclined_plane: planned,
  projectile_motion: {
    plan: {
      concept: "projectile_motion",
      title: "Projectile motion",
      objective: "Explore launch speed and angle.",
      variables: {
        launchSpeedMps: 18,
        launchAngleDeg: 40,
        launchHeightM: 1,
        gravityMps2: 9.81,
      },
      guidingQuestions: ["Which angle goes farthest?", "How does speed change range?"],
    },
    measurements: {
      flightTimeS: 2.41,
      rangeM: 33.2,
      maxHeightM: 7.84,
      finalSpeedMps: 18.53,
      willLand: true,
    },
    explanation: "Horizontal velocity stays constant while vertical velocity changes.",
  },
  spring_oscillator: {
    plan: {
      concept: "spring_oscillator",
      title: "Spring oscillator",
      objective: "Explore mass and spring stiffness.",
      variables: {
        massKg: 1,
        springConstantNpm: 80,
        amplitudeM: 0.4,
        dampingRatio: 0.05,
      },
      guidingQuestions: ["How does mass change period?", "How does stiffness change period?"],
    },
    measurements: {
      periodS: 0.7,
      angularFrequencyRadps: 8.94,
      maxSpeedMps: 3.58,
      energyJ: 6.4,
      willOscillate: true,
    },
    explanation: "A spring pulls the mass back toward equilibrium.",
  },
  pendulum: genericPlan(
    "pendulum",
    { lengthM: 2, gravityMps2: 9.81, amplitudeDeg: 24, massKg: 1 },
    { periodS: 2.85, frequencyHz: 0.35, maxSpeedMps: 1.87, tensionAtBottomN: 11.56 },
  ),
  circular_motion: genericPlan(
    "circular_motion",
    { radiusM: 3, speedMps: 12, massKg: 2 },
    { angularSpeedRadps: 4, centripetalAccelMps2: 48, centripetalForceN: 96, periodS: 1.57 },
  ),
  elastic_collision: genericPlan(
    "elastic_collision",
    { mass1Kg: 1, mass2Kg: 2, velocity1Mps: 6, velocity2Mps: -1 },
    { finalVelocity1Mps: -3.33, finalVelocity2Mps: 3.67, totalMomentumKgMps: 4, totalKineticEnergyJ: 19 },
  ),
  buoyancy: genericPlan(
    "buoyancy",
    { objectVolumeL: 4, objectMassKg: 2, fluidDensityKgM3: 1000 },
    { buoyantForceN: 39.24, weightN: 19.62, netForceN: 19.62, willFloat: true },
  ),
  lever_balance: genericPlan(
    "lever_balance",
    { leftMassKg: 4, rightMassKg: 3, leftArmM: 1.2, rightArmM: 1.6 },
    { leftTorqueNm: 47.09, rightTorqueNm: 47.09, netTorqueNm: 0, balance: "balanced" },
  ),
  ohms_law: genericPlan(
    "ohms_law",
    { voltageV: 12, resistanceOhm: 6 },
    { currentA: 2, powerW: 24, conductanceS: 0.17 },
  ),
  ideal_gas: genericPlan(
    "ideal_gas",
    { molesMol: 1, temperatureK: 300, volumeL: 24 },
    { pressureKpa: 103.92, pressureAtm: 1.03, thermalEnergyJ: 3741.3 },
  ),
  work_energy: genericPlan(
    "work_energy",
    { forceN: 25, distanceM: 4, angleDeg: 0, massKg: 2 },
    { workJ: 100, kineticEnergyGainJ: 100, finalSpeedMps: 10 },
  ),
  wave_speed: genericPlan(
    "wave_speed",
    { frequencyHz: 5, wavelengthM: 2, amplitudeM: 0.3 },
    { speedMps: 10, periodS: 0.2, angularFrequencyRadps: 31.42 },
  ),
  refraction: genericPlan(
    "refraction",
    { incidentAngleDeg: 30, refractiveIndex1: 1, refractiveIndex2: 1.5 },
    { refractedAngleDeg: 19.47, criticalAngleDeg: null, speedRatio: 0.67, totalInternalReflection: false },
  ),
  lens_imaging: genericPlan(
    "lens_imaging",
    { focalLengthCm: 10, objectDistanceCm: 30, objectHeightCm: 4 },
    { imageDistanceCm: 15, magnification: -0.5, imageHeightCm: -2, imageType: "real_inverted" },
  ),
  coulombs_law: genericPlan(
    "coulombs_law",
    { charge1MicroC: 2, charge2MicroC: -3, distanceM: 0.5 },
    { forceN: 0.22, potentialEnergyJ: -0.11, interaction: "attraction" },
  ),
  rc_circuit: genericPlan(
    "rc_circuit",
    { voltageV: 9, resistanceOhm: 1000, capacitanceMicroF: 100, timeMs: 100 },
    { timeConstantMs: 100, capacitorVoltageV: 5.69, currentA: 0.0033, chargeMicroC: 568.91 },
  ),
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("InclinedPlaneExperiment", () => {
  test("renders measurements and variable controls", async () => {
    const onVariablesChange = vi.fn();
    render(
      <InclinedPlaneExperiment
        language="en"
        planned={planned}
        onVariablesChange={onVariablesChange}
      />,
    );

    expect(screen.getByText("Inclined plane and friction")).toBeTruthy();
    expect(screen.getByText("acceleration: 3.15 m/s²")).toBeTruthy();
    expect(await screen.findByTestId("experiment-3d-viewer")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("angle"), { target: { value: "40" } });
    expect(onVariablesChange).toHaveBeenCalledWith({ angleDeg: 40 });
  });

  test("groups primary controls and guidance in a named dock inside the 3D workspace", async () => {
    render(
      <InclinedPlaneExperiment
        language="en"
        planned={planned}
        onVariablesChange={() => {}}
      />,
    );

    const workspace = document.querySelector(".full-3d-lab-workspace");
    const controlDock = screen.getByRole("region", { name: "Experiment Controls" });

    expect(workspace).not.toBeNull();
    expect(workspace?.contains(controlDock)).toBe(true);
    expect(controlDock.classList.contains("experiment-tools-rail")).toBe(true);
    expect(controlDock.querySelector(".experiment-controls")).not.toBeNull();
    expect(controlDock.querySelector(".experiment-results")).not.toBeNull();
    expect(controlDock.querySelector(".experiment-questions")).not.toBeNull();
    expect(controlDock.textContent).toContain("Guiding Questions");
    expect(screen.queryByRole("complementary", { name: "Lesson Flow" })).toBeNull();
    expect(await screen.findByTestId("experiment-3d-viewer")).toBeTruthy();
  });

  test.each(SIMULATION_CONCEPTS)("uses the 3D viewer as the only primary stage for %s", async (concept) => {
    render(
      <InclinedPlaneExperiment
        language="en"
        planned={conceptPlans[concept]}
        onVariablesChange={() => {}}
      />,
    );

    const viewer = await screen.findByTestId("experiment-3d-viewer");

    expect(viewer.getAttribute("data-concept")).toBe(concept);
    expect(viewer.getAttribute("data-running")).toBe("false");
    expect(document.querySelector(".experiment-diagram")).toBeNull();
    expect(screen.queryByTestId("rolling-ball")).toBeNull();
    expect(screen.queryByTestId("experiment-motion-marker")).toBeNull();
  });

  test("drives playback progress through the 3D viewer state", async () => {
    render(
      <InclinedPlaneExperiment
        language="en"
        planned={planned}
        onVariablesChange={() => {}}
      />,
    );

    const viewer = await screen.findByTestId("experiment-3d-viewer");
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      return window.setTimeout(() => callback(now), 0);
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      window.clearTimeout(id);
    });

    fireEvent.click(screen.getByRole("button", { name: "Play Experiment" }));
    now = planned.measurements.timeToBottomS * 1000;
    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(viewer.getAttribute("data-playback-progress")).toBe("100");
  });

  test("renders projectile-motion controls and measurements", async () => {
    const onVariablesChange = vi.fn();

    render(
      <InclinedPlaneExperiment
        language="en"
        planned={conceptPlans.projectile_motion}
        onVariablesChange={onVariablesChange}
      />,
    );

    expect(await screen.findAllByText("Projectile motion")).not.toHaveLength(0);
    expect(screen.getByText("range: 33.2 m")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("launch angle"), { target: { value: "45" } });
    expect(onVariablesChange).toHaveBeenCalledWith({ launchAngleDeg: 45 });
  });

  test("localizes projectile-motion controls and measurements in Chinese", async () => {
    render(
      <InclinedPlaneExperiment
        language="zh-CN"
        planned={conceptPlans.projectile_motion}
        onVariablesChange={() => {}}
      />,
    );

    expect(await screen.findByLabelText("发射角度")).toBeTruthy();
    expect(screen.getByText("射程：33.2 m")).toBeTruthy();
  });

  test("renders spring-oscillator controls and measurements", async () => {
    const onVariablesChange = vi.fn();

    render(
      <InclinedPlaneExperiment
        language="en"
        planned={conceptPlans.spring_oscillator}
        onVariablesChange={onVariablesChange}
      />,
    );

    expect(await screen.findAllByText("Spring oscillator")).not.toHaveLength(0);
    expect(screen.getByText("period: 0.7 s")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("spring constant"), { target: { value: "120" } });
    expect(onVariablesChange).toHaveBeenCalledWith({ springConstantNpm: 120 });
  });

  test("renders generic built-in template controls and measurements", async () => {
    const onVariablesChange = vi.fn();

    render(
      <InclinedPlaneExperiment
        language="en"
        planned={conceptPlans.ohms_law}
        onVariablesChange={onVariablesChange}
      />,
    );

    expect(await screen.findAllByText("ohms_law")).not.toHaveLength(0);
    expect(screen.getByText("current: 2 A")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("voltage"), { target: { value: "18" } });
    expect(onVariablesChange).toHaveBeenCalledWith({ voltageV: 18 });
  });

  test("localizes generic template controls and measurements in Chinese", async () => {
    render(
      <InclinedPlaneExperiment
        language="zh-CN"
        planned={conceptPlans.ohms_law}
        onVariablesChange={() => {}}
      />,
    );

    expect(await screen.findByLabelText("电压")).toBeTruthy();
    expect(screen.getByText("电流：2 A")).toBeTruthy();
  });

  test("plays non-ramp experiments through the 3D viewer state", async () => {
    render(
      <InclinedPlaneExperiment
        language="en"
        planned={conceptPlans.projectile_motion}
        onVariablesChange={() => {}}
      />,
    );

    const viewer = await screen.findByTestId("experiment-3d-viewer");

    expect(viewer.getAttribute("data-running")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Play Experiment" }));
    expect(screen.getByRole("button", { name: "Pause Experiment" })).toBeTruthy();
    expect(viewer.getAttribute("data-running")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Reset Experiment" }));
    expect(viewer.getAttribute("data-playback-progress")).toBe("0");
  });
});
