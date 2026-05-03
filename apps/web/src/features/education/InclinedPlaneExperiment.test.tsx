// @vitest-environment jsdom

import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { InclinedPlaneExperiment } from "./InclinedPlaneExperiment";
import type { PlannedSimulation } from "../../state/simulation-client";

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

async function getMotionSignature(plannedSimulation: PlannedSimulation): Promise<string> {
  render(
    <InclinedPlaneExperiment
      language="en"
      planned={plannedSimulation}
      onVariablesChange={() => {}}
    />,
  );

  const signature = (await screen.findByTestId("experiment-motion-marker")).getAttribute("data-motion-signature");
  cleanup();
  return signature ?? "";
}

function genericPlan(
  concept: Exclude<PlannedSimulation["plan"]["concept"], "inclined_plane" | "projectile_motion" | "spring_oscillator">,
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("InclinedPlaneExperiment", () => {
  test("renders measurements and variable controls", () => {
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
    fireEvent.change(screen.getByLabelText("angle"), { target: { value: "40" } });
    expect(onVariablesChange).toHaveBeenCalledWith({ angleDeg: 40 });
  });

  test("exposes play, pause, and reset controls for rolling the ball", () => {
    render(
      <InclinedPlaneExperiment
        language="en"
        planned={planned}
        onVariablesChange={() => {}}
      />,
    );

    expect(screen.getByTestId("rolling-ball").getAttribute("data-running")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Play Experiment" }));
    expect(screen.getByRole("button", { name: "Pause Experiment" })).toBeTruthy();
    expect(screen.getByTestId("rolling-ball").getAttribute("data-running")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Reset Experiment" }));
    expect(screen.getByRole("button", { name: "Play Experiment" })).toBeTruthy();
    expect(screen.getByTestId("rolling-ball").getAttribute("data-progress")).toBe("0");
  });

  test("keeps the rolling ball tangent to the top of the ramp through the run", () => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      return window.setTimeout(() => callback(now), 0);
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      window.clearTimeout(id);
    });

    render(
      <InclinedPlaneExperiment
        language="en"
        planned={planned}
        onVariablesChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Play Experiment" }));
    now = planned.measurements.timeToBottomS * 1000;
    act(() => {
      vi.runOnlyPendingTimers();
    });

    const ramp = document.querySelector(".experiment-diagram line") as SVGLineElement;
    const ball = screen.getByTestId("rolling-ball");
    const x1 = Number(ramp.getAttribute("x1"));
    const y1 = Number(ramp.getAttribute("y1"));
    const x2 = Number(ramp.getAttribute("x2"));
    const y2 = Number(ramp.getAttribute("y2"));
    const cx = Number(ball.getAttribute("cx"));
    const cy = Number(ball.getAttribute("cy"));
    const radius = Number(ball.getAttribute("r"));
    const rampStrokeWidth = Number(ramp.getAttribute("stroke-width"));
    const centerLineDistance =
      Math.abs((y2 - y1) * cx - (x2 - x1) * cy + x2 * y1 - y2 * x1) /
      Math.hypot(y2 - y1, x2 - x1);

    expect(ball.getAttribute("data-progress")).toBe("100");
    expect(centerLineDistance).toBeGreaterThanOrEqual(radius + rampStrokeWidth / 2 - 0.25);
  });

  test("renders projectile-motion controls and measurements", () => {
    const onVariablesChange = vi.fn();

    render(
      <InclinedPlaneExperiment
        language="en"
        planned={{
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
        }}
        onVariablesChange={onVariablesChange}
      />,
    );

    expect(screen.getByText("Projectile motion")).toBeTruthy();
    expect(screen.getByText("range: 33.2 m")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("launch angle"), { target: { value: "45" } });
    expect(onVariablesChange).toHaveBeenCalledWith({ launchAngleDeg: 45 });
  });

  test("localizes projectile-motion controls and measurements in Chinese", () => {
    render(
      <InclinedPlaneExperiment
        language="zh-CN"
        planned={{
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
        }}
        onVariablesChange={() => {}}
      />,
    );

    expect(screen.getByLabelText("发射角度")).toBeTruthy();
    expect(screen.getByText("射程：33.2 m")).toBeTruthy();
  });

  test("plays projectile-motion experiments with a moving marker", () => {
    render(
      <InclinedPlaneExperiment
        language="en"
        planned={{
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
        }}
        onVariablesChange={() => {}}
      />,
    );

    expect(screen.getByTestId("experiment-motion-marker").getAttribute("data-running")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Play Experiment" }));
    expect(screen.getByRole("button", { name: "Pause Experiment" })).toBeTruthy();
    expect(screen.getByTestId("experiment-motion-marker").getAttribute("data-running")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Reset Experiment" }));
    expect(screen.getByTestId("experiment-motion-marker").getAttribute("data-progress")).toBe("0");
  });

  test("changes projectile-motion animation when launch parameters change", async () => {
    const base = await getMotionSignature({
      plan: {
        concept: "projectile_motion",
        title: "Projectile motion",
        objective: "Explore launch speed and angle.",
        variables: {
          launchSpeedMps: 18,
          launchAngleDeg: 30,
          launchHeightM: 1,
          gravityMps2: 9.81,
        },
        guidingQuestions: ["Which angle goes farthest?"],
      },
      measurements: {
        flightTimeS: 2,
        rangeM: 30,
        maxHeightM: 5,
        finalSpeedMps: 18,
        willLand: true,
      },
      explanation: "A projectile combines horizontal and vertical motion.",
    });
    const changed = await getMotionSignature({
      plan: {
        concept: "projectile_motion",
        title: "Projectile motion",
        objective: "Explore launch speed and angle.",
        variables: {
          launchSpeedMps: 28,
          launchAngleDeg: 65,
          launchHeightM: 4,
          gravityMps2: 3.7,
        },
        guidingQuestions: ["Which angle goes farthest?"],
      },
      measurements: {
        flightTimeS: 7,
        rangeM: 90,
        maxHeightM: 30,
        finalSpeedMps: 28,
        willLand: true,
      },
      explanation: "A projectile combines horizontal and vertical motion.",
    });

    expect(base).not.toEqual(changed);
  });

  test("renders spring-oscillator controls and measurements", () => {
    const onVariablesChange = vi.fn();

    render(
      <InclinedPlaneExperiment
        language="en"
        planned={{
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
        }}
        onVariablesChange={onVariablesChange}
      />,
    );

    expect(screen.getByText("Spring oscillator")).toBeTruthy();
    expect(screen.getByText("period: 0.7 s")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("spring constant"), { target: { value: "120" } });
    expect(onVariablesChange).toHaveBeenCalledWith({ springConstantNpm: 120 });
  });

  test("changes spring animation when amplitude changes", async () => {
    const base = await getMotionSignature({
      plan: {
        concept: "spring_oscillator",
        title: "Spring oscillator",
        objective: "Explore mass and spring stiffness.",
        variables: {
          massKg: 1,
          springConstantNpm: 80,
          amplitudeM: 0.2,
          dampingRatio: 0.05,
        },
        guidingQuestions: ["How does mass change period?"],
      },
      measurements: {
        periodS: 0.7,
        angularFrequencyRadps: 8.94,
        maxSpeedMps: 1.79,
        energyJ: 1.6,
        willOscillate: true,
      },
      explanation: "A spring pulls the mass back toward equilibrium.",
    });
    const changed = await getMotionSignature({
      plan: {
        concept: "spring_oscillator",
        title: "Spring oscillator",
        objective: "Explore mass and spring stiffness.",
        variables: {
          massKg: 1,
          springConstantNpm: 80,
          amplitudeM: 1.2,
          dampingRatio: 0.05,
        },
        guidingQuestions: ["How does mass change period?"],
      },
      measurements: {
        periodS: 0.7,
        angularFrequencyRadps: 8.94,
        maxSpeedMps: 10.73,
        energyJ: 57.6,
        willOscillate: true,
      },
      explanation: "A spring pulls the mass back toward equilibrium.",
    });

    expect(base).not.toEqual(changed);
  });

  test("renders generic built-in template controls and measurements", async () => {
    const onVariablesChange = vi.fn();

    render(
      <InclinedPlaneExperiment
        language="en"
        planned={{
          plan: {
            concept: "ohms_law",
            title: "Ohm's law circuit",
            objective: "Explore voltage, resistance, current, and power.",
            variables: {
              voltageV: 12,
              resistanceOhm: 6,
            },
            guidingQuestions: ["How does voltage change current?", "How does resistance change current?"],
          },
          measurements: {
            currentA: 2,
            powerW: 24,
            conductanceS: 0.17,
          },
          explanation: "Current is voltage divided by resistance.",
        }}
        onVariablesChange={onVariablesChange}
      />,
    );

    expect(await screen.findByText("Ohm's law circuit")).toBeTruthy();
    expect(await screen.findByText("current: 2 A")).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("voltage"), { target: { value: "18" } });
    expect(onVariablesChange).toHaveBeenCalledWith({ voltageV: 18 });
  });

  test("localizes generic template controls and measurements in Chinese", async () => {
    render(
      <InclinedPlaneExperiment
        language="zh-CN"
        planned={{
          plan: {
            concept: "ohms_law",
            title: "Ohm's law circuit",
            objective: "Explore voltage, resistance, current, and power.",
            variables: {
              voltageV: 12,
              resistanceOhm: 6,
            },
            guidingQuestions: ["How does voltage change current?", "How does resistance change current?"],
          },
          measurements: {
            currentA: 2,
            powerW: 24,
            conductanceS: 0.17,
          },
          explanation: "Current is voltage divided by resistance.",
        }}
        onVariablesChange={() => {}}
      />,
    );

    expect(await screen.findByLabelText("电压")).toBeTruthy();
    expect(await screen.findByText("电流：2 A")).toBeTruthy();
  });

  test("plays generic built-in templates with a moving marker", async () => {
    render(
      <InclinedPlaneExperiment
        language="en"
        planned={{
          plan: {
            concept: "ohms_law",
            title: "Ohm's law circuit",
            objective: "Explore voltage, resistance, current, and power.",
            variables: {
              voltageV: 12,
              resistanceOhm: 6,
            },
            guidingQuestions: ["How does voltage change current?", "How does resistance change current?"],
          },
          measurements: {
            currentA: 2,
            powerW: 24,
            conductanceS: 0.17,
          },
          explanation: "Current is voltage divided by resistance.",
        }}
        onVariablesChange={() => {}}
      />,
    );

    expect(await screen.findByTestId("experiment-motion-marker")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Play Experiment" }));
    expect(screen.getByRole("button", { name: "Pause Experiment" })).toBeTruthy();
    expect(screen.getByTestId("experiment-motion-marker").getAttribute("data-running")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Reset Experiment" }));
    expect(screen.getByTestId("experiment-motion-marker").getAttribute("data-progress")).toBe("0");
  });

  test("renders buoyancy motion as the floating block instead of an extra ball", async () => {
    const { container } = render(
      <InclinedPlaneExperiment
        language="en"
        planned={genericPlan(
          "buoyancy",
          { objectVolumeL: 4, objectMassKg: 2, fluidDensityKgM3: 1000 },
          { buoyantForceN: 39.24, weightN: 19.62, netForceN: 19.62, willFloat: true },
        )}
        onVariablesChange={() => {}}
      />,
    );

    const marker = await screen.findByTestId("experiment-motion-marker");

    expect(marker.tagName.toLowerCase()).toBe("rect");
    expect(container.querySelector(".experiment-diagram circle")).toBeNull();
  });

  test.each([
    [
      "pendulum",
      { lengthM: 1, gravityMps2: 9.81, amplitudeDeg: 10, massKg: 1 },
      { lengthM: 4, gravityMps2: 9.81, amplitudeDeg: 35, massKg: 1 },
      { periodS: 2, frequencyHz: 0.5, maxSpeedMps: 1, tensionAtBottomN: 10 },
    ],
    [
      "circular_motion",
      { radiusM: 2, speedMps: 5, massKg: 1 },
      { radiusM: 8, speedMps: 16, massKg: 2 },
      { angularSpeedRadps: 2.5, centripetalAccelMps2: 12.5, centripetalForceN: 12.5, periodS: 2.5 },
    ],
    [
      "elastic_collision",
      { mass1Kg: 1, mass2Kg: 2, velocity1Mps: 10, velocity2Mps: -2 },
      { mass1Kg: 5, mass2Kg: 1, velocity1Mps: 4, velocity2Mps: -10 },
      { finalVelocity1Mps: -6, finalVelocity2Mps: 6, totalMomentumKgMps: 6, totalKineticEnergyJ: 54 },
    ],
    [
      "buoyancy",
      { objectVolumeL: 4, objectMassKg: 8, fluidDensityKgM3: 1000 },
      { objectVolumeL: 20, objectMassKg: 4, fluidDensityKgM3: 800 },
      { buoyantForceN: 39.24, weightN: 78.48, netForceN: -39.24, willFloat: false },
    ],
    [
      "lever_balance",
      { leftMassKg: 2, rightMassKg: 4, leftArmM: 1, rightArmM: 1 },
      { leftMassKg: 8, rightMassKg: 2, leftArmM: 2, rightArmM: 1 },
      { leftTorqueNm: 19.62, rightTorqueNm: 39.24, netTorqueNm: -19.62, balance: "right_down" },
    ],
    [
      "ohms_law",
      { voltageV: 6, resistanceOhm: 12 },
      { voltageV: 24, resistanceOhm: 3 },
      { currentA: 0.5, powerW: 3, conductanceS: 0.08 },
    ],
    [
      "ideal_gas",
      { molesMol: 1, temperatureK: 273, volumeL: 22.4 },
      { molesMol: 3, temperatureK: 450, volumeL: 10 },
      { pressureKpa: 101, pressureAtm: 1, thermalEnergyJ: 3405 },
    ],
    [
      "work_energy",
      { forceN: 10, distanceM: 2, angleDeg: 0, massKg: 1 },
      { forceN: 80, distanceM: 5, angleDeg: 60, massKg: 4 },
      { workJ: 20, kineticEnergyGainJ: 20, finalSpeedMps: 6.32 },
    ],
    [
      "wave_speed",
      { frequencyHz: 2, wavelengthM: 3, amplitudeM: 1 },
      { frequencyHz: 10, wavelengthM: 1, amplitudeM: 5 },
      { speedMps: 6, periodS: 0.5, angularFrequencyRadps: 12.57 },
    ],
    [
      "refraction",
      { incidentAngleDeg: 20, refractiveIndex1: 1, refractiveIndex2: 1.5 },
      { incidentAngleDeg: 70, refractiveIndex1: 1.5, refractiveIndex2: 1 },
      { refractedAngleDeg: 13.18, criticalAngleDeg: null, speedRatio: 0.67, totalInternalReflection: false },
    ],
    [
      "lens_imaging",
      { focalLengthCm: 10, objectDistanceCm: 30, objectHeightCm: 4 },
      { focalLengthCm: 20, objectDistanceCm: 35, objectHeightCm: 10 },
      { imageDistanceCm: 15, magnification: -0.5, imageHeightCm: -2, imageType: "real_inverted" },
    ],
    [
      "coulombs_law",
      { charge1MicroC: 2, charge2MicroC: -3, distanceM: 1 },
      { charge1MicroC: 8, charge2MicroC: 6, distanceM: 3 },
      { forceN: 0.05, potentialEnergyJ: -0.05, interaction: "attraction" },
    ],
    [
      "rc_circuit",
      { voltageV: 5, resistanceOhm: 1000, capacitanceMicroF: 100, timeMs: 50 },
      { voltageV: 24, resistanceOhm: 4000, capacitanceMicroF: 200, timeMs: 900 },
      { timeConstantMs: 100, capacitorVoltageV: 1.97, currentA: 0, chargeMicroC: 197 },
    ],
  ] as const)("changes %s generic animation when key variables change", async (concept, baseVariables, changedVariables, measurements) => {
    const base = await getMotionSignature(genericPlan(concept, baseVariables, measurements));
    const changed = await getMotionSignature(genericPlan(concept, changedVariables, measurements));

    expect(base).not.toEqual(changed);
  });

  test("renders the work-energy built-in template", async () => {
    render(
      <InclinedPlaneExperiment
        language="en"
        planned={{
          plan: {
            concept: "work_energy",
            title: "Work and energy",
            objective: "Explore force, distance, and kinetic energy.",
            variables: {
              forceN: 25,
              distanceM: 4,
              angleDeg: 0,
              massKg: 2,
            },
            guidingQuestions: ["When does force do work?", "How does work change speed?"],
          },
          measurements: {
            workJ: 100,
            kineticEnergyGainJ: 100,
            finalSpeedMps: 10,
          },
          explanation: "Work changes kinetic energy.",
        }}
        onVariablesChange={() => {}}
      />,
    );

    expect(await screen.findByText("Work and energy")).toBeTruthy();
    expect(await screen.findByText("work: 100 J")).toBeTruthy();
  });

  test("renders the expanded optics template", async () => {
    render(
      <InclinedPlaneExperiment
        language="en"
        planned={{
          plan: {
            concept: "lens_imaging",
            title: "Lens imaging",
            objective: "Explore focal length, object distance, and image position.",
            variables: {
              focalLengthCm: 10,
              objectDistanceCm: 30,
              objectHeightCm: 4,
            },
            guidingQuestions: ["When is the image inverted?", "How does distance change magnification?"],
          },
          measurements: {
            imageDistanceCm: 15,
            magnification: -0.5,
            imageHeightCm: -2,
            imageType: "real_inverted",
          },
          explanation: "The thin lens equation relates object and image distance.",
        }}
        onVariablesChange={() => {}}
      />,
    );

    expect(await screen.findByText("Lens imaging")).toBeTruthy();
    expect(await screen.findByText("image distance: 15 cm")).toBeTruthy();
    expect(await screen.findByText("image type: real inverted")).toBeTruthy();
  });
});
