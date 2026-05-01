import { describe, expect, test } from "vitest";

import {
  solveBuoyancy,
  solveCircularMotion,
  solveCoulombsLaw,
  solveElasticCollision,
  solveIdealGas,
  solveLeverBalance,
  solveLensImaging,
  solveOhmsLaw,
  solvePendulum,
  solveRcCircuit,
  solveRefraction,
  solveWaveSpeed,
  solveWorkEnergy,
} from "./template-solvers";

describe("additional education template solvers", () => {
  test("solves pendulum measurements", () => {
    expect(
      solvePendulum({
        lengthM: 2,
        gravityMps2: 9.81,
        amplitudeDeg: 12,
        massKg: 1,
      }),
    ).toMatchObject({
      periodS: 2.84,
      frequencyHz: 0.35,
      maxSpeedMps: 0.93,
    });
  });

  test("solves circular-motion measurements", () => {
    expect(
      solveCircularMotion({
        radiusM: 3,
        speedMps: 12,
        massKg: 2,
      }),
    ).toEqual({
      angularSpeedRadps: 4,
      centripetalAccelMps2: 48,
      centripetalForceN: 96,
      periodS: 1.57,
    });
  });

  test("solves elastic-collision measurements", () => {
    expect(
      solveElasticCollision({
        mass1Kg: 1,
        mass2Kg: 2,
        velocity1Mps: 6,
        velocity2Mps: -1,
      }),
    ).toMatchObject({
      finalVelocity1Mps: -3.33,
      finalVelocity2Mps: 3.67,
      totalMomentumKgMps: 4,
    });
  });

  test("solves buoyancy measurements", () => {
    expect(
      solveBuoyancy({
        objectVolumeL: 3,
        objectMassKg: 2,
        fluidDensityKgM3: 1000,
      }),
    ).toEqual({
      buoyantForceN: 29.43,
      weightN: 19.62,
      netForceN: 9.81,
      willFloat: true,
    });
  });

  test("solves lever-balance measurements", () => {
    expect(
      solveLeverBalance({
        leftMassKg: 4,
        rightMassKg: 3,
        leftArmM: 1.2,
        rightArmM: 1.6,
      }),
    ).toEqual({
      leftTorqueNm: 47.09,
      rightTorqueNm: 47.09,
      netTorqueNm: 0,
      balance: "balanced",
    });
  });

  test("solves Ohm's-law measurements", () => {
    expect(
      solveOhmsLaw({
        voltageV: 12,
        resistanceOhm: 6,
      }),
    ).toEqual({
      currentA: 2,
      powerW: 24,
      conductanceS: 0.17,
    });
  });

  test("solves ideal-gas measurements", () => {
    expect(
      solveIdealGas({
        molesMol: 1,
        temperatureK: 300,
        volumeL: 24,
      }),
    ).toEqual({
      pressureKpa: 103.92,
      pressureAtm: 1.03,
      thermalEnergyJ: 3741.3,
    });
  });

  test("solves work-energy measurements", () => {
    expect(
      solveWorkEnergy({
        forceN: 25,
        distanceM: 4,
        angleDeg: 0,
        massKg: 2,
      }),
    ).toEqual({
      workJ: 100,
      kineticEnergyGainJ: 100,
      finalSpeedMps: 10,
    });
  });

  test("solves wave-speed measurements", () => {
    expect(
      solveWaveSpeed({
        frequencyHz: 5,
        wavelengthM: 2,
        amplitudeM: 0.3,
      }),
    ).toEqual({
      speedMps: 10,
      periodS: 0.2,
      angularFrequencyRadps: 31.42,
    });
  });

  test("solves refraction measurements", () => {
    expect(
      solveRefraction({
        incidentAngleDeg: 30,
        refractiveIndex1: 1,
        refractiveIndex2: 1.5,
      }),
    ).toEqual({
      refractedAngleDeg: 19.47,
      criticalAngleDeg: null,
      speedRatio: 0.67,
      totalInternalReflection: false,
    });
  });

  test("solves lens imaging measurements", () => {
    expect(
      solveLensImaging({
        focalLengthCm: 10,
        objectDistanceCm: 30,
        objectHeightCm: 4,
      }),
    ).toEqual({
      imageDistanceCm: 15,
      magnification: -0.5,
      imageHeightCm: -2,
      imageType: "real_inverted",
    });
  });

  test("solves Coulomb force measurements", () => {
    expect(
      solveCoulombsLaw({
        charge1MicroC: 2,
        charge2MicroC: -3,
        distanceM: 0.5,
      }),
    ).toEqual({
      forceN: 0.22,
      potentialEnergyJ: -0.11,
      interaction: "attraction",
    });
  });

  test("solves RC-circuit measurements", () => {
    expect(
      solveRcCircuit({
        voltageV: 9,
        resistanceOhm: 1000,
        capacitanceMicroF: 100,
        timeMs: 100,
      }),
    ).toEqual({
      timeConstantMs: 100,
      capacitorVoltageV: 5.69,
      currentA: 0,
      chargeMicroC: 568.91,
    });
  });
});
