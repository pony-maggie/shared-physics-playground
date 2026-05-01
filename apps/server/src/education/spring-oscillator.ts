import type { SpringOscillatorVariables } from "../../../../packages/prompt-contracts/src/simulation-spec";

function round(value: number): number {
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
  const angularFrequency = Math.sqrt(input.springConstantNpm / input.massKg);
  const period = (2 * Math.PI) / angularFrequency;

  return {
    periodS: round(period),
    angularFrequencyRadps: round(angularFrequency),
    maxSpeedMps: round(input.amplitudeM * angularFrequency),
    energyJ: round(0.5 * input.springConstantNpm * input.amplitudeM ** 2),
    willOscillate: input.dampingRatio < 1,
  };
}
