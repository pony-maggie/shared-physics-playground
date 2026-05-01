import { create } from "zustand";

import type {
  BuoyancyVariables,
  CircularMotionVariables,
  CoulombsLawVariables,
  ElasticCollisionVariables,
  IdealGasVariables,
  InclinedPlaneVariables,
  LeverBalanceVariables,
  LensImagingVariables,
  OhmsLawVariables,
  PendulumVariables,
  ProjectileMotionVariables,
  RcCircuitVariables,
  RefractionVariables,
  SimulationConcept,
  SimulationPlan,
  SimulationTemplateSuggestion,
  SpringOscillatorVariables,
  WaveSpeedVariables,
  WorkEnergyVariables,
} from "../../../../packages/prompt-contracts/src/simulation-spec";

type InclinedPlaneMeasurements = {
  accelerationMps2: number;
  timeToBottomS: number | null;
  finalSpeedMps: number;
  willSlide: boolean;
};

type ProjectileMotionMeasurements = {
  flightTimeS: number;
  rangeM: number;
  maxHeightM: number;
  finalSpeedMps: number;
  willLand: boolean;
};

type SpringOscillatorMeasurements = {
  periodS: number;
  angularFrequencyRadps: number;
  maxSpeedMps: number;
  energyJ: number;
  willOscillate: boolean;
};

type PendulumMeasurements = {
  periodS: number;
  frequencyHz: number;
  maxSpeedMps: number;
  tensionAtBottomN: number;
};

type CircularMotionMeasurements = {
  angularSpeedRadps: number;
  centripetalAccelMps2: number;
  centripetalForceN: number;
  periodS: number;
};

type ElasticCollisionMeasurements = {
  finalVelocity1Mps: number;
  finalVelocity2Mps: number;
  totalMomentumKgMps: number;
  totalKineticEnergyJ: number;
};

type BuoyancyMeasurements = {
  buoyantForceN: number;
  weightN: number;
  netForceN: number;
  willFloat: boolean;
};

type LeverBalanceMeasurements = {
  leftTorqueNm: number;
  rightTorqueNm: number;
  netTorqueNm: number;
  balance: "balanced" | "left_down" | "right_down";
};

type OhmsLawMeasurements = {
  currentA: number;
  powerW: number;
  conductanceS: number;
};

type IdealGasMeasurements = {
  pressureKpa: number;
  pressureAtm: number;
  thermalEnergyJ: number;
};

type WorkEnergyMeasurements = {
  workJ: number;
  kineticEnergyGainJ: number;
  finalSpeedMps: number;
};

type WaveSpeedMeasurements = {
  speedMps: number;
  periodS: number;
  angularFrequencyRadps: number;
};

type RefractionMeasurements = {
  refractedAngleDeg: number | null;
  criticalAngleDeg: number | null;
  speedRatio: number;
  totalInternalReflection: boolean;
};

type LensImagingMeasurements = {
  imageDistanceCm: number | null;
  magnification: number | null;
  imageHeightCm: number | null;
  imageType: "real_inverted" | "virtual_upright" | "at_infinity";
};

type CoulombsLawMeasurements = {
  forceN: number;
  potentialEnergyJ: number;
  interaction: "attraction" | "repulsion" | "neutral";
};

type RcCircuitMeasurements = {
  timeConstantMs: number;
  capacitorVoltageV: number;
  currentA: number;
  chargeMicroC: number;
};

type Measurements =
  | InclinedPlaneMeasurements
  | ProjectileMotionMeasurements
  | SpringOscillatorMeasurements
  | PendulumMeasurements
  | CircularMotionMeasurements
  | ElasticCollisionMeasurements
  | BuoyancyMeasurements
  | LeverBalanceMeasurements
  | OhmsLawMeasurements
  | IdealGasMeasurements
  | WorkEnergyMeasurements
  | WaveSpeedMeasurements
  | RefractionMeasurements
  | LensImagingMeasurements
  | CoulombsLawMeasurements
  | RcCircuitMeasurements;
type SimulationVariables =
  | Partial<InclinedPlaneVariables>
  | Partial<ProjectileMotionVariables>
  | Partial<SpringOscillatorVariables>
  | Partial<PendulumVariables>
  | Partial<CircularMotionVariables>
  | Partial<ElasticCollisionVariables>
  | Partial<BuoyancyVariables>
  | Partial<LeverBalanceVariables>
  | Partial<OhmsLawVariables>
  | Partial<IdealGasVariables>
  | Partial<WorkEnergyVariables>
  | Partial<WaveSpeedVariables>
  | Partial<RefractionVariables>
  | Partial<LensImagingVariables>
  | Partial<CoulombsLawVariables>
  | Partial<RcCircuitVariables>;

export type PlannedSimulation = {
  entitlement?: {
    canGenerate: boolean;
    canSave: boolean;
    remainingImageGenerations: number;
    remainingTextGenerations: number;
    tier: "guest" | "free" | "pro";
  };
  plan: SimulationPlan;
  measurements: Measurements;
  explanation: string;
  source?: "ai" | "demo";
  unsupportedReason?: string;
};

type SimulationSuggestionResponse = {
  message?: string;
  suggestions: SimulationTemplateSuggestion[];
  unsupportedReason?: string;
};

export type SimulationStatus =
  | { kind: "idle" }
  | { kind: "planning" }
  | { kind: "ready" }
  | {
      kind: "suggestions";
      message: string;
      question: string;
      suggestions: SimulationTemplateSuggestion[];
    }
  | { kind: "error"; message: string };

export type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; simulationId: string }
  | { kind: "error"; message: string };

type SimulationClientState = {
  planned: PlannedSimulation | null;
  status: SimulationStatus;
  saveStatus: SaveStatus;
  plan: (question: string, options?: {
    authToken?: string | null;
    selectedConcept?: SimulationConcept;
    source?: "text" | "image" | "sketch";
  }) => Promise<void>;
  saveCurrent: (options: { authToken: string }) => Promise<void>;
  updateVariables: (variables: SimulationVariables) => void;
  loadLocalInclinedPlaneDemo: () => void;
  reset: () => void;
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function isSuggestionResponse(input: unknown): input is SimulationSuggestionResponse {
  return Boolean(
    input &&
      typeof input === "object" &&
      Array.isArray((input as { suggestions?: unknown }).suggestions),
  );
}

function solveInclinedPlane(input: InclinedPlaneVariables): Measurements {
  const angleRad = (input.angleDeg * Math.PI) / 180;
  const acceleration = Math.max(
    0,
    9.81 * (Math.sin(angleRad) - input.frictionCoefficient * Math.cos(angleRad)),
  );

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

function solveProjectileMotion(input: ProjectileMotionVariables): Measurements {
  const angleRad = (input.launchAngleDeg * Math.PI) / 180;
  const horizontalVelocity = input.launchSpeedMps * Math.cos(angleRad);
  const verticalVelocity = input.launchSpeedMps * Math.sin(angleRad);
  const discriminant = verticalVelocity ** 2 + 2 * input.gravityMps2 * input.launchHeightM;
  const flightTime = (verticalVelocity + Math.sqrt(discriminant)) / input.gravityMps2;
  const range = horizontalVelocity * flightTime;
  const maxHeight = input.launchHeightM + verticalVelocity ** 2 / (2 * input.gravityMps2);
  const finalVerticalVelocity = verticalVelocity - input.gravityMps2 * flightTime;

  return {
    flightTimeS: round(flightTime),
    rangeM: round(range),
    maxHeightM: round(maxHeight),
    finalSpeedMps: round(Math.hypot(horizontalVelocity, finalVerticalVelocity)),
    willLand: true,
  };
}

function solveSpringOscillator(input: SpringOscillatorVariables): Measurements {
  const angularFrequency = Math.sqrt(input.springConstantNpm / input.massKg);

  return {
    periodS: round((2 * Math.PI) / angularFrequency),
    angularFrequencyRadps: round(angularFrequency),
    maxSpeedMps: round(input.amplitudeM * angularFrequency),
    energyJ: round(0.5 * input.springConstantNpm * input.amplitudeM ** 2),
    willOscillate: input.dampingRatio < 1,
  };
}

function solvePendulum(input: PendulumVariables): Measurements {
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

function solveCircularMotion(input: CircularMotionVariables): Measurements {
  const angularSpeed = input.speedMps / input.radiusM;
  const centripetalAcceleration = input.speedMps ** 2 / input.radiusM;

  return {
    angularSpeedRadps: round(angularSpeed),
    centripetalAccelMps2: round(centripetalAcceleration),
    centripetalForceN: round(input.massKg * centripetalAcceleration),
    periodS: round((2 * Math.PI * input.radiusM) / input.speedMps),
  };
}

function solveElasticCollision(input: ElasticCollisionVariables): Measurements {
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

function solveBuoyancy(input: BuoyancyVariables): Measurements {
  const volumeM3 = input.objectVolumeL / 1000;
  const buoyantForce = input.fluidDensityKgM3 * volumeM3 * 9.81;
  const weight = input.objectMassKg * 9.81;

  return {
    buoyantForceN: round(buoyantForce),
    weightN: round(weight),
    netForceN: round(buoyantForce - weight),
    willFloat: buoyantForce >= weight,
  };
}

function solveLeverBalance(input: LeverBalanceVariables): Measurements {
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

function solveOhmsLaw(input: OhmsLawVariables): Measurements {
  const current = input.voltageV / input.resistanceOhm;

  return {
    currentA: round(current),
    powerW: round(input.voltageV * current),
    conductanceS: round(1 / input.resistanceOhm),
  };
}

function solveIdealGas(input: IdealGasVariables): Measurements {
  const pressurePa = (input.molesMol * 8.314 * input.temperatureK) / (input.volumeL / 1000);

  return {
    pressureKpa: round(pressurePa / 1000),
    pressureAtm: round(pressurePa / 101325),
    thermalEnergyJ: round(1.5 * input.molesMol * 8.314 * input.temperatureK),
  };
}

function solveWorkEnergy(input: WorkEnergyVariables): Measurements {
  const work = input.forceN * input.distanceM * Math.cos((input.angleDeg * Math.PI) / 180);
  const kineticEnergyGain = Math.max(0, work);

  return {
    workJ: round(work),
    kineticEnergyGainJ: round(kineticEnergyGain),
    finalSpeedMps: round(Math.sqrt((2 * kineticEnergyGain) / input.massKg)),
  };
}

function solveWaveSpeed(input: WaveSpeedVariables): Measurements {
  return {
    speedMps: round(input.frequencyHz * input.wavelengthM),
    periodS: round(1 / input.frequencyHz),
    angularFrequencyRadps: round(2 * Math.PI * input.frequencyHz),
  };
}

function solveRefraction(input: RefractionVariables): Measurements {
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

function solveLensImaging(input: LensImagingVariables): Measurements {
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

function solveCoulombsLaw(input: CoulombsLawVariables): Measurements {
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

function solveRcCircuit(input: RcCircuitVariables): Measurements {
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

function solveGenericTemplate(plan: SimulationPlan): Measurements {
  if (plan.concept === "pendulum") {
    return solvePendulum(plan.variables);
  }
  if (plan.concept === "circular_motion") {
    return solveCircularMotion(plan.variables);
  }
  if (plan.concept === "elastic_collision") {
    return solveElasticCollision(plan.variables);
  }
  if (plan.concept === "buoyancy") {
    return solveBuoyancy(plan.variables);
  }
  if (plan.concept === "lever_balance") {
    return solveLeverBalance(plan.variables);
  }
  if (plan.concept === "ohms_law") {
    return solveOhmsLaw(plan.variables);
  }
  if (plan.concept === "work_energy") {
    return solveWorkEnergy(plan.variables);
  }
  if (plan.concept === "wave_speed") {
    return solveWaveSpeed(plan.variables);
  }
  if (plan.concept === "refraction") {
    return solveRefraction(plan.variables);
  }
  if (plan.concept === "lens_imaging") {
    return solveLensImaging(plan.variables);
  }
  if (plan.concept === "coulombs_law") {
    return solveCoulombsLaw(plan.variables);
  }
  if (plan.concept === "rc_circuit") {
    return solveRcCircuit(plan.variables);
  }

  return solveIdealGas((plan as Extract<SimulationPlan, { concept: "ideal_gas" }>).variables);
}

function createLocalDemo(): PlannedSimulation {
  const plan: SimulationPlan = {
    concept: "inclined_plane",
    title: "斜面与摩擦",
    objective: "观察斜面角度和摩擦系数如何改变加速度、到底时间和末速度。",
    variables: {
      angleDeg: 25,
      frictionCoefficient: 0.15,
      lengthM: 4,
      massKg: 1,
    },
    guidingQuestions: ["角度变大会怎样？", "摩擦变大会怎样？", "质量会改变加速度吗？"],
  };

  return {
    plan,
    measurements: solveInclinedPlane(plan.variables),
    explanation: "重力沿斜面方向的分量大于摩擦阻力时，物体会沿斜面加速下滑。",
  };
}

export const useSimulationClient = create<SimulationClientState>((set) => ({
  planned: null,
  status: { kind: "idle" },
  saveStatus: { kind: "idle" },
  async plan(question, options = {}) {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      set({ saveStatus: { kind: "idle" }, status: { kind: "error", message: "enter a physics question first" } });
      return;
    }

    set({ saveStatus: { kind: "idle" }, status: { kind: "planning" } });

    try {
      const response = await globalThis.fetch("/api/education/simulations/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          ...(options.selectedConcept ? { selectedConcept: options.selectedConcept } : {}),
          source: options.source ?? "text",
        }),
      });

      if (!response.ok) {
        const failed = (await response.json().catch(() => ({}))) as { error?: string };
        set({
          saveStatus: { kind: "idle" },
          status: { kind: "error", message: failed.error ?? "simulation planning failed" },
        });
        return;
      }

      const planned = (await response.json()) as PlannedSimulation | SimulationSuggestionResponse;
      if (isSuggestionResponse(planned)) {
        set({
          saveStatus: { kind: "idle" },
          status: {
            kind: "suggestions",
            message: planned.message ?? "No exact built-in experiment matched. Choose a nearby experiment to continue.",
            question: trimmedQuestion,
            suggestions: planned.suggestions,
          },
        });
        return;
      }

      set({ planned, saveStatus: { kind: "idle" }, status: { kind: "ready" } });
    } catch {
      set({ planned: createLocalDemo(), saveStatus: { kind: "idle" }, status: { kind: "ready" } });
    }
  },
  async saveCurrent(options) {
    const planned = useSimulationClient.getState().planned;

    if (!planned) {
      set({ saveStatus: { kind: "error", message: "no experiment to save" } });
      return;
    }

    set({ saveStatus: { kind: "saving" } });

    try {
      const response = await globalThis.fetch("/api/education/simulations/save", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          simulationJson: JSON.stringify(planned),
          title: planned.plan.title,
        }),
      });

      if (!response.ok) {
        const failed = (await response.json().catch(() => ({}))) as { error?: string };
        set({ saveStatus: { kind: "error", message: failed.error ?? "experiment save failed" } });
        return;
      }

      const saved = (await response.json()) as { simulationId?: string };
      set({
        saveStatus: {
          kind: "saved",
          simulationId: saved.simulationId ?? "saved",
        },
      });
    } catch {
      set({ saveStatus: { kind: "error", message: "experiment save failed" } });
    }
  },
  updateVariables(variables) {
    set((state) => {
      if (!state.planned) {
        return state;
      }

      if (state.planned.plan.concept === "inclined_plane") {
        const nextVariables = {
          ...state.planned.plan.variables,
          ...(variables as Partial<InclinedPlaneVariables>),
        };
        const nextPlan = {
          ...state.planned.plan,
          variables: nextVariables,
        };

        return {
          planned: {
            ...state.planned,
            plan: nextPlan,
            measurements: solveInclinedPlane(nextVariables),
          },
          saveStatus: { kind: "idle" },
        };
      }

      if (state.planned.plan.concept === "projectile_motion") {
        const nextVariables = {
          ...state.planned.plan.variables,
          ...(variables as Partial<ProjectileMotionVariables>),
        };
        const nextPlan = {
          ...state.planned.plan,
          variables: nextVariables,
        };

        return {
          planned: {
            ...state.planned,
            plan: nextPlan,
            measurements: solveProjectileMotion(nextVariables),
          },
          saveStatus: { kind: "idle" },
        };
      }

      if (state.planned.plan.concept === "spring_oscillator") {
        const nextVariables = {
          ...state.planned.plan.variables,
          ...(variables as Partial<SpringOscillatorVariables>),
        };
        const nextPlan = {
          ...state.planned.plan,
          variables: nextVariables,
        };

        return {
          planned: {
            ...state.planned,
            plan: nextPlan,
            measurements: solveSpringOscillator(nextVariables),
          },
          saveStatus: { kind: "idle" },
        };
      }

      const nextPlan = {
        ...state.planned.plan,
        variables: {
          ...state.planned.plan.variables,
          ...(variables as Record<string, number>),
        },
      } as SimulationPlan;

      return {
        planned: {
          ...state.planned,
          plan: nextPlan,
          measurements: solveGenericTemplate(nextPlan),
        },
        saveStatus: { kind: "idle" },
      };
    });
  },
  loadLocalInclinedPlaneDemo() {
    set({ planned: createLocalDemo(), saveStatus: { kind: "idle" }, status: { kind: "ready" } });
  },
  reset() {
    set({ planned: null, saveStatus: { kind: "idle" }, status: { kind: "idle" } });
  },
}));

export function resetSimulationClientState() {
  useSimulationClient.getState().reset();
}
