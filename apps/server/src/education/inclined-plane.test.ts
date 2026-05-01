import { describe, expect, test } from "vitest";

import { solveInclinedPlane } from "./inclined-plane";

describe("inclined-plane solver", () => {
  test("computes acceleration, travel time, and final speed", () => {
    const result = solveInclinedPlane({
      angleDeg: 30,
      frictionCoefficient: 0.1,
      lengthM: 4,
      massKg: 1,
    });

    expect(result.accelerationMps2).toBeCloseTo(4.06, 2);
    expect(result.timeToBottomS).toBeCloseTo(1.4, 2);
    expect(result.finalSpeedMps).toBeCloseTo(5.7, 2);
    expect(result.willSlide).toBe(true);
  });

  test("reports no sliding when friction cancels downslope acceleration", () => {
    const result = solveInclinedPlane({
      angleDeg: 10,
      frictionCoefficient: 0.8,
      lengthM: 4,
      massKg: 1,
    });

    expect(result.accelerationMps2).toBe(0);
    expect(result.timeToBottomS).toBeNull();
    expect(result.finalSpeedMps).toBe(0);
    expect(result.willSlide).toBe(false);
  });
});
