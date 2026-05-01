import React from "react";

import type { SimulationConcept } from "../../../../../packages/prompt-contracts/src/simulation-spec";
import { t } from "../../i18n";
import type { Language } from "../../state/auth-store";
import type { PlannedSimulation } from "../../state/simulation-client";
import { ExperimentPlaybackControls, type ExperimentPlayback, useExperimentPlayback } from "./experiment-playback";

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function variableValue(variables: Record<string, number>, key: string, fallback: number): number {
  const value = variables[key];

  return Number.isFinite(value) ? value : fallback;
}

function motionSignature(diagram: GenericTemplateConfig["diagram"], variables: Record<string, number>): string {
  const variableSignature = Object.keys(variables)
    .sort()
    .map((key) => `${key}:${Math.round(variableValue(variables, key, 0) * 100) / 100}`)
    .join("|");

  return `${diagram}:${variableSignature}`;
}

function motionPoint(
  diagram: GenericTemplateConfig["diagram"],
  progress: number,
  variables: Record<string, number>,
): { x: number; y: number } {
  const phase = progress * Math.PI * 2;

  if (diagram === "pendulum") {
    const length = clamp(variableValue(variables, "lengthM", 3) / 10, 0.18, 1);
    const amplitude = clamp(variableValue(variables, "amplitudeDeg", 18) / 45, 0.08, 1);

    return {
      x: 160 + (18 + 52 * amplitude) * Math.sin(phase),
      y: 68 + 72 * length - 8 * Math.cos(phase),
    };
  }
  if (diagram === "circle") {
    const radius = clamp(variableValue(variables, "radiusM", 6) * 4.5, 28, 68);

    return { x: 160 + radius * Math.cos(phase), y: 90 + radius * Math.sin(phase) };
  }
  if (diagram === "collision") {
    const velocity1 = variableValue(variables, "velocity1Mps", 10);
    const velocity2 = variableValue(variables, "velocity2Mps", -4);
    const span = clamp(74 + Math.abs(velocity1 - velocity2) * 2.2, 78, 172);
    const direction = velocity1 >= velocity2 ? 1 : -1;
    const massLift = clamp((variableValue(variables, "mass1Kg", 4) - variableValue(variables, "mass2Kg", 4)) * 1.3, -18, 18);

    return {
      x: direction > 0 ? 78 + span * progress : 242 - span * progress,
      y: 100 + massLift,
    };
  }
  if (diagram === "fluid") {
    const displacedMass = variableValue(variables, "fluidDensityKgM3", 1000) * variableValue(variables, "objectVolumeL", 5) / 1000;
    const objectMass = variableValue(variables, "objectMassKg", 3);
    const floatBias = clamp((objectMass - displacedMass) * 3, -26, 26);

    return { x: 161, y: 103 + floatBias + 10 * Math.sin(phase) };
  }
  if (diagram === "lever") {
    const leftTorque = variableValue(variables, "leftMassKg", 5) * variableValue(variables, "leftArmM", 2);
    const rightTorque = variableValue(variables, "rightMassKg", 5) * variableValue(variables, "rightArmM", 2);
    const tilt = clamp((leftTorque - rightTorque) / Math.max(leftTorque + rightTorque, 1), -1, 1);

    return { x: 95 + 130 * progress, y: 112 + tilt * (progress - 0.5) * 42 + 6 * Math.sin(phase) };
  }
  if (diagram === "circuit" || diagram === "rc") {
    const voltage = variableValue(variables, "voltageV", 12);
    const resistance = variableValue(variables, "resistanceOhm", 100);
    const currentScale = clamp(voltage / Math.max(resistance, 0.1), 0, 2);
    const trackShift = currentScale * 7;
    const x = 80 + 160 * ((progress * (0.65 + currentScale * 0.35)) % 1);

    return { x, y: progress < 0.5 ? 55 - trackShift : 125 + trackShift };
  }
  if (diagram === "gas") {
    const temperature = variableValue(variables, "temperatureK", 300);
    const volume = variableValue(variables, "volumeL", 20);
    const speed = clamp(temperature / 300, 0.5, 2.2);
    const spread = clamp(volume / 8, 1, 34);

    return { x: 105 + 110 * ((progress * speed) % 1), y: 76 + spread * Math.sin(phase * speed) };
  }
  if (diagram === "work") {
    const distance = clamp(variableValue(variables, "distanceM", 10) * 2, 46, 154);
    const angle = (variableValue(variables, "angleDeg", 0) * Math.PI) / 180;

    return { x: 86 + distance * progress, y: 108 - clamp(Math.sin(angle) * 34, 0, 34) * progress };
  }
  if (diagram === "wave") {
    const amplitude = clamp(variableValue(variables, "amplitudeM", 3) * 1.3, 8, 44);
    const wavelength = variableValue(variables, "wavelengthM", 4);
    const cycles = clamp(8 / Math.max(wavelength, 0.1), 0.6, 4);
    const frequency = clamp(variableValue(variables, "frequencyHz", 2), 0.2, 8);

    return { x: 35 + 270 * progress, y: 95 + amplitude * Math.sin(phase * cycles + frequency * progress) };
  }
  if (diagram === "refraction") {
    const incident = clamp(variableValue(variables, "incidentAngleDeg", 35), 0, 89) * (Math.PI / 180);
    const n1 = variableValue(variables, "refractiveIndex1", 1);
    const n2 = variableValue(variables, "refractiveIndex2", 1.5);
    const refracted = Math.asin(clamp((n1 / Math.max(n2, 0.01)) * Math.sin(incident), -0.98, 0.98));
    const incomingStart = { x: 160 - 98 * Math.sin(incident), y: 90 - 82 * Math.cos(incident) };
    const outgoingEnd = { x: 160 + 118 * Math.sin(refracted), y: 90 + 82 * Math.cos(refracted) };

    return progress < 0.5
      ? {
          x: incomingStart.x + (160 - incomingStart.x) * progress * 2,
          y: incomingStart.y + (90 - incomingStart.y) * progress * 2,
        }
      : {
          x: 160 + (outgoingEnd.x - 160) * (progress - 0.5) * 2,
          y: 90 + (outgoingEnd.y - 90) * (progress - 0.5) * 2,
        };
  }
  if (diagram === "lens") {
    const objectDistance = variableValue(variables, "objectDistanceCm", 60);
    const focalLength = variableValue(variables, "focalLengthCm", 30);
    const span = clamp(objectDistance / Math.max(focalLength, 1) * 52, 72, 164);
    const objectHeight = clamp(variableValue(variables, "objectHeightCm", 20), 4, 80);

    return { x: 160 - span / 2 + span * progress, y: 90 + objectHeight * 0.28 * Math.sin(phase) };
  }
  if (diagram === "charges") {
    const distance = clamp(variableValue(variables, "distanceM", 2) * 3.4, 42, 138);
    const charge1 = variableValue(variables, "charge1MicroC", 1);
    const charge2 = variableValue(variables, "charge2MicroC", -1);
    const attracts = charge1 * charge2 < 0;
    const center = 160;
    const offset = distance / 2;

    return {
      x: attracts ? center - offset + distance * progress : center - offset - 24 * progress,
      y: 90 + clamp(Math.abs(charge1 + charge2) / 80, 0, 18) * Math.sin(phase),
    };
  }

  return { x: 82 + 156 * progress, y: 95 };
}

function MotionMarker(props: {
  diagram: GenericTemplateConfig["diagram"];
  playback: ExperimentPlayback;
  variables: Record<string, number>;
}) {
  const point = motionPoint(props.diagram, props.playback.progress, props.variables);

  return (
    <circle
      cx={point.x}
      cy={point.y}
      data-motion-signature={motionSignature(props.diagram, props.variables)}
      data-progress={String(props.playback.progressPercent)}
      data-running={String(props.playback.isRunning)}
      data-testid="experiment-motion-marker"
      r="8"
      fill="#f4f7fb"
      stroke="#07121f"
      strokeWidth="2"
    />
  );
}

function GenericTemplateDiagram(props: {
  config: GenericTemplateConfig;
  playback: ExperimentPlayback;
  title: string;
  variables: Record<string, number>;
}) {
  const marker = <MotionMarker diagram={props.config.diagram} playback={props.playback} variables={props.variables} />;

  if (props.config.diagram === "pendulum") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <line x1="160" x2="210" y1="30" y2="125" stroke="#7c88ff" strokeWidth="4" />
        <circle cx="210" cy="125" r="18" fill={props.config.accent} />
        <line x1="110" x2="210" y1="30" y2="30" stroke="#344054" strokeWidth="8" />
        {marker}
      </svg>
    );
  }

  if (props.config.diagram === "circle") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <circle cx="160" cy="90" r="58" fill="none" stroke="#7c88ff" strokeWidth="5" />
        <circle cx="218" cy="90" r="14" fill={props.config.accent} />
        <line x1="160" x2="218" y1="90" y2="90" stroke="#344054" strokeWidth="3" />
        {marker}
      </svg>
    );
  }

  if (props.config.diagram === "collision") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <line x1="40" x2="280" y1="125" y2="125" stroke="#344054" strokeWidth="3" />
        <rect x="85" y="82" width="48" height="38" rx="6" fill={props.config.accent} />
        <rect x="190" y="76" width="62" height="44" rx="6" fill="#5fc7ff" />
        <path d="M 143 100 L 175 100" stroke="#f4f7fb" strokeWidth="4" strokeLinecap="round" />
        {marker}
      </svg>
    );
  }

  if (props.config.diagram === "fluid") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <rect x="70" y="58" width="180" height="92" rx="8" fill="#113044" stroke="#344054" strokeWidth="4" />
        <path d="M 72 95 C 105 83 130 107 160 95 S 215 83 248 95 L 248 148 L 72 148 Z" fill="#5fc7ff" opacity="0.55" />
        <rect x="140" y="82" width="42" height="42" rx="5" fill={props.config.accent} />
        {marker}
      </svg>
    );
  }

  if (props.config.diagram === "lever") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <polygon points="160,92 135,145 185,145" fill="#344054" />
        <line x1="70" x2="250" y1="92" y2="92" stroke="#7c88ff" strokeWidth="8" strokeLinecap="round" />
        <circle cx="95" cy="112" r="17" fill={props.config.accent} />
        <circle cx="225" cy="112" r="17" fill="#5fc7ff" />
        {marker}
      </svg>
    );
  }

  if (props.config.diagram === "circuit") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <path d="M 80 55 H 240 V 125 H 80 Z" fill="none" stroke="#7c88ff" strokeWidth="5" />
        <path d="M 135 55 h 12 l 8 -12 l 16 24 l 16 -24 l 8 12 h 18" fill="none" stroke={props.config.accent} strokeWidth="4" />
        <line x1="105" x2="105" y1="107" y2="143" stroke="#f4f7fb" strokeWidth="4" />
        <line x1="117" x2="117" y1="116" y2="134" stroke="#f4f7fb" strokeWidth="4" />
        {marker}
      </svg>
    );
  }

  if (props.config.diagram === "work") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <line x1="62" x2="270" y1="130" y2="130" stroke="#344054" strokeWidth="3" />
        <rect x="118" y="86" width="62" height="44" rx="6" fill="#5fc7ff" />
        <path d="M 190 108 H 248" stroke={props.config.accent} strokeWidth="6" strokeLinecap="round" />
        <path d="M 248 108 L 232 96 M 248 108 L 232 120" stroke={props.config.accent} strokeWidth="6" strokeLinecap="round" />
        {marker}
      </svg>
    );
  }

  if (props.config.diagram === "wave") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <path d="M 35 95 C 65 45 95 145 125 95 S 185 45 215 95 S 275 145 305 95" fill="none" stroke={props.config.accent} strokeWidth="6" strokeLinecap="round" />
        <line x1="36" x2="304" y1="95" y2="95" stroke="#344054" strokeWidth="2" />
        {marker}
      </svg>
    );
  }

  if (props.config.diagram === "refraction") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <line x1="45" x2="275" y1="90" y2="90" stroke="#344054" strokeWidth="4" />
        <line x1="160" x2="160" y1="30" y2="150" stroke="#344054" strokeDasharray="6 6" strokeWidth="2" />
        <path d="M 82 35 L 160 90 L 222 145" fill="none" stroke={props.config.accent} strokeWidth="6" strokeLinecap="round" />
        {marker}
      </svg>
    );
  }

  if (props.config.diagram === "lens") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <line x1="35" x2="285" y1="90" y2="90" stroke="#344054" strokeWidth="2" />
        <path d="M 160 38 C 185 65 185 115 160 142 C 135 115 135 65 160 38 Z" fill="none" stroke={props.config.accent} strokeWidth="5" />
        <line x1="90" x2="90" y1="90" y2="45" stroke="#5fc7ff" strokeWidth="5" />
        <line x1="220" x2="220" y1="90" y2="120" stroke="#ffbf5f" strokeWidth="5" />
        {marker}
      </svg>
    );
  }

  if (props.config.diagram === "charges") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <circle cx="105" cy="90" r="28" fill="#5fc7ff" />
        <circle cx="215" cy="90" r="28" fill={props.config.accent} />
        <line x1="135" x2="185" y1="90" y2="90" stroke="#f4f7fb" strokeWidth="4" strokeLinecap="round" />
        <text x="99" y="98" fill="#07121f" fontSize="24">+</text>
        <text x="209" y="98" fill="#07121f" fontSize="24">-</text>
        {marker}
      </svg>
    );
  }

  if (props.config.diagram === "rc") {
    return (
      <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
        <path d="M 70 60 H 250 V 125 H 70 Z" fill="none" stroke="#7c88ff" strokeWidth="5" />
        <path d="M 118 60 h 10 l 7 -10 l 14 20 l 14 -20 l 7 10 h 10" fill="none" stroke={props.config.accent} strokeWidth="4" />
        <line x1="215" x2="215" y1="45" y2="78" stroke="#f4f7fb" strokeWidth="4" />
        <line x1="225" x2="225" y1="45" y2="78" stroke="#f4f7fb" strokeWidth="4" />
        {marker}
      </svg>
    );
  }

  return (
    <svg className="experiment-diagram" viewBox="0 0 320 180" role="img" aria-label={props.title}>
      <rect x="82" y="48" width="156" height="94" rx="12" fill="none" stroke="#7c88ff" strokeWidth="5" />
      <circle cx="125" cy="85" r="8" fill={props.config.accent} />
      <circle cx="174" cy="112" r="7" fill="#5fc7ff" />
      <circle cx="203" cy="78" r="6" fill="#9ef0b8" />
      {marker}
    </svg>
  );
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

      <GenericTemplateDiagram config={config} playback={playback} title={plan.title} variables={variables} />

      <ExperimentPlaybackControls language={props.language} playback={playback} />

      <div className="experiment-grid">
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
