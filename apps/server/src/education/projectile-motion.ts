import type { ProjectileMotionVariables } from "../../../../packages/prompt-contracts/src/simulation-spec";

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export type ProjectileMotionResult = {
  flightTimeS: number;
  rangeM: number;
  maxHeightM: number;
  finalSpeedMps: number;
  willLand: boolean;
};

export function solveProjectileMotion(input: ProjectileMotionVariables): ProjectileMotionResult {
  const angleRad = (input.launchAngleDeg * Math.PI) / 180;
  const horizontalVelocity = input.launchSpeedMps * Math.cos(angleRad);
  const verticalVelocity = input.launchSpeedMps * Math.sin(angleRad);
  const discriminant = verticalVelocity ** 2 + 2 * input.gravityMps2 * input.launchHeightM;
  const flightTime = (verticalVelocity + Math.sqrt(discriminant)) / input.gravityMps2;
  const range = horizontalVelocity * flightTime;
  const maxHeight = input.launchHeightM + verticalVelocity ** 2 / (2 * input.gravityMps2);
  const finalVerticalVelocity = verticalVelocity - input.gravityMps2 * flightTime;
  const finalSpeed = Math.hypot(horizontalVelocity, finalVerticalVelocity);

  return {
    flightTimeS: round(flightTime),
    rangeM: round(range),
    maxHeightM: round(maxHeight),
    finalSpeedMps: round(finalSpeed),
    willLand: true,
  };
}
