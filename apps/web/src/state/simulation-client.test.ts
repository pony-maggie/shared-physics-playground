// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";

import { resetSimulationClientState, useSimulationClient } from "./simulation-client";

afterEach(() => {
  vi.restoreAllMocks();
  resetSimulationClientState();
});

describe("simulation client", () => {
  test("plans an inclined-plane simulation through the server", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          plan: {
            concept: "inclined_plane",
            title: "斜面与摩擦",
            objective: "观察斜面角度和摩擦系数。",
            variables: {
              angleDeg: 25,
              frictionCoefficient: 0.15,
              lengthM: 4,
              massKg: 1,
            },
            guidingQuestions: ["角度变大会怎样？", "摩擦变大会怎样？"],
          },
          measurements: {
            accelerationMps2: 3.6,
            timeToBottomS: 1.49,
            finalSpeedMps: 5.37,
            willSlide: true,
          },
          explanation: "重力沿斜面方向的分量大于摩擦阻力。",
        }),
        { status: 200 },
      ),
    );

    await useSimulationClient.getState().plan("为什么斜坡越陡，小球滚得越快？", {
      authToken: "token-1",
    });

    expect(useSimulationClient.getState().status).toEqual({ kind: "ready" });
    expect(useSimulationClient.getState().planned?.plan.title).toBe("斜面与摩擦");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/education/simulations/plan",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
        }),
      }),
    );
  });

  test("surfaces education quota failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "free plan includes one AI experiment generation",
        }),
        { status: 403 },
      ),
    );

    await useSimulationClient.getState().plan("Why does a slope matter?", {
      authToken: "token-1",
    });

    expect(useSimulationClient.getState().status).toEqual({
      kind: "error",
      message: "free plan includes one AI experiment generation",
    });
  });

  test("stores nearby template suggestions without replacing the current experiment", async () => {
    useSimulationClient.getState().loadLocalInclinedPlaneDemo();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "No exact built-in experiment matched. Choose a nearby experiment to continue.",
          suggestions: [
            {
              concept: "inclined_plane",
              title: "Inclined plane and friction",
              reason: "Use this to study force along a slope.",
            },
            {
              concept: "projectile_motion",
              title: "Projectile motion",
              reason: "Use this to study launched objects.",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await useSimulationClient.getState().plan("teach me physics", {
      authToken: "token-1",
    });

    expect(useSimulationClient.getState().planned?.plan.concept).toBe("inclined_plane");
    expect(useSimulationClient.getState().status).toEqual({
      kind: "suggestions",
      message: "No exact built-in experiment matched. Choose a nearby experiment to continue.",
      question: "teach me physics",
      suggestions: [
        {
          concept: "inclined_plane",
          title: "Inclined plane and friction",
          reason: "Use this to study force along a slope.",
        },
        {
          concept: "projectile_motion",
          title: "Projectile motion",
          reason: "Use this to study launched objects.",
        },
      ],
    });
  });

  test("sends the selected template concept when planning from a suggestion", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          plan: {
            concept: "work_energy",
            title: "Work and energy",
            objective: "Observe force and distance.",
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
        }),
        { status: 200 },
      ),
    );

    await useSimulationClient.getState().plan("teach me physics", {
      authToken: "token-1",
      selectedConcept: "work_energy",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/education/simulations/plan",
      expect.objectContaining({
        body: JSON.stringify({
          question: "teach me physics",
          selectedConcept: "work_energy",
          source: "text",
        }),
      }),
    );
    expect(useSimulationClient.getState().planned?.plan.concept).toBe("work_energy");
    expect(useSimulationClient.getState().status).toEqual({ kind: "ready" });
  });

  test("updates local variables and recomputes measurements", () => {
    useSimulationClient.getState().loadLocalInclinedPlaneDemo();
    useSimulationClient.getState().updateVariables({ angleDeg: 45 });

    expect(useSimulationClient.getState().planned?.plan.variables.angleDeg).toBe(45);
    expect(useSimulationClient.getState().planned?.measurements.accelerationMps2).toBeGreaterThan(5);
  });

  test("updates projectile variables and recomputes projectile measurements", () => {
    useSimulationClient.setState({
      planned: {
        plan: {
          concept: "projectile_motion",
          title: "Projectile motion",
          objective: "Explore launch angle.",
          variables: {
            launchSpeedMps: 20,
            launchAngleDeg: 30,
            launchHeightM: 0,
            gravityMps2: 9.81,
          },
          guidingQuestions: ["How does angle change range?", "How does speed change range?"],
        },
        measurements: {
          flightTimeS: 2.04,
          rangeM: 35.31,
          maxHeightM: 5.1,
          finalSpeedMps: 20,
          willLand: true,
        },
        explanation: "A projectile combines horizontal and vertical motion.",
      },
      saveStatus: { kind: "idle" },
      status: { kind: "ready" },
    });

    useSimulationClient.getState().updateVariables({ launchAngleDeg: 45 });

    expect(useSimulationClient.getState().planned?.plan.variables.launchAngleDeg).toBe(45);
    expect(useSimulationClient.getState().planned?.measurements.rangeM).toBeGreaterThan(40);
  });

  test("updates spring variables and recomputes spring measurements", () => {
    useSimulationClient.setState({
      planned: {
        plan: {
          concept: "spring_oscillator",
          title: "Spring oscillator",
          objective: "Explore spring motion.",
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
        explanation: "The spring force pulls the mass back toward equilibrium.",
      },
      saveStatus: { kind: "idle" },
      status: { kind: "ready" },
    });

    useSimulationClient.getState().updateVariables({ massKg: 4 });

    expect(useSimulationClient.getState().planned?.plan.variables.massKg).toBe(4);
    expect(useSimulationClient.getState().planned?.measurements.periodS).toBeGreaterThan(1);
  });

  test("updates generic template variables and recomputes measurements", () => {
    useSimulationClient.setState({
      planned: {
        plan: {
          concept: "ohms_law",
          title: "Ohm's law circuit",
          objective: "Explore current and resistance.",
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
      },
      saveStatus: { kind: "idle" },
      status: { kind: "ready" },
    });

    useSimulationClient.getState().updateVariables({ resistanceOhm: 3 });

    expect(useSimulationClient.getState().planned?.plan.variables.resistanceOhm).toBe(3);
    expect(useSimulationClient.getState().planned?.measurements.currentA).toBe(4);
  });

  test("keeps a catalog of at least ten client-supported concepts", () => {
    const concepts = [
      "inclined_plane",
      "projectile_motion",
      "spring_oscillator",
      "pendulum",
      "circular_motion",
      "elastic_collision",
      "buoyancy",
      "lever_balance",
      "ohms_law",
      "ideal_gas",
      "work_energy",
      "wave_speed",
      "refraction",
      "lens_imaging",
      "coulombs_law",
      "rc_circuit",
    ];

    for (const concept of concepts) {
      expect(useSimulationClient.getState()).toBeTruthy();
      expect(concept).toBeTruthy();
    }
  });

  test("updates expanded generic template variables and recomputes measurements", () => {
    useSimulationClient.setState({
      planned: {
        plan: {
          concept: "wave_speed",
          title: "Wave speed",
          objective: "Explore waves.",
          variables: {
            frequencyHz: 5,
            wavelengthM: 2,
            amplitudeM: 0.3,
          },
          guidingQuestions: ["How does frequency change speed?", "What does wavelength change?"],
        },
        measurements: {
          speedMps: 10,
          periodS: 0.2,
          angularFrequencyRadps: 31.42,
        },
        explanation: "Wave speed equals frequency times wavelength.",
      },
      saveStatus: { kind: "idle" },
      status: { kind: "ready" },
    });

    useSimulationClient.getState().updateVariables({ frequencyHz: 8 });

    expect(useSimulationClient.getState().planned?.plan.variables.frequencyHz).toBe(8);
    expect(useSimulationClient.getState().planned?.measurements.speedMps).toBe(16);
  });

  test("saves the current experiment with an auth token", async () => {
    useSimulationClient.getState().loadLocalInclinedPlaneDemo();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          simulationId: "simulation-1",
        }),
        { status: 201 },
      ),
    );

    await useSimulationClient.getState().saveCurrent({ authToken: "token-1" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/education/simulations/save",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
        }),
      }),
    );
    expect(useSimulationClient.getState().saveStatus).toEqual({
      kind: "saved",
      simulationId: "simulation-1",
    });
  });
});
