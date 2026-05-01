import type { InclinedPlaneVariables } from "../../../../packages/prompt-contracts/src/simulation-spec";

const GRAVITY_MPS2 = 9.81;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export type InclinedPlaneResult = {
  accelerationMps2: number;
  timeToBottomS: number | null;
  finalSpeedMps: number;
  willSlide: boolean;
};

export function solveInclinedPlane(input: InclinedPlaneVariables): InclinedPlaneResult {
  const angleRad = (input.angleDeg * Math.PI) / 180;
  const rawAcceleration =
    GRAVITY_MPS2 *
    (Math.sin(angleRad) - input.frictionCoefficient * Math.cos(angleRad));
  const acceleration = Math.max(0, rawAcceleration);

  if (acceleration === 0) {
    return {
      accelerationMps2: 0,
      timeToBottomS: null,
      finalSpeedMps: 0,
      willSlide: false,
    };
  }

  return {
    accelerationMps2: round(acceleration),
    timeToBottomS: round(Math.sqrt((2 * input.lengthM) / acceleration)),
    finalSpeedMps: round(Math.sqrt(2 * acceleration * input.lengthM)),
    willSlide: true,
  };
}
