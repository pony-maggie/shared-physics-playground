import { describe, expect, test } from "vitest";

import { SIMULATION_CONCEPTS, SimulationPlanSchema } from "./simulation-spec";

describe("simulation spec", () => {
  test("exposes at least sixteen built-in simulation concepts", () => {
    expect(SIMULATION_CONCEPTS.length).toBeGreaterThanOrEqual(16);
    expect(SIMULATION_CONCEPTS).toContain("pendulum");
    expect(SIMULATION_CONCEPTS).toContain("ohms_law");
    expect(SIMULATION_CONCEPTS).toContain("ideal_gas");
    expect(SIMULATION_CONCEPTS).toContain("work_energy");
    expect(SIMULATION_CONCEPTS).toContain("wave_speed");
    expect(SIMULATION_CONCEPTS).toContain("refraction");
    expect(SIMULATION_CONCEPTS).toContain("lens_imaging");
    expect(SIMULATION_CONCEPTS).toContain("coulombs_law");
    expect(SIMULATION_CONCEPTS).toContain("rc_circuit");
  });

  test("parses an inclined-plane simulation plan", () => {
    expect(
      SimulationPlanSchema.parse({
        concept: "inclined_plane",
        title: "Inclined plane and friction",
        objective: "Observe how slope angle and friction change acceleration.",
        variables: {
          angleDeg: 25,
          frictionCoefficient: 0.15,
          lengthM: 4,
          massKg: 1,
        },
        guidingQuestions: [
          "What happens when the angle increases?",
          "What happens when friction increases?",
          "Does mass change the acceleration in this simplified model?",
        ],
      }),
    ).toEqual({
      concept: "inclined_plane",
      title: "Inclined plane and friction",
      objective: "Observe how slope angle and friction change acceleration.",
      variables: {
        angleDeg: 25,
        frictionCoefficient: 0.15,
        lengthM: 4,
        massKg: 1,
      },
      guidingQuestions: [
        "What happens when the angle increases?",
        "What happens when friction increases?",
        "Does mass change the acceleration in this simplified model?",
      ],
    });
  });

  test("rejects unsafe inclined-plane variables", () => {
    expect(() =>
      SimulationPlanSchema.parse({
        concept: "inclined_plane",
        title: "Bad",
        objective: "Bad",
        variables: {
          angleDeg: 0,
          frictionCoefficient: -1,
          lengthM: 0,
          massKg: 0,
        },
        guidingQuestions: ["What changes?"],
      }),
    ).toThrowError("angleDeg must be between 5 and 60");
  });

  test("parses a projectile-motion simulation plan", () => {
    expect(
      SimulationPlanSchema.parse({
        concept: "projectile_motion",
        title: "Projectile motion",
        objective: "Explore launch angle and speed.",
        variables: {
          launchSpeedMps: 18,
          launchAngleDeg: 40,
          launchHeightM: 1,
          gravityMps2: 9.81,
        },
        guidingQuestions: [
          "Which launch angle sends the projectile farthest?",
          "How does speed change range?",
        ],
      }),
    ).toEqual({
      concept: "projectile_motion",
      title: "Projectile motion",
      objective: "Explore launch angle and speed.",
      variables: {
        launchSpeedMps: 18,
        launchAngleDeg: 40,
        launchHeightM: 1,
        gravityMps2: 9.81,
      },
      guidingQuestions: [
        "Which launch angle sends the projectile farthest?",
        "How does speed change range?",
      ],
    });
  });

  test("parses a spring-oscillator simulation plan", () => {
    expect(
      SimulationPlanSchema.parse({
        concept: "spring_oscillator",
        title: "Spring oscillator",
        objective: "Explore mass, spring strength, and amplitude.",
        variables: {
          massKg: 1.2,
          springConstantNpm: 80,
          amplitudeM: 0.4,
          dampingRatio: 0.05,
        },
        guidingQuestions: [
          "How does mass change the period?",
          "How does spring stiffness change the motion?",
        ],
      }),
    ).toMatchObject({
      concept: "spring_oscillator",
      variables: {
        massKg: 1.2,
        springConstantNpm: 80,
        amplitudeM: 0.4,
        dampingRatio: 0.05,
      },
    });
  });

  test.each([
    [
      "pendulum",
      {
        lengthM: 2,
        gravityMps2: 9.81,
        amplitudeDeg: 12,
        massKg: 1,
      },
    ],
    [
      "circular_motion",
      {
        radiusM: 3,
        speedMps: 12,
        massKg: 2,
      },
    ],
    [
      "elastic_collision",
      {
        mass1Kg: 1,
        mass2Kg: 2,
        velocity1Mps: 6,
        velocity2Mps: -1,
      },
    ],
    [
      "buoyancy",
      {
        objectVolumeL: 3,
        objectMassKg: 2,
        fluidDensityKgM3: 1000,
      },
    ],
    [
      "lever_balance",
      {
        leftMassKg: 4,
        rightMassKg: 3,
        leftArmM: 1.2,
        rightArmM: 1.6,
      },
    ],
    [
      "ohms_law",
      {
        voltageV: 12,
        resistanceOhm: 6,
      },
    ],
    [
      "ideal_gas",
      {
        molesMol: 1,
        temperatureK: 300,
        volumeL: 24,
      },
    ],
    [
      "work_energy",
      {
        forceN: 25,
        distanceM: 4,
        angleDeg: 0,
        massKg: 2,
      },
    ],
    [
      "wave_speed",
      {
        frequencyHz: 5,
        wavelengthM: 2,
        amplitudeM: 0.3,
      },
    ],
    [
      "refraction",
      {
        incidentAngleDeg: 30,
        refractiveIndex1: 1,
        refractiveIndex2: 1.5,
      },
    ],
    [
      "lens_imaging",
      {
        focalLengthCm: 10,
        objectDistanceCm: 30,
        objectHeightCm: 4,
      },
    ],
    [
      "coulombs_law",
      {
        charge1MicroC: 2,
        charge2MicroC: -3,
        distanceM: 0.5,
      },
    ],
    [
      "rc_circuit",
      {
        voltageV: 9,
        resistanceOhm: 1000,
        capacitanceMicroF: 100,
        timeMs: 100,
      },
    ],
  ])("parses a %s simulation plan", (concept, variables) => {
    expect(
      SimulationPlanSchema.parse({
        concept,
        title: `${concept} lab`,
        objective: `Explore ${concept}.`,
        variables,
        guidingQuestions: [
          "Which variable changes the result most?",
          "What stays constant in this model?",
        ],
      }),
    ).toMatchObject({
      concept,
      variables,
    });
  });
});
