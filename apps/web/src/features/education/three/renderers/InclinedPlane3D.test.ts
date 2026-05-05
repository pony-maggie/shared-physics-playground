import { describe, expect, test } from "vitest";

import { createInclinedPlane3DLayout } from "./InclinedPlane3D";

describe("InclinedPlane3D layout", () => {
  test("keeps the ball on the ramp local surface through playback", () => {
    const start = createInclinedPlane3DLayout({ angleDeg: 25, progress: 0 });
    const end = createInclinedPlane3DLayout({ angleDeg: 25, progress: 1 });

    expect(start.rampRotationZ).toBeCloseTo((-25 * Math.PI) / 180);
    expect(start.ballPosition[1]).toBeCloseTo(end.ballPosition[1]);
    expect(start.ballPosition[0]).toBeLessThan(end.ballPosition[0]);
    expect(start.showTrailLine).toBe(false);
    expect(end.showTrailLine).toBe(false);
  });
});
