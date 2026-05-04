import type {
  SimulationConcept,
  SimulationPlan,
} from "../../../../../packages/prompt-contracts/src/simulation-spec";
import type { Language } from "../../state/auth-store";

export type LessonStepId = "predict" | "run" | "measure" | "explain" | "try";

export type LessonStep = {
  id: LessonStepId;
  title: string;
  prompt: string;
  focusRoles: string[];
  measurementKeys?: string[];
  variation?: {
    label: string;
    variables: Record<string, number>;
  };
};

export type LessonFlow = {
  concept: SimulationConcept;
  steps: LessonStep[];
};

type LessonFlowInput = {
  language: Language;
  plan: SimulationPlan;
  measurements: Record<string, unknown>;
};

const TITLES: Record<Language, Record<LessonStepId, string>> = {
  en: {
    explain: "Explain",
    measure: "Measure",
    predict: "Predict",
    run: "Run",
    try: "Try Variation",
  },
  "zh-CN": {
    explain: "解释",
    measure: "测量",
    predict: "预测",
    run: "运行",
    try: "试试变体",
  },
};

const CONCEPT_ROLES: Record<SimulationConcept, string[]> = {
  buoyancy: ["moving-object", "field", "force-vector", "measurement-line"],
  circular_motion: ["moving-object", "path", "force-vector", "measurement-line"],
  coulombs_law: ["source", "target", "field", "force-vector"],
  elastic_collision: ["source", "target", "path", "force-vector"],
  ideal_gas: ["field", "moving-object", "measurement-line"],
  inclined_plane: ["moving-object", "surface", "path", "force-vector", "measurement-line"],
  lens_imaging: ["source", "target", "path", "measurement-line"],
  lever_balance: ["surface", "source", "target", "measurement-line"],
  ohms_law: ["component", "path", "field", "measurement-line"],
  pendulum: ["moving-object", "source", "path", "force-vector"],
  projectile_motion: ["moving-object", "source", "path", "measurement-line"],
  rc_circuit: ["component", "path", "field", "measurement-line"],
  refraction: ["source", "target", "path", "measurement-line"],
  spring_oscillator: ["moving-object", "source", "path", "measurement-line"],
  wave_speed: ["field", "path", "measurement-line"],
  work_energy: ["moving-object", "path", "force-vector", "measurement-line"],
};

const MEASUREMENT_KEYS: Record<SimulationConcept, string[]> = {
  buoyancy: ["buoyantForceN", "weightN", "netForceN"],
  circular_motion: ["centripetalAccelMps2", "centripetalForceN", "periodS"],
  coulombs_law: ["forceN", "interaction", "distanceM"],
  elastic_collision: ["finalVelocity1Mps", "finalVelocity2Mps", "totalMomentumKgMps"],
  ideal_gas: ["pressureKpa", "pressureAtm", "thermalEnergyJ"],
  inclined_plane: ["accelerationMps2", "timeToBottomS", "finalSpeedMps"],
  lens_imaging: ["imageDistanceCm", "imageHeightCm", "magnification"],
  lever_balance: ["leftTorqueNm", "rightTorqueNm", "netTorqueNm"],
  ohms_law: ["currentA", "powerW", "conductanceS"],
  pendulum: ["periodS", "frequencyHz", "maxSpeedMps"],
  projectile_motion: ["rangeM", "flightTimeS", "maxHeightM"],
  rc_circuit: ["capacitorVoltageV", "currentA", "timeConstantMs"],
  refraction: ["refractedAngleDeg", "criticalAngleDeg", "totalInternalReflection"],
  spring_oscillator: ["periodS", "maxSpeedMps", "energyJ"],
  wave_speed: ["speedMps", "frequencyHz", "wavelengthM"],
  work_energy: ["workJ", "kineticEnergyGainJ", "finalSpeedMps"],
};

function firstNumericVariable(plan: SimulationPlan): [string, number] {
  for (const [key, value] of Object.entries(plan.variables)) {
    if (typeof value === "number") {
      return [key, value];
    }
  }
  return ["", 0];
}

function variationFor(plan: SimulationPlan, language: Language) {
  const [key, value] = firstNumericVariable(plan);
  const nextValue = Math.round((value * 1.15 + Number.EPSILON) * 100) / 100;

  return {
    label: language === "zh-CN" ? "调整一个变量并重新运行" : "Change one variable and run again",
    variables: key ? { [key]: nextValue } : {},
  };
}

export function createLessonFlow(input: LessonFlowInput): LessonFlow {
  const titles = TITLES[input.language];
  const roles = CONCEPT_ROLES[input.plan.concept];
  const measurementKeys = MEASUREMENT_KEYS[input.plan.concept];
  const zh = input.language === "zh-CN";

  return {
    concept: input.plan.concept,
    steps: [
      {
        focusRoles: roles.slice(0, 2),
        id: "predict",
        prompt: zh
          ? "先预测：改变关键变量后，运动或读数会怎样变化？"
          : "Predict how the motion or readings will change when the key variable changes.",
        title: titles.predict,
      },
      {
        focusRoles: roles.includes("path") ? ["moving-object", "path"] : roles.slice(0, 2),
        id: "run",
        prompt: zh ? "播放实验，观察运动对象和轨迹。" : "Run the experiment and watch the moving object and path.",
        title: titles.run,
      },
      {
        focusRoles: roles.includes("measurement-line") ? ["measurement-line"] : roles.slice(0, 1),
        id: "measure",
        measurementKeys,
        prompt: zh
          ? "读取关键测量值，并把它们和预测对比。"
          : "Read the key measurements and compare them with your prediction.",
        title: titles.measure,
      },
      {
        focusRoles: roles.includes("force-vector") ? ["force-vector"] : roles.slice(0, 1),
        id: "explain",
        prompt: input.plan.objective,
        title: titles.explain,
      },
      {
        focusRoles: roles.slice(0, 2),
        id: "try",
        prompt: zh ? "应用一个安全变体，重置后再次运行。" : "Apply one safe variation, reset, and run the experiment again.",
        title: titles.try,
        variation: variationFor(input.plan, input.language),
      },
    ],
  };
}
