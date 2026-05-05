import React from "react";

import type { SimulationConcept } from "../../../../../packages/prompt-contracts/src/simulation-spec";
import { t } from "../../i18n";
import type { Language } from "../../state/auth-store";
import type { PlannedSimulation } from "../../state/simulation-client";
import {
  createExperimentViewerPlayback,
  ExperimentPlaybackControls,
  useExperimentPlayback,
} from "./experiment-playback";

const ThreeCourseLabWorkspace = React.lazy(() => import("./ThreeCourseLabWorkspace"));

type GenericTemplateConcept = Exclude<
  SimulationConcept,
  "inclined_plane" | "projectile_motion" | "spring_oscillator"
>;

type GenericTemplateConfig = {
  accent: string;
  diagram: "pendulum" | "circle" | "collision" | "fluid" | "lever" | "circuit" | "gas" | "work" | "wave" | "refraction" | "lens" | "charges" | "rc";
  sliders: Array<{
    key: string;
    label: string;
    max: number;
    min: number;
    step: number;
    unit: string;
  }>;
  results: Array<{
    key: string;
    label: string;
    unit: string;
  }>;
};

const LOCALIZED_LABELS: Record<string, Record<Language, string>> = {
  amount: { en: "amount", "zh-CN": "物质的量" },
  amplitude: { en: "amplitude", "zh-CN": "振幅" },
  amplitudeDeg: { en: "amplitude", "zh-CN": "摆角" },
  angularFrequencyRadps: { en: "angular frequency", "zh-CN": "角频率" },
  angularSpeedRadps: { en: "angular speed", "zh-CN": "角速度" },
  balance: { en: "balance", "zh-CN": "平衡状态" },
  bottomTension: { en: "bottom tension", "zh-CN": "最低点张力" },
  buoyantForceN: { en: "buoyant force", "zh-CN": "浮力" },
  capacitance: { en: "capacitance", "zh-CN": "电容" },
  capacitanceMicroF: { en: "capacitance", "zh-CN": "电容" },
  capacitorVoltageV: { en: "capacitor voltage", "zh-CN": "电容电压" },
  centripetalAccelMps2: { en: "centripetal acceleration", "zh-CN": "向心加速度" },
  centripetalForceN: { en: "centripetal force", "zh-CN": "向心力" },
  charge: { en: "charge", "zh-CN": "电荷量" },
  charge1MicroC: { en: "charge 1", "zh-CN": "电荷 1" },
  charge2MicroC: { en: "charge 2", "zh-CN": "电荷 2" },
  chargeMicroC: { en: "charge", "zh-CN": "电荷量" },
  conductanceS: { en: "conductance", "zh-CN": "电导" },
  criticalAngleDeg: { en: "critical angle", "zh-CN": "临界角" },
  currentA: { en: "current", "zh-CN": "电流" },
  distance: { en: "distance", "zh-CN": "距离" },
  distanceM: { en: "distance", "zh-CN": "距离" },
  finalSpeedMps: { en: "final speed", "zh-CN": "末速度" },
  finalVelocity1Mps: { en: "final velocity 1", "zh-CN": "末速度 1" },
  finalVelocity2Mps: { en: "final velocity 2", "zh-CN": "末速度 2" },
  fluidDensityKgM3: { en: "fluid density", "zh-CN": "流体密度" },
  focalLengthCm: { en: "focal length", "zh-CN": "焦距" },
  force: { en: "force", "zh-CN": "力" },
  forceN: { en: "force", "zh-CN": "力" },
  frequency: { en: "frequency", "zh-CN": "频率" },
  frequencyHz: { en: "frequency", "zh-CN": "频率" },
  gravity: { en: "gravity", "zh-CN": "重力加速度" },
  gravityMps2: { en: "gravity", "zh-CN": "重力加速度" },
  imageDistanceCm: { en: "image distance", "zh-CN": "像距" },
  imageHeightCm: { en: "image height", "zh-CN": "像高" },
  imageType: { en: "image type", "zh-CN": "成像类型" },
  incidentAngleDeg: { en: "incident angle", "zh-CN": "入射角" },
  index1: { en: "index 1", "zh-CN": "折射率 1" },
  index2: { en: "index 2", "zh-CN": "折射率 2" },
  interaction: { en: "interaction", "zh-CN": "相互作用" },
  kineticEnergyGainJ: { en: "kinetic energy gain", "zh-CN": "动能增加" },
  leftArmM: { en: "left arm", "zh-CN": "左力臂" },
  leftMassKg: { en: "left mass", "zh-CN": "左侧质量" },
  leftTorqueNm: { en: "left torque", "zh-CN": "左侧力矩" },
  length: { en: "length", "zh-CN": "长度" },
  lengthM: { en: "length", "zh-CN": "长度" },
  magnification: { en: "magnification", "zh-CN": "放大率" },
  mass: { en: "mass", "zh-CN": "质量" },
  mass1Kg: { en: "mass 1", "zh-CN": "质量 1" },
  mass2Kg: { en: "mass 2", "zh-CN": "质量 2" },
  massKg: { en: "mass", "zh-CN": "质量" },
  maxSpeedMps: { en: "max speed", "zh-CN": "最大速度" },
  molesMol: { en: "amount", "zh-CN": "物质的量" },
  netForceN: { en: "net force", "zh-CN": "合力" },
  netTorqueNm: { en: "net torque", "zh-CN": "净力矩" },
  objectDistanceCm: { en: "object distance", "zh-CN": "物距" },
  objectHeightCm: { en: "object height", "zh-CN": "物高" },
  objectMassKg: { en: "object mass", "zh-CN": "物体质量" },
  objectVolumeL: { en: "object volume", "zh-CN": "物体体积" },
  period: { en: "period", "zh-CN": "周期" },
  periodS: { en: "period", "zh-CN": "周期" },
  potentialEnergyJ: { en: "potential energy", "zh-CN": "势能" },
  powerW: { en: "power", "zh-CN": "功率" },
  pressure: { en: "pressure", "zh-CN": "压强" },
  pressureAtm: { en: "pressure", "zh-CN": "压强" },
  pressureKpa: { en: "pressure", "zh-CN": "压强" },
  radiusM: { en: "radius", "zh-CN": "半径" },
  refractedAngleDeg: { en: "refracted angle", "zh-CN": "折射角" },
  refractiveIndex1: { en: "index 1", "zh-CN": "折射率 1" },
  refractiveIndex2: { en: "index 2", "zh-CN": "折射率 2" },
  resistance: { en: "resistance", "zh-CN": "电阻" },
  resistanceOhm: { en: "resistance", "zh-CN": "电阻" },
  rightArmM: { en: "right arm", "zh-CN": "右力臂" },
  rightMassKg: { en: "right mass", "zh-CN": "右侧质量" },
  rightTorqueNm: { en: "right torque", "zh-CN": "右侧力矩" },
  speed: { en: "speed", "zh-CN": "速度" },
  speedMps: { en: "speed", "zh-CN": "速度" },
  speedRatio: { en: "speed ratio", "zh-CN": "速度比" },
  temperature: { en: "temperature", "zh-CN": "温度" },
  temperatureK: { en: "temperature", "zh-CN": "温度" },
  tensionAtBottomN: { en: "bottom tension", "zh-CN": "最低点张力" },
  thermalEnergyJ: { en: "thermal energy", "zh-CN": "热能" },
  time: { en: "time", "zh-CN": "时间" },
  timeConstantMs: { en: "time constant", "zh-CN": "时间常数" },
  timeMs: { en: "time", "zh-CN": "时间" },
  totalInternalReflection: { en: "total internal reflection", "zh-CN": "全反射" },
  totalKineticEnergyJ: { en: "total kinetic energy", "zh-CN": "总动能" },
  totalMomentumKgMps: { en: "total momentum", "zh-CN": "总动量" },
  velocity1Mps: { en: "velocity 1", "zh-CN": "速度 1" },
  velocity2Mps: { en: "velocity 2", "zh-CN": "速度 2" },
  voltage: { en: "voltage", "zh-CN": "电压" },
  voltageV: { en: "voltage", "zh-CN": "电压" },
  volume: { en: "volume", "zh-CN": "体积" },
  volumeL: { en: "volume", "zh-CN": "体积" },
  wavelength: { en: "wavelength", "zh-CN": "波长" },
  wavelengthM: { en: "wavelength", "zh-CN": "波长" },
  weightN: { en: "weight", "zh-CN": "重力" },
  willFloat: { en: "will float", "zh-CN": "是否漂浮" },
  workJ: { en: "work", "zh-CN": "功" },
};

const GENERIC_TEMPLATE_CONFIGS: Record<GenericTemplateConcept, GenericTemplateConfig> = {
  pendulum: {
    accent: "#5fc7ff",
    diagram: "pendulum",
    sliders: [
      { key: "lengthM", label: "length", max: 10, min: 0.1, step: 0.1, unit: "m" },
      { key: "gravityMps2", label: "gravity", max: 20, min: 1, step: 0.01, unit: "m/s²" },
      { key: "amplitudeDeg", label: "amplitude", max: 45, min: 1, step: 1, unit: "°" },
      { key: "massKg", label: "mass", max: 20, min: 0.1, step: 0.1, unit: "kg" },
    ],
    results: [
      { key: "periodS", label: "period", unit: "s" },
      { key: "frequencyHz", label: "frequency", unit: "Hz" },
      { key: "maxSpeedMps", label: "max speed", unit: "m/s" },
      { key: "tensionAtBottomN", label: "bottom tension", unit: "N" },
    ],
  },
  circular_motion: {
    accent: "#7c88ff",
    diagram: "circle",
    sliders: [
      { key: "radiusM", label: "radius", max: 20, min: 0.1, step: 0.1, unit: "m" },
      { key: "speedMps", label: "speed", max: 100, min: 0.1, step: 0.1, unit: "m/s" },
      { key: "massKg", label: "mass", max: 20, min: 0.1, step: 0.1, unit: "kg" },
    ],
    results: [
      { key: "angularSpeedRadps", label: "angular speed", unit: "rad/s" },
      { key: "centripetalAccelMps2", label: "centripetal acceleration", unit: "m/s²" },
      { key: "centripetalForceN", label: "centripetal force", unit: "N" },
      { key: "periodS", label: "period", unit: "s" },
    ],
  },
  elastic_collision: {
    accent: "#ffbf5f",
    diagram: "collision",
    sliders: [
      { key: "mass1Kg", label: "mass 1", max: 20, min: 0.1, step: 0.1, unit: "kg" },
      { key: "mass2Kg", label: "mass 2", max: 20, min: 0.1, step: 0.1, unit: "kg" },
      { key: "velocity1Mps", label: "velocity 1", max: 30, min: -30, step: 0.5, unit: "m/s" },
      { key: "velocity2Mps", label: "velocity 2", max: 30, min: -30, step: 0.5, unit: "m/s" },
    ],
    results: [
      { key: "finalVelocity1Mps", label: "final velocity 1", unit: "m/s" },
      { key: "finalVelocity2Mps", label: "final velocity 2", unit: "m/s" },
      { key: "totalMomentumKgMps", label: "total momentum", unit: "kg·m/s" },
      { key: "totalKineticEnergyJ", label: "total kinetic energy", unit: "J" },
    ],
  },
  buoyancy: {
    accent: "#5fc7ff",
    diagram: "fluid",
    sliders: [
      { key: "objectVolumeL", label: "object volume", max: 500, min: 0.1, step: 0.1, unit: "L" },
      { key: "objectMassKg", label: "object mass", max: 1000, min: 0.01, step: 0.1, unit: "kg" },
      { key: "fluidDensityKgM3", label: "fluid density", max: 2000, min: 100, step: 10, unit: "kg/m³" },
    ],
    results: [
      { key: "buoyantForceN", label: "buoyant force", unit: "N" },
      { key: "weightN", label: "weight", unit: "N" },
      { key: "netForceN", label: "net force", unit: "N" },
      { key: "willFloat", label: "will float", unit: "" },
    ],
  },
  lever_balance: {
    accent: "#9ef0b8",
    diagram: "lever",
    sliders: [
      { key: "leftMassKg", label: "left mass", max: 100, min: 0.1, step: 0.1, unit: "kg" },
      { key: "rightMassKg", label: "right mass", max: 100, min: 0.1, step: 0.1, unit: "kg" },
      { key: "leftArmM", label: "left arm", max: 10, min: 0.1, step: 0.1, unit: "m" },
      { key: "rightArmM", label: "right arm", max: 10, min: 0.1, step: 0.1, unit: "m" },
    ],
    results: [
      { key: "leftTorqueNm", label: "left torque", unit: "N·m" },
      { key: "rightTorqueNm", label: "right torque", unit: "N·m" },
      { key: "netTorqueNm", label: "net torque", unit: "N·m" },
      { key: "balance", label: "balance", unit: "" },
    ],
  },
  ohms_law: {
    accent: "#ffdf5f",
    diagram: "circuit",
    sliders: [
      { key: "voltageV", label: "voltage", max: 240, min: 0.1, step: 0.1, unit: "V" },
      { key: "resistanceOhm", label: "resistance", max: 10000, min: 0.1, step: 0.1, unit: "Ω" },
    ],
    results: [
      { key: "currentA", label: "current", unit: "A" },
      { key: "powerW", label: "power", unit: "W" },
      { key: "conductanceS", label: "conductance", unit: "S" },
    ],
  },
  ideal_gas: {
    accent: "#c9a7ff",
    diagram: "gas",
    sliders: [
      { key: "molesMol", label: "amount", max: 100, min: 0.01, step: 0.01, unit: "mol" },
      { key: "temperatureK", label: "temperature", max: 1000, min: 100, step: 1, unit: "K" },
      { key: "volumeL", label: "volume", max: 1000, min: 0.1, step: 0.1, unit: "L" },
    ],
    results: [
      { key: "pressureKpa", label: "pressure", unit: "kPa" },
      { key: "pressureAtm", label: "pressure", unit: "atm" },
      { key: "thermalEnergyJ", label: "thermal energy", unit: "J" },
    ],
  },
  work_energy: {
    accent: "#ffbf5f",
    diagram: "work",
    sliders: [
      { key: "forceN", label: "force", max: 1000, min: 0.1, step: 0.1, unit: "N" },
      { key: "distanceM", label: "distance", max: 100, min: 0.1, step: 0.1, unit: "m" },
      { key: "angleDeg", label: "angle", max: 180, min: 0, step: 1, unit: "°" },
      { key: "massKg", label: "mass", max: 100, min: 0.1, step: 0.1, unit: "kg" },
    ],
    results: [
      { key: "workJ", label: "work", unit: "J" },
      { key: "kineticEnergyGainJ", label: "kinetic energy gain", unit: "J" },
      { key: "finalSpeedMps", label: "final speed", unit: "m/s" },
    ],
  },
  wave_speed: {
    accent: "#5fc7ff",
    diagram: "wave",
    sliders: [
      { key: "frequencyHz", label: "frequency", max: 100000, min: 0.01, step: 0.01, unit: "Hz" },
      { key: "wavelengthM", label: "wavelength", max: 10000, min: 0.000001, step: 0.1, unit: "m" },
      { key: "amplitudeM", label: "amplitude", max: 100, min: 0, step: 0.1, unit: "m" },
    ],
    results: [
      { key: "speedMps", label: "speed", unit: "m/s" },
      { key: "periodS", label: "period", unit: "s" },
      { key: "angularFrequencyRadps", label: "angular frequency", unit: "rad/s" },
    ],
  },
  refraction: {
    accent: "#9ef0b8",
    diagram: "refraction",
    sliders: [
      { key: "incidentAngleDeg", label: "incident angle", max: 89, min: 0, step: 1, unit: "°" },
      { key: "refractiveIndex1", label: "index 1", max: 3, min: 1, step: 0.01, unit: "" },
      { key: "refractiveIndex2", label: "index 2", max: 3, min: 1, step: 0.01, unit: "" },
    ],
    results: [
      { key: "refractedAngleDeg", label: "refracted angle", unit: "°" },
      { key: "criticalAngleDeg", label: "critical angle", unit: "°" },
      { key: "speedRatio", label: "speed ratio", unit: "" },
      { key: "totalInternalReflection", label: "total internal reflection", unit: "" },
    ],
  },
  lens_imaging: {
    accent: "#c9a7ff",
    diagram: "lens",
    sliders: [
      { key: "focalLengthCm", label: "focal length", max: 200, min: 1, step: 1, unit: "cm" },
      { key: "objectDistanceCm", label: "object distance", max: 500, min: 1, step: 1, unit: "cm" },
      { key: "objectHeightCm", label: "object height", max: 100, min: 0.1, step: 0.1, unit: "cm" },
    ],
    results: [
      { key: "imageDistanceCm", label: "image distance", unit: "cm" },
      { key: "magnification", label: "magnification", unit: "" },
      { key: "imageHeightCm", label: "image height", unit: "cm" },
      { key: "imageType", label: "image type", unit: "" },
    ],
  },
  coulombs_law: {
    accent: "#ffdf5f",
    diagram: "charges",
    sliders: [
      { key: "charge1MicroC", label: "charge 1", max: 1000, min: -1000, step: 1, unit: "µC" },
      { key: "charge2MicroC", label: "charge 2", max: 1000, min: -1000, step: 1, unit: "µC" },
      { key: "distanceM", label: "distance", max: 100, min: 0.01, step: 0.01, unit: "m" },
    ],
    results: [
      { key: "forceN", label: "force", unit: "N" },
      { key: "potentialEnergyJ", label: "potential energy", unit: "J" },
      { key: "interaction", label: "interaction", unit: "" },
    ],
  },
  rc_circuit: {
    accent: "#ffbf5f",
    diagram: "rc",
    sliders: [
      { key: "voltageV", label: "voltage", max: 240, min: 0.1, step: 0.1, unit: "V" },
      { key: "resistanceOhm", label: "resistance", max: 1000000, min: 1, step: 1, unit: "Ω" },
      { key: "capacitanceMicroF", label: "capacitance", max: 100000, min: 0.001, step: 1, unit: "µF" },
      { key: "timeMs", label: "time", max: 1000000, min: 0, step: 1, unit: "ms" },
    ],
    results: [
      { key: "timeConstantMs", label: "time constant", unit: "ms" },
      { key: "capacitorVoltageV", label: "capacitor voltage", unit: "V" },
      { key: "currentA", label: "current", unit: "A" },
      { key: "chargeMicroC", label: "charge", unit: "µC" },
    ],
  },
};

function VariableSlider(props: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="experiment-slider" htmlFor={props.id}>
      <span className="data-label">{props.label}</span>
      <input
        aria-label={props.label}
        id={props.id}
        max={props.max}
        min={props.min}
        step={props.step}
        type="range"
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
      <span className="data-value">{`${props.value}${props.unit}`}</span>
    </label>
  );
}

function localizedLabel(language: Language, key: string, fallback: string): string {
  return LOCALIZED_LABELS[key]?.[language] ?? fallback;
}

function formatBoolean(language: Language, value: boolean): string {
  if (language === "zh-CN") {
    return value ? "是" : "否";
  }

  return value ? "yes" : "no";
}

function formatEnumValue(language: Language, value: string): string {
  const values: Record<string, Record<Language, string>> = {
    at_infinity: { en: "at infinity", "zh-CN": "在无穷远处" },
    attraction: { en: "attraction", "zh-CN": "吸引" },
    balanced: { en: "balanced", "zh-CN": "平衡" },
    left_down: { en: "left side down", "zh-CN": "左侧下沉" },
    neutral: { en: "neutral", "zh-CN": "中性" },
    real_inverted: { en: "real inverted", "zh-CN": "倒立实像" },
    repulsion: { en: "repulsion", "zh-CN": "排斥" },
    right_down: { en: "right side down", "zh-CN": "右侧下沉" },
    virtual_upright: { en: "virtual upright", "zh-CN": "正立虚像" },
  };

  return values[value]?.[language] ?? value;
}

export default function GenericTemplateExperiment(props: {
  language: Language;
  planned: PlannedSimulation & { plan: { concept: GenericTemplateConcept } };
  onVariablesChange: (variables: Record<string, number>) => void;
}) {
  const { plan, measurements } = props.planned;
  const config = GENERIC_TEMPLATE_CONFIGS[plan.concept];
  const variables = plan.variables as unknown as Record<string, number>;
  const resultValues = measurements as unknown as Record<string, number | string | boolean | null>;
  const playback = useExperimentPlayback(2200, [plan.concept, JSON.stringify(variables)]);

  function formatValue(value: number | string | boolean | null | undefined, unit: string): string {
    if (value === null || value === undefined) {
      return props.language === "zh-CN" ? "无" : "none";
    }

    if (typeof value === "boolean") {
      return formatBoolean(props.language, value);
    }

    if (typeof value === "string") {
      return formatEnumValue(props.language, value);
    }

    return `${value}${unit ? ` ${unit}` : ""}`;
  }

  return (
    <section aria-label="Generated Experiment" className="panel experiment-panel">
      <div className="panel-title-row">
        <span className="panel-kicker">{t(props.language, "experiment")}</span>
        <h2 className="panel-title">{plan.title}</h2>
        <p className="panel-copy">{plan.objective}</p>
      </div>

      <div className="full-3d-lab-workspace">
        <div className="experiment-tools-rail">
          <ExperimentPlaybackControls language={props.language} playback={playback} />
          <div className="experiment-controls">
            {config.sliders.map((slider) => (
              <VariableSlider
                key={slider.key}
                id={slider.key}
                label={localizedLabel(props.language, slider.key, slider.label)}
                max={slider.max}
                min={slider.min}
                step={slider.step}
                unit={slider.unit}
                value={variables[slider.key]}
                onChange={(value) => props.onVariablesChange({ [slider.key]: value })}
              />
            ))}
          </div>

          <div className="experiment-results">
            {config.results.map((result) => (
              <p className="data-value" key={result.key}>
                {`${localizedLabel(props.language, result.key, result.label)}${props.language === "zh-CN" ? "：" : ": "}${formatValue(resultValues[result.key], result.unit)}`}
              </p>
            ))}
            <p className="panel-copy">{props.planned.explanation}</p>
          </div>
        </div>
        <React.Suspense fallback={<div className="experiment-3d-fallback">Loading 3D...</div>}>
          <ThreeCourseLabWorkspace
            language={props.language}
            measurements={measurements as Record<string, unknown>}
            planned={props.planned}
            playback={createExperimentViewerPlayback(playback)}
          />
        </React.Suspense>
      </div>

      <div className="experiment-questions">
        <h3 className="group-title">{t(props.language, "guidingQuestions")}</h3>
        <ul>
          {plan.guidingQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
