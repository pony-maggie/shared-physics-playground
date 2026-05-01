import type {
  BuoyancyVariables,
  CircularMotionVariables,
  CoulombsLawVariables,
  ElasticCollisionVariables,
  IdealGasVariables,
  LeverBalanceVariables,
  LensImagingVariables,
  OhmsLawVariables,
  PendulumVariables,
  RcCircuitVariables,
  RefractionVariables,
  WaveSpeedVariables,
  WorkEnergyVariables,
} from "../../../../packages/prompt-contracts/src/simulation-spec";

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export type PendulumResult = {
  periodS: number;
  frequencyHz: number;
  maxSpeedMps: number;
  tensionAtBottomN: number;
};

export type CircularMotionResult = {
  angularSpeedRadps: number;
  centripetalAccelMps2: number;
  centripetalForceN: number;
  periodS: number;
};

export type ElasticCollisionResult = {
  finalVelocity1Mps: number;
  finalVelocity2Mps: number;
  totalMomentumKgMps: number;
  totalKineticEnergyJ: number;
};

export type BuoyancyResult = {
  buoyantForceN: number;
  weightN: number;
  netForceN: number;
  willFloat: boolean;
};

export type LeverBalanceResult = {
  leftTorqueNm: number;
  rightTorqueNm: number;
  netTorqueNm: number;
  balance: "balanced" | "left_down" | "right_down";
};

export type OhmsLawResult = {
  currentA: number;
  powerW: number;
  conductanceS: number;
};

export type IdealGasResult = {
  pressureKpa: number;
  pressureAtm: number;
  thermalEnergyJ: number;
};

export type WorkEnergyResult = {
  workJ: number;
  kineticEnergyGainJ: number;
  finalSpeedMps: number;
};

export type WaveSpeedResult = {
  speedMps: number;
  periodS: number;
  angularFrequencyRadps: number;
};

export type RefractionResult = {
  refractedAngleDeg: number | null;
  criticalAngleDeg: number | null;
  speedRatio: number;
  totalInternalReflection: boolean;
};

export type LensImagingResult = {
  imageDistanceCm: number | null;
  magnification: number | null;
  imageHeightCm: number | null;
  imageType: "real_inverted" | "virtual_upright" | "at_infinity";
};

export type CoulombsLawResult = {
  forceN: number;
  potentialEnergyJ: number;
  interaction: "attraction" | "repulsion" | "neutral";
};

export type RcCircuitResult = {
  timeConstantMs: number;
  capacitorVoltageV: number;
  currentA: number;
  chargeMicroC: number;
};

export type AdditionalTemplateResult =
  | PendulumResult
  | CircularMotionResult
  | ElasticCollisionResult
  | BuoyancyResult
  | LeverBalanceResult
  | OhmsLawResult
  | IdealGasResult
  | WorkEnergyResult
  | WaveSpeedResult
  | RefractionResult
  | LensImagingResult
  | CoulombsLawResult
  | RcCircuitResult;

export function solvePendulum(input: PendulumVariables): PendulumResult {
  const period = 2 * Math.PI * Math.sqrt(input.lengthM / input.gravityMps2);
  const amplitudeRad = (input.amplitudeDeg * Math.PI) / 180;
  const heightDrop = input.lengthM * (1 - Math.cos(amplitudeRad));
  const maxSpeed = Math.sqrt(2 * input.gravityMps2 * heightDrop);

  return {
    periodS: round(period),
    frequencyHz: round(1 / period),
    maxSpeedMps: round(maxSpeed),
    tensionAtBottomN: round(input.massKg * input.gravityMps2 + input.massKg * maxSpeed ** 2 / input.lengthM),
  };
}

export function solveCircularMotion(input: CircularMotionVariables): CircularMotionResult {
  const angularSpeed = input.speedMps / input.radiusM;
  const centripetalAcceleration = input.speedMps ** 2 / input.radiusM;

  return {
    angularSpeedRadps: round(angularSpeed),
    centripetalAccelMps2: round(centripetalAcceleration),
    centripetalForceN: round(input.massKg * centripetalAcceleration),
    periodS: round((2 * Math.PI * input.radiusM) / input.speedMps),
  };
}

export function solveElasticCollision(input: ElasticCollisionVariables): ElasticCollisionResult {
  const totalMass = input.mass1Kg + input.mass2Kg;
  const finalVelocity1 =
    ((input.mass1Kg - input.mass2Kg) / totalMass) * input.velocity1Mps +
    ((2 * input.mass2Kg) / totalMass) * input.velocity2Mps;
  const finalVelocity2 =
    ((2 * input.mass1Kg) / totalMass) * input.velocity1Mps +
    ((input.mass2Kg - input.mass1Kg) / totalMass) * input.velocity2Mps;

  return {
    finalVelocity1Mps: round(finalVelocity1),
    finalVelocity2Mps: round(finalVelocity2),
    totalMomentumKgMps: round(input.mass1Kg * input.velocity1Mps + input.mass2Kg * input.velocity2Mps),
    totalKineticEnergyJ: round(
      0.5 * input.mass1Kg * input.velocity1Mps ** 2 + 0.5 * input.mass2Kg * input.velocity2Mps ** 2,
    ),
  };
}

export function solveBuoyancy(input: BuoyancyVariables): BuoyancyResult {
  const volumeM3 = input.objectVolumeL / 1000;
  const buoyantForce = input.fluidDensityKgM3 * volumeM3 * 9.81;
  const weight = input.objectMassKg * 9.81;
  const netForce = buoyantForce - weight;

  return {
    buoyantForceN: round(buoyantForce),
    weightN: round(weight),
    netForceN: round(netForce),
    willFloat: netForce >= 0,
  };
}

export function solveLeverBalance(input: LeverBalanceVariables): LeverBalanceResult {
  const leftTorque = input.leftMassKg * 9.81 * input.leftArmM;
  const rightTorque = input.rightMassKg * 9.81 * input.rightArmM;
  const netTorque = leftTorque - rightTorque;

  return {
    leftTorqueNm: round(leftTorque),
    rightTorqueNm: round(rightTorque),
    netTorqueNm: round(netTorque),
    balance: Math.abs(netTorque) < 0.01 ? "balanced" : netTorque > 0 ? "left_down" : "right_down",
  };
}

export function solveOhmsLaw(input: OhmsLawVariables): OhmsLawResult {
  const current = input.voltageV / input.resistanceOhm;

  return {
    currentA: round(current),
    powerW: round(input.voltageV * current),
    conductanceS: round(1 / input.resistanceOhm),
  };
}

export function solveIdealGas(input: IdealGasVariables): IdealGasResult {
  const pressurePa = (input.molesMol * 8.314 * input.temperatureK) / (input.volumeL / 1000);

  return {
    pressureKpa: round(pressurePa / 1000),
    pressureAtm: round(pressurePa / 101325),
    thermalEnergyJ: round(1.5 * input.molesMol * 8.314 * input.temperatureK),
  };
}

export function solveWorkEnergy(input: WorkEnergyVariables): WorkEnergyResult {
  const work = input.forceN * input.distanceM * Math.cos((input.angleDeg * Math.PI) / 180);
  const kineticEnergyGain = Math.max(0, work);

  return {
    workJ: round(work),
    kineticEnergyGainJ: round(kineticEnergyGain),
    finalSpeedMps: round(Math.sqrt((2 * kineticEnergyGain) / input.massKg)),
  };
}

export function solveWaveSpeed(input: WaveSpeedVariables): WaveSpeedResult {
  return {
    speedMps: round(input.frequencyHz * input.wavelengthM),
    periodS: round(1 / input.frequencyHz),
    angularFrequencyRadps: round(2 * Math.PI * input.frequencyHz),
  };
}

export function solveRefraction(input: RefractionVariables): RefractionResult {
  const incidentRad = (input.incidentAngleDeg * Math.PI) / 180;
  const sineRefracted = (input.refractiveIndex1 / input.refractiveIndex2) * Math.sin(incidentRad);
  const totalInternalReflection = Math.abs(sineRefracted) > 1;
  const criticalAngle =
    input.refractiveIndex1 > input.refractiveIndex2
      ? (Math.asin(input.refractiveIndex2 / input.refractiveIndex1) * 180) / Math.PI
      : null;

  return {
    refractedAngleDeg: totalInternalReflection ? null : round((Math.asin(sineRefracted) * 180) / Math.PI),
    criticalAngleDeg: criticalAngle === null ? null : round(criticalAngle),
    speedRatio: round(input.refractiveIndex1 / input.refractiveIndex2),
    totalInternalReflection,
  };
}

export function solveLensImaging(input: LensImagingVariables): LensImagingResult {
  const denominator = 1 / input.focalLengthCm - 1 / input.objectDistanceCm;

  if (Math.abs(denominator) < 0.000001) {
    return {
      imageDistanceCm: null,
      magnification: null,
      imageHeightCm: null,
      imageType: "at_infinity",
    };
  }

  const imageDistance = 1 / denominator;
  const magnification = -imageDistance / input.objectDistanceCm;

  return {
    imageDistanceCm: round(imageDistance),
    magnification: round(magnification),
    imageHeightCm: round(magnification * input.objectHeightCm),
    imageType: imageDistance > 0 ? "real_inverted" : "virtual_upright",
  };
}

export function solveCoulombsLaw(input: CoulombsLawVariables): CoulombsLawResult {
  const charge1C = input.charge1MicroC * 0.000001;
  const charge2C = input.charge2MicroC * 0.000001;
  const signedForce = (8.9875517923e9 * charge1C * charge2C) / input.distanceM ** 2;
  const potentialEnergy = (8.9875517923e9 * charge1C * charge2C) / input.distanceM;

  return {
    forceN: round(Math.abs(signedForce)),
    potentialEnergyJ: round(potentialEnergy),
    interaction: signedForce === 0 ? "neutral" : signedForce < 0 ? "attraction" : "repulsion",
  };
}

export function solveRcCircuit(input: RcCircuitVariables): RcCircuitResult {
  const capacitanceF = input.capacitanceMicroF * 0.000001;
  const timeConstantS = input.resistanceOhm * capacitanceF;
  const timeS = input.timeMs / 1000;
  const exponential = Math.exp(-timeS / timeConstantS);
  const capacitorVoltage = input.voltageV * (1 - exponential);
  const current = (input.voltageV / input.resistanceOhm) * exponential;

  return {
    timeConstantMs: round(timeConstantS * 1000),
    capacitorVoltageV: round(capacitorVoltage),
    currentA: round(current),
    chargeMicroC: round(capacitanceF * capacitorVoltage * 1000000),
  };
}

export function solveAdditionalTemplate(concept: string, variables: unknown): AdditionalTemplateResult {
  if (concept === "pendulum") {
    return solvePendulum(variables as PendulumVariables);
  }
  if (concept === "circular_motion") {
    return solveCircularMotion(variables as CircularMotionVariables);
  }
  if (concept === "elastic_collision") {
    return solveElasticCollision(variables as ElasticCollisionVariables);
  }
  if (concept === "buoyancy") {
    return solveBuoyancy(variables as BuoyancyVariables);
  }
  if (concept === "lever_balance") {
    return solveLeverBalance(variables as LeverBalanceVariables);
  }
  if (concept === "ohms_law") {
    return solveOhmsLaw(variables as OhmsLawVariables);
  }
  if (concept === "ideal_gas") {
    return solveIdealGas(variables as IdealGasVariables);
  }
  if (concept === "work_energy") {
    return solveWorkEnergy(variables as WorkEnergyVariables);
  }
  if (concept === "wave_speed") {
    return solveWaveSpeed(variables as WaveSpeedVariables);
  }
  if (concept === "refraction") {
    return solveRefraction(variables as RefractionVariables);
  }
  if (concept === "lens_imaging") {
    return solveLensImaging(variables as LensImagingVariables);
  }
  if (concept === "coulombs_law") {
    return solveCoulombsLaw(variables as CoulombsLawVariables);
  }
  if (concept === "rc_circuit") {
    return solveRcCircuit(variables as RcCircuitVariables);
  }

  throw new Error(`unsupported simulation concept: ${concept}`);
}
