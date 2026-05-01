import { describe, expect, test } from "vitest";

import { solveProjectileMotion } from "./projectile-motion";

describe("projectile-motion solver", () => {
  test("computes flight time, range, max height, and final speed", () => {
    const result = solveProjectileMotion({
      launchSpeedMps: 20,
      launchAngleDeg: 45,
      launchHeightM: 1,
      gravityMps2: 9.81,
    });

    expect(result.flightTimeS).toBeCloseTo(2.95, 2);
    expect(result.rangeM).toBeCloseTo(41.75, 2);
    expect(result.maxHeightM).toBeCloseTo(11.19, 2);
    expect(result.finalSpeedMps).toBeCloseTo(20.48, 2);
    expect(result.willLand).toBe(true);
  });
});
