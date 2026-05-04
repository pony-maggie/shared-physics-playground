import type { SpringOscillatorVariables } from "../../../../packages/prompt-contracts/src/simulation-spec";

function round(value: number): number {
  if (value !== 0 && Math.abs(value) < 0.01) {
    return Math.round(value * 10000) / 10000;
  }

  return Math.round(value * 100) / 100;
}

export type SpringOscillatorResult = {
  periodS: number;
  angularFrequencyRadps: number;
  maxSpeedMps: number;
  energyJ: number;
  willOscillate: boolean;
};

export function solveSpringOscillator(input: SpringOscillatorVariables): SpringOscillatorResult {
  const naturalAngularFrequency = Math.sqrt(input.springConstantNpm / input.massKg);
  const willOscillate = input.dampingRatio < 1;
  const angularFrequency = willOscillate
    ? naturalAngularFrequency * Math.sqrt(1 - input.dampingRatio ** 2)
    : 0;
  const period = angularFrequency > 0 ? (2 * Math.PI) / angularFrequency : 0;

  return {
    periodS: round(period),
    angularFrequencyRadps: round(angularFrequency),
    maxSpeedMps: round(input.amplitudeM * angularFrequency),
    energyJ: round(0.5 * input.springConstantNpm * input.amplitudeM ** 2),
    willOscillate,
  };
}
