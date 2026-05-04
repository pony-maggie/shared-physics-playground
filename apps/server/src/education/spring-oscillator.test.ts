import { describe, expect, test } from "vitest";

import { solveSpringOscillator } from "./spring-oscillator";

describe("spring-oscillator solver", () => {
  test("computes period, angular frequency, max speed, and energy", () => {
    const result = solveSpringOscillator({
      massKg: 2,
      springConstantNpm: 50,
      amplitudeM: 0.3,
      dampingRatio: 0.1,
    });

    expect(result.periodS).toBeCloseTo(1.26, 2);
    expect(result.angularFrequencyRadps).toBeCloseTo(4.97, 2);
    expect(result.maxSpeedMps).toBeCloseTo(1.49, 2);
    expect(result.energyJ).toBeCloseTo(2.25, 2);
    expect(result.willOscillate).toBe(true);
  });

  test("damping changes the observable oscillator period and frequency", () => {
    const undamped = solveSpringOscillator({
      massKg: 1,
      springConstantNpm: 80,
      amplitudeM: 0.4,
      dampingRatio: 0,
    });
    const damped = solveSpringOscillator({
      massKg: 1,
      springConstantNpm: 80,
      amplitudeM: 0.4,
      dampingRatio: 0.8,
    });

    expect(damped.periodS).toBeGreaterThan(undamped.periodS);
    expect(damped.angularFrequencyRadps).toBeLessThan(undamped.angularFrequencyRadps);
    expect(damped.maxSpeedMps).toBeLessThan(undamped.maxSpeedMps);
  });
});
