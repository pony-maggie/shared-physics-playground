import { describe, expect, test } from "vitest";

import { planSimulation } from "./simulation-planner";

describe("simulation planner", () => {
  test("maps a Chinese inclined-plane question to an inclined-plane plan", () => {
    const result = planSimulation("为什么斜坡越陡，小球滚得越快？");

    expect(result.plan.concept).toBe("inclined_plane");
    expect(result.plan.variables.angleDeg).toBe(25);
    expect(result.measurements.willSlide).toBe(true);
    expect(result.explanation).toContain("重力沿斜面方向");
  });

  test("maps an English slope question to an inclined-plane plan", () => {
    const result = planSimulation("Why does a ball roll faster on a steeper slope?");

    expect(result.plan.concept).toBe("inclined_plane");
    expect(result.plan.title).toBe("Inclined plane and friction");
  });

  test("maps projectile questions to a projectile-motion plan", () => {
    const result = planSimulation("How far will a ball fly if I launch it upward?");

    expect(result.plan.concept).toBe("projectile_motion");
    expect(result.plan.variables.launchSpeedMps).toBe(18);
    expect(result.measurements.rangeM).toBeGreaterThan(20);
    expect(result.explanation).toContain("horizontal");
  });

  test("maps spring questions to a spring-oscillator plan", () => {
    const result = planSimulation("为什么弹簧振子会来回运动？");

    expect(result.plan.concept).toBe("spring_oscillator");
    expect(result.plan.variables.springConstantNpm).toBe(80);
    expect(result.measurements.periodS).toBeGreaterThan(0);
    expect(result.explanation).toContain("弹簧");
  });

  test.each([
    ["How does a pendulum clock keep time?", "pendulum", "Pendulum"],
    ["Why does a car feel force when turning in a circle?", "circular_motion", "Circular motion"],
    ["What happens when two carts collide elastically?", "elastic_collision", "Elastic collision"],
    ["为什么木块在水里会上浮？", "buoyancy", "浮力"],
    ["How can a lever balance two different masses?", "lever_balance", "Lever balance"],
    ["How much current flows through a resistor?", "ohms_law", "Ohm"],
    ["What pressure does a gas make in a container?", "ideal_gas", "Ideal gas"],
    ["How much work does a force do on a box?", "work_energy", "Work and energy"],
    ["How are wavelength and frequency related in a wave?", "wave_speed", "Wave speed"],
    ["Why does light bend when it enters glass?", "refraction", "Refraction"],
    ["Where will a lens form an image?", "lens_imaging", "Lens imaging"],
    ["How strong is the electric force between two charges?", "coulombs_law", "Coulomb"],
    ["How fast does a capacitor charge in an RC circuit?", "rc_circuit", "RC circuit"],
  ])("maps %s to the %s template", (question, concept, titleFragment) => {
    const result = planSimulation(question);

    expect(result.plan.concept).toBe(concept);
    expect(result.plan.title).toContain(titleFragment);
    expect(result.unsupportedReason).toBeUndefined();
  });

  test("uses schema-valid model plans for any built-in template", () => {
    const result = planSimulation("Build an electric circuit lab", {
      modelPlan: {
        concept: "ohms_law",
        title: "Student circuit lab",
        objective: "Tune voltage and resistance.",
        variables: {
          voltageV: 9,
          resistanceOhm: 3,
        },
        guidingQuestions: [
          "How does resistance change current?",
          "How does voltage change power?",
        ],
      },
    });

    expect(result.plan.concept).toBe("ohms_law");
    expect(result.plan.title).toBe("Student circuit lab");
    expect(result.measurements.currentA).toBe(3);
  });

  test("uses a schema-valid model-selected template plan", () => {
    const result = planSimulation("Build a launch experiment", {
      modelPlan: {
        concept: "projectile_motion",
        title: "Student launch lab",
        objective: "Tune speed and angle.",
        variables: {
          launchSpeedMps: 24,
          launchAngleDeg: 45,
          launchHeightM: 0,
          gravityMps2: 9.81,
        },
        guidingQuestions: [
          "Which angle makes the range largest?",
          "How does speed affect range?",
        ],
      },
    });

    expect(result.plan.title).toBe("Student launch lab");
    expect(result.plan.concept).toBe("projectile_motion");
    expect(result.measurements.rangeM).toBeGreaterThan(55);
  });

  test("falls back to built-in routing when a model-selected plan is unsafe", () => {
    const result = planSimulation("How far will a ball fly?", {
      modelPlan: {
        concept: "projectile_motion",
        title: "Unsafe launch lab",
        objective: "Unsafe",
        variables: {
          launchSpeedMps: 2000,
          launchAngleDeg: 45,
          launchHeightM: 0,
          gravityMps2: 9.81,
        },
        guidingQuestions: [
          "Which angle makes the range largest?",
          "How does speed affect range?",
        ],
      },
    });

    expect(result.plan.concept).toBe("projectile_motion");
    expect(result.plan.title).toBe("Projectile motion");
    expect(result.plan.variables.launchSpeedMps).toBe(18);
  });

  test("returns nearby built-in template suggestions for unsupported questions when requested", () => {
    const result = planSimulation("teach me physics", {
      suggestWhenUnsupported: true,
    });

    expect("suggestions" in result).toBe(true);
    if (!("suggestions" in result)) {
      throw new Error("expected suggestions");
    }

    expect(result.unsupportedReason).toBe("No built-in template matched the question.");
    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions.map((suggestion) => suggestion.concept)).toEqual([
      "inclined_plane",
      "projectile_motion",
      "work_energy",
    ]);
  });

  test("uses the inclined-plane demo as the safe default when suggestions are not requested", () => {
    const result = planSimulation("teach me physics");

    expect(result.plan.concept).toBe("inclined_plane");
    expect(result.unsupportedReason).toBe("No built-in template matched the question, so the inclined-plane demo was used.");
  });

  test("creates a selected built-in template after a user chooses a suggestion", () => {
    const result = planSimulation("teach me physics", {
      selectedConcept: "work_energy",
      suggestWhenUnsupported: true,
    });

    expect("plan" in result).toBe(true);
    if (!("plan" in result)) {
      throw new Error("expected a planned simulation");
    }

    expect(result.plan.concept).toBe("work_energy");
    expect(result.plan.title).toBe("Work and energy");
  });
});
