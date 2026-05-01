export const SIMULATION_CONCEPTS = [
  "inclined_plane",
  "projectile_motion",
  "spring_oscillator",
  "pendulum",
  "circular_motion",
  "elastic_collision",
  "buoyancy",
  "lever_balance",
  "ohms_law",
  "ideal_gas",
  "work_energy",
  "wave_speed",
  "refraction",
  "lens_imaging",
  "coulombs_law",
  "rc_circuit",
] as const;

export type SimulationConcept = (typeof SIMULATION_CONCEPTS)[number];

export type SimulationTemplateSuggestion = {
  concept: SimulationConcept;
  title: string;
  reason: string;
};

export type InclinedPlaneVariables = {
  angleDeg: number;
  frictionCoefficient: number;
  lengthM: number;
  massKg: number;
};

export type ProjectileMotionVariables = {
  launchSpeedMps: number;
  launchAngleDeg: number;
  launchHeightM: number;
  gravityMps2: number;
};

export type SpringOscillatorVariables = {
  massKg: number;
  springConstantNpm: number;
  amplitudeM: number;
  dampingRatio: number;
};

export type PendulumVariables = {
  lengthM: number;
  gravityMps2: number;
  amplitudeDeg: number;
  massKg: number;
};

export type CircularMotionVariables = {
  radiusM: number;
  speedMps: number;
  massKg: number;
};

export type ElasticCollisionVariables = {
  mass1Kg: number;
  mass2Kg: number;
  velocity1Mps: number;
  velocity2Mps: number;
};

export type BuoyancyVariables = {
  objectVolumeL: number;
  objectMassKg: number;
  fluidDensityKgM3: number;
};

export type LeverBalanceVariables = {
  leftMassKg: number;
  rightMassKg: number;
  leftArmM: number;
  rightArmM: number;
};

export type OhmsLawVariables = {
  voltageV: number;
  resistanceOhm: number;
};

export type IdealGasVariables = {
  molesMol: number;
  temperatureK: number;
  volumeL: number;
};

export type WorkEnergyVariables = {
  forceN: number;
  distanceM: number;
  angleDeg: number;
  massKg: number;
};

export type WaveSpeedVariables = {
  frequencyHz: number;
  wavelengthM: number;
  amplitudeM: number;
};

export type RefractionVariables = {
  incidentAngleDeg: number;
  refractiveIndex1: number;
  refractiveIndex2: number;
};

export type LensImagingVariables = {
  focalLengthCm: number;
  objectDistanceCm: number;
  objectHeightCm: number;
};

export type CoulombsLawVariables = {
  charge1MicroC: number;
  charge2MicroC: number;
  distanceM: number;
};

export type RcCircuitVariables = {
  voltageV: number;
  resistanceOhm: number;
  capacitanceMicroF: number;
  timeMs: number;
};

export type InclinedPlanePlan = {
  concept: "inclined_plane";
  title: string;
  objective: string;
  variables: InclinedPlaneVariables;
  guidingQuestions: string[];
};

export type ProjectileMotionPlan = {
  concept: "projectile_motion";
  title: string;
  objective: string;
  variables: ProjectileMotionVariables;
  guidingQuestions: string[];
};

export type SpringOscillatorPlan = {
  concept: "spring_oscillator";
  title: string;
  objective: string;
  variables: SpringOscillatorVariables;
  guidingQuestions: string[];
};

export type PendulumPlan = {
  concept: "pendulum";
  title: string;
  objective: string;
  variables: PendulumVariables;
  guidingQuestions: string[];
};

export type CircularMotionPlan = {
  concept: "circular_motion";
  title: string;
  objective: string;
  variables: CircularMotionVariables;
  guidingQuestions: string[];
};

export type ElasticCollisionPlan = {
  concept: "elastic_collision";
  title: string;
  objective: string;
  variables: ElasticCollisionVariables;
  guidingQuestions: string[];
};

export type BuoyancyPlan = {
  concept: "buoyancy";
  title: string;
  objective: string;
  variables: BuoyancyVariables;
  guidingQuestions: string[];
};

export type LeverBalancePlan = {
  concept: "lever_balance";
  title: string;
  objective: string;
  variables: LeverBalanceVariables;
  guidingQuestions: string[];
};

export type OhmsLawPlan = {
  concept: "ohms_law";
  title: string;
  objective: string;
  variables: OhmsLawVariables;
  guidingQuestions: string[];
};

export type IdealGasPlan = {
  concept: "ideal_gas";
  title: string;
  objective: string;
  variables: IdealGasVariables;
  guidingQuestions: string[];
};

export type WorkEnergyPlan = {
  concept: "work_energy";
  title: string;
  objective: string;
  variables: WorkEnergyVariables;
  guidingQuestions: string[];
};

export type WaveSpeedPlan = {
  concept: "wave_speed";
  title: string;
  objective: string;
  variables: WaveSpeedVariables;
  guidingQuestions: string[];
};

export type RefractionPlan = {
  concept: "refraction";
  title: string;
  objective: string;
  variables: RefractionVariables;
  guidingQuestions: string[];
};

export type LensImagingPlan = {
  concept: "lens_imaging";
  title: string;
  objective: string;
  variables: LensImagingVariables;
  guidingQuestions: string[];
};

export type CoulombsLawPlan = {
  concept: "coulombs_law";
  title: string;
  objective: string;
  variables: CoulombsLawVariables;
  guidingQuestions: string[];
};

export type RcCircuitPlan = {
  concept: "rc_circuit";
  title: string;
  objective: string;
  variables: RcCircuitVariables;
  guidingQuestions: string[];
};

export type SimulationPlan =
  | InclinedPlanePlan
  | ProjectileMotionPlan
  | SpringOscillatorPlan
  | PendulumPlan
  | CircularMotionPlan
  | ElasticCollisionPlan
  | BuoyancyPlan
  | LeverBalancePlan
  | OhmsLawPlan
  | IdealGasPlan
  | WorkEnergyPlan
  | WaveSpeedPlan
  | RefractionPlan
  | LensImagingPlan
  | CoulombsLawPlan
  | RcCircuitPlan;

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function parseNonEmptyString(input: unknown, field: string): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }

  return input.trim();
}

function parseRange(input: unknown, field: string, min: number, max: number): number {
  if (typeof input !== "number" || !Number.isFinite(input) || input < min || input > max) {
    throw new Error(`${field} must be between ${min} and ${max}`);
  }

  return input;
}

function parseGuidingQuestions(input: unknown): string[] {
  if (!Array.isArray(input)) {
    throw new Error("guidingQuestions must be an array");
  }

  const questions = input.map((item) => parseNonEmptyString(item, "guiding question"));

  if (questions.length < 2 || questions.length > 5) {
    throw new Error("guidingQuestions must include 2 to 5 questions");
  }

  return questions;
}

function parseInclinedPlaneVariables(input: unknown): InclinedPlaneVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    angleDeg: parseRange(input.angleDeg, "angleDeg", 5, 60),
    frictionCoefficient: parseRange(input.frictionCoefficient, "frictionCoefficient", 0, 0.8),
    lengthM: parseRange(input.lengthM, "lengthM", 1, 20),
    massKg: parseRange(input.massKg, "massKg", 0.1, 20),
  };
}

function parseProjectileMotionVariables(input: unknown): ProjectileMotionVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    launchSpeedMps: parseRange(input.launchSpeedMps, "launchSpeedMps", 1, 60),
    launchAngleDeg: parseRange(input.launchAngleDeg, "launchAngleDeg", 5, 85),
    launchHeightM: parseRange(input.launchHeightM, "launchHeightM", 0, 20),
    gravityMps2: parseRange(input.gravityMps2, "gravityMps2", 1, 20),
  };
}

function parseSpringOscillatorVariables(input: unknown): SpringOscillatorVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    massKg: parseRange(input.massKg, "massKg", 0.1, 20),
    springConstantNpm: parseRange(input.springConstantNpm, "springConstantNpm", 1, 500),
    amplitudeM: parseRange(input.amplitudeM, "amplitudeM", 0.05, 5),
    dampingRatio: parseRange(input.dampingRatio, "dampingRatio", 0, 1),
  };
}

function parsePendulumVariables(input: unknown): PendulumVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    lengthM: parseRange(input.lengthM, "lengthM", 0.1, 10),
    gravityMps2: parseRange(input.gravityMps2, "gravityMps2", 1, 20),
    amplitudeDeg: parseRange(input.amplitudeDeg, "amplitudeDeg", 1, 45),
    massKg: parseRange(input.massKg, "massKg", 0.1, 20),
  };
}

function parseCircularMotionVariables(input: unknown): CircularMotionVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    radiusM: parseRange(input.radiusM, "radiusM", 0.1, 20),
    speedMps: parseRange(input.speedMps, "speedMps", 0.1, 100),
    massKg: parseRange(input.massKg, "massKg", 0.1, 20),
  };
}

function parseElasticCollisionVariables(input: unknown): ElasticCollisionVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    mass1Kg: parseRange(input.mass1Kg, "mass1Kg", 0.1, 20),
    mass2Kg: parseRange(input.mass2Kg, "mass2Kg", 0.1, 20),
    velocity1Mps: parseRange(input.velocity1Mps, "velocity1Mps", -30, 30),
    velocity2Mps: parseRange(input.velocity2Mps, "velocity2Mps", -30, 30),
  };
}

function parseBuoyancyVariables(input: unknown): BuoyancyVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    objectVolumeL: parseRange(input.objectVolumeL, "objectVolumeL", 0.1, 500),
    objectMassKg: parseRange(input.objectMassKg, "objectMassKg", 0.01, 1000),
    fluidDensityKgM3: parseRange(input.fluidDensityKgM3, "fluidDensityKgM3", 100, 2000),
  };
}

function parseLeverBalanceVariables(input: unknown): LeverBalanceVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    leftMassKg: parseRange(input.leftMassKg, "leftMassKg", 0.1, 100),
    rightMassKg: parseRange(input.rightMassKg, "rightMassKg", 0.1, 100),
    leftArmM: parseRange(input.leftArmM, "leftArmM", 0.1, 10),
    rightArmM: parseRange(input.rightArmM, "rightArmM", 0.1, 10),
  };
}

function parseOhmsLawVariables(input: unknown): OhmsLawVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    voltageV: parseRange(input.voltageV, "voltageV", 0.1, 240),
    resistanceOhm: parseRange(input.resistanceOhm, "resistanceOhm", 0.1, 10000),
  };
}

function parseIdealGasVariables(input: unknown): IdealGasVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    molesMol: parseRange(input.molesMol, "molesMol", 0.01, 100),
    temperatureK: parseRange(input.temperatureK, "temperatureK", 100, 1000),
    volumeL: parseRange(input.volumeL, "volumeL", 0.1, 1000),
  };
}

function parseWorkEnergyVariables(input: unknown): WorkEnergyVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    forceN: parseRange(input.forceN, "forceN", 0.1, 1000),
    distanceM: parseRange(input.distanceM, "distanceM", 0.1, 100),
    angleDeg: parseRange(input.angleDeg, "angleDeg", 0, 180),
    massKg: parseRange(input.massKg, "massKg", 0.1, 100),
  };
}

function parseWaveSpeedVariables(input: unknown): WaveSpeedVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    frequencyHz: parseRange(input.frequencyHz, "frequencyHz", 0.01, 100000),
    wavelengthM: parseRange(input.wavelengthM, "wavelengthM", 0.000001, 10000),
    amplitudeM: parseRange(input.amplitudeM, "amplitudeM", 0, 100),
  };
}

function parseRefractionVariables(input: unknown): RefractionVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    incidentAngleDeg: parseRange(input.incidentAngleDeg, "incidentAngleDeg", 0, 89),
    refractiveIndex1: parseRange(input.refractiveIndex1, "refractiveIndex1", 1, 3),
    refractiveIndex2: parseRange(input.refractiveIndex2, "refractiveIndex2", 1, 3),
  };
}

function parseLensImagingVariables(input: unknown): LensImagingVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    focalLengthCm: parseRange(input.focalLengthCm, "focalLengthCm", 1, 200),
    objectDistanceCm: parseRange(input.objectDistanceCm, "objectDistanceCm", 1, 500),
    objectHeightCm: parseRange(input.objectHeightCm, "objectHeightCm", 0.1, 100),
  };
}

function parseCoulombsLawVariables(input: unknown): CoulombsLawVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    charge1MicroC: parseRange(input.charge1MicroC, "charge1MicroC", -1000, 1000),
    charge2MicroC: parseRange(input.charge2MicroC, "charge2MicroC", -1000, 1000),
    distanceM: parseRange(input.distanceM, "distanceM", 0.01, 100),
  };
}

function parseRcCircuitVariables(input: unknown): RcCircuitVariables {
  if (!isRecord(input)) {
    throw new Error("variables must be an object");
  }

  return {
    voltageV: parseRange(input.voltageV, "voltageV", 0.1, 240),
    resistanceOhm: parseRange(input.resistanceOhm, "resistanceOhm", 1, 1000000),
    capacitanceMicroF: parseRange(input.capacitanceMicroF, "capacitanceMicroF", 0.001, 100000),
    timeMs: parseRange(input.timeMs, "timeMs", 0, 1000000),
  };
}

export const SimulationPlanSchema = {
  parse(input: unknown): SimulationPlan {
    if (!isRecord(input)) {
      throw new Error("simulation plan must be an object");
    }

    const record = input;
    const title = parseNonEmptyString(record.title, "title");
    const objective = parseNonEmptyString(record.objective, "objective");

    function common() {
      return {
        title,
        objective,
        guidingQuestions: parseGuidingQuestions(record.guidingQuestions),
      };
    }

    if (record.concept === "inclined_plane") {
      const variables = parseInclinedPlaneVariables(record.variables);
      return {
        concept: "inclined_plane",
        ...common(),
        variables,
      };
    }

    if (record.concept === "projectile_motion") {
      const variables = parseProjectileMotionVariables(record.variables);
      return {
        concept: "projectile_motion",
        ...common(),
        variables,
      };
    }

    if (record.concept === "spring_oscillator") {
      const variables = parseSpringOscillatorVariables(record.variables);
      return {
        concept: "spring_oscillator",
        ...common(),
        variables,
      };
    }

    if (record.concept === "pendulum") {
      return {
        concept: "pendulum",
        ...common(),
        variables: parsePendulumVariables(record.variables),
      };
    }

    if (record.concept === "circular_motion") {
      return {
        concept: "circular_motion",
        ...common(),
        variables: parseCircularMotionVariables(record.variables),
      };
    }

    if (record.concept === "elastic_collision") {
      return {
        concept: "elastic_collision",
        ...common(),
        variables: parseElasticCollisionVariables(record.variables),
      };
    }

    if (record.concept === "buoyancy") {
      return {
        concept: "buoyancy",
        ...common(),
        variables: parseBuoyancyVariables(record.variables),
      };
    }

    if (record.concept === "lever_balance") {
      return {
        concept: "lever_balance",
        ...common(),
        variables: parseLeverBalanceVariables(record.variables),
      };
    }

    if (record.concept === "ohms_law") {
      return {
        concept: "ohms_law",
        ...common(),
        variables: parseOhmsLawVariables(record.variables),
      };
    }

    if (record.concept === "ideal_gas") {
      return {
        concept: "ideal_gas",
        ...common(),
        variables: parseIdealGasVariables(record.variables),
      };
    }

    if (record.concept === "work_energy") {
      return {
        concept: "work_energy",
        ...common(),
        variables: parseWorkEnergyVariables(record.variables),
      };
    }

    if (record.concept === "wave_speed") {
      return {
        concept: "wave_speed",
        ...common(),
        variables: parseWaveSpeedVariables(record.variables),
      };
    }

    if (record.concept === "refraction") {
      return {
        concept: "refraction",
        ...common(),
        variables: parseRefractionVariables(record.variables),
      };
    }

    if (record.concept === "lens_imaging") {
      return {
        concept: "lens_imaging",
        ...common(),
        variables: parseLensImagingVariables(record.variables),
      };
    }

    if (record.concept === "coulombs_law") {
      return {
        concept: "coulombs_law",
        ...common(),
        variables: parseCoulombsLawVariables(record.variables),
      };
    }

    if (record.concept === "rc_circuit") {
      return {
        concept: "rc_circuit",
        ...common(),
        variables: parseRcCircuitVariables(record.variables),
      };
    }

    throw new Error(`concept must be one of ${SIMULATION_CONCEPTS.join(", ")}`);
  },
};
