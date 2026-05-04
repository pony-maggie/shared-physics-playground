import { describe, expect, test } from "vitest";

import {
  SIMULATION_CONCEPTS,
  type SimulationPlan,
} from "../../../../../packages/prompt-contracts/src/simulation-spec";
import { createLessonFlow } from "./lesson-flow";

function planFor(concept: SimulationPlan["concept"]): SimulationPlan {
  const common = {
    title: concept,
    objective: "Observe the relationship.",
    guidingQuestions: ["What changes?", "Why does it change?"],
  };

  switch (concept) {
    case "inclined_plane":
      return {
        ...common,
        concept,
        variables: { angleDeg: 25, frictionCoefficient: 0.1, lengthM: 4, massKg: 1 },
      };
    case "projectile_motion":
      return {
        ...common,
        concept,
        variables: {
          gravityMps2: 9.81,
          launchAngleDeg: 40,
          launchHeightM: 1,
          launchSpeedMps: 20,
        },
      };
    case "spring_oscillator":
      return {
        ...common,
        concept,
        variables: { amplitudeM: 0.4, dampingRatio: 0.05, massKg: 1, springConstantNpm: 80 },
      };
    case "pendulum":
      return {
        ...common,
        concept,
        variables: { amplitudeDeg: 12, gravityMps2: 9.81, lengthM: 2, massKg: 1 },
      };
    case "circular_motion":
      return { ...common, concept, variables: { massKg: 1, radiusM: 3, speedMps: 6 } };
    case "elastic_collision":
      return {
        ...common,
        concept,
        variables: { mass1Kg: 1, mass2Kg: 2, velocity1Mps: 4, velocity2Mps: -1 },
      };
    case "buoyancy":
      return {
        ...common,
        concept,
        variables: { fluidDensityKgM3: 1000, objectMassKg: 4, objectVolumeL: 10 },
      };
    case "lever_balance":
      return {
        ...common,
        concept,
        variables: { leftArmM: 2, leftMassKg: 3, rightArmM: 3, rightMassKg: 2 },
      };
    case "ohms_law":
      return { ...common, concept, variables: { resistanceOhm: 6, voltageV: 12 } };
    case "ideal_gas":
      return { ...common, concept, variables: { molesMol: 1, temperatureK: 300, volumeL: 20 } };
    case "work_energy":
      return { ...common, concept, variables: { angleDeg: 0, distanceM: 5, forceN: 20, massKg: 2 } };
    case "wave_speed":
      return { ...common, concept, variables: { amplitudeM: 0.5, frequencyHz: 2, wavelengthM: 3 } };
    case "refraction":
      return {
        ...common,
        concept,
        variables: { incidentAngleDeg: 35, refractiveIndex1: 1, refractiveIndex2: 1.5 },
      };
    case "lens_imaging":
      return {
        ...common,
        concept,
        variables: { focalLengthCm: 10, objectDistanceCm: 30, objectHeightCm: 5 },
      };
    case "coulombs_law":
      return {
        ...common,
        concept,
        variables: { charge1MicroC: 2, charge2MicroC: -3, distanceM: 0.5 },
      };
    case "rc_circuit":
      return {
        ...common,
        concept,
        variables: { capacitanceMicroF: 100, resistanceOhm: 1000, timeMs: 50, voltageV: 5 },
      };
  }
}

describe("createLessonFlow", () => {
  test("creates five complete lesson steps for every built-in concept", () => {
    for (const concept of SIMULATION_CONCEPTS) {
      const flow = createLessonFlow({
        language: "en",
        measurements: {},
        plan: planFor(concept),
      });

      expect(flow.concept).toBe(concept);
      expect(flow.steps.map((step) => step.id)).toEqual([
        "predict",
        "run",
        "measure",
        "explain",
        "try",
      ]);
      for (const step of flow.steps) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.prompt.length).toBeGreaterThan(0);
        expect(step.focusRoles.length).toBeGreaterThan(0);
      }
      expect(flow.steps.find((step) => step.id === "try")?.variation).toBeDefined();
    }
  });

  test("localizes step titles in Chinese", () => {
    const flow = createLessonFlow({
      language: "zh-CN",
      measurements: {},
      plan: planFor("inclined_plane"),
    });

    expect(flow.steps.map((step) => step.title)).toEqual([
      "预测",
      "运行",
      "测量",
      "解释",
      "试试变体",
    ]);
  });
});
