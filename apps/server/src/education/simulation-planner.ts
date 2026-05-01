import {
  SIMULATION_CONCEPTS,
  type SimulationConcept,
  SimulationPlanSchema,
  type SimulationPlan,
  type SimulationTemplateSuggestion,
} from "../../../../packages/prompt-contracts/src/simulation-spec";
import { solveInclinedPlane, type InclinedPlaneResult } from "./inclined-plane";
import { solveProjectileMotion, type ProjectileMotionResult } from "./projectile-motion";
import { solveSpringOscillator, type SpringOscillatorResult } from "./spring-oscillator";
import {
  solveAdditionalTemplate,
  type AdditionalTemplateResult,
} from "./template-solvers";

export type PlannedSimulation = {
  plan: SimulationPlan;
  measurements: InclinedPlaneResult | ProjectileMotionResult | SpringOscillatorResult | AdditionalTemplateResult;
  explanation: string;
  unsupportedReason?: string;
};

export type SuggestedSimulationTemplates = {
  message: string;
  suggestions: SimulationTemplateSuggestion[];
  unsupportedReason: string;
};

export type SimulationPlanningResult = PlannedSimulation | SuggestedSimulationTemplates;

type PlanningOptions = {
  modelPlan?: unknown;
  selectedConcept?: unknown;
  suggestWhenUnsupported?: boolean;
};

function isInclinedPlaneQuestion(question: string): boolean {
  return /斜坡|斜面|坡道|slope|incline|inclined plane|ramp/i.test(question);
}

function isSimulationConcept(input: unknown): input is SimulationConcept {
  return typeof input === "string" && SIMULATION_CONCEPTS.includes(input as SimulationConcept);
}

function isProjectileQuestion(question: string): boolean {
  return /抛体|发射|投射|炮弹|飞多远|projectile|launch|trajectory|thrown|fly/i.test(question);
}

function isSpringQuestion(question: string): boolean {
  return /弹簧|振子|简谐|spring|oscillator|hooke|oscillation/i.test(question);
}

function matchAdditionalConcept(question: string): Exclude<
  SimulationConcept,
  "inclined_plane" | "projectile_motion" | "spring_oscillator"
> | null {
  if (/摆|单摆|pendulum/i.test(question)) {
    return "pendulum";
  }

  if (/圆周|向心|转弯|circle|circular|centripetal|turning/i.test(question)) {
    return "circular_motion";
  }

  if (/碰撞|弹性碰撞|collision|collide|elastic/i.test(question)) {
    return "elastic_collision";
  }

  if (/浮力|上浮|漂浮|水里|buoyancy|float|floating|displace/i.test(question)) {
    return "buoyancy";
  }

  if (/杠杆|平衡|支点|lever|balance|fulcrum/i.test(question)) {
    return "lever_balance";
  }

  if (/电流|电阻|电压|欧姆|current|resistor|voltage|ohm|circuit/i.test(question)) {
    if (/电容|充电|capacitor|charge|rc circuit|RC/i.test(question)) {
      return "rc_circuit";
    }

    return "ohms_law";
  }

  if (/气体|压强|压力|容器|gas|pressure|container|ideal gas/i.test(question)) {
    return "ideal_gas";
  }

  if (/功|能量|做功|work|energy|force.*box|force.*distance/i.test(question)) {
    return "work_energy";
  }

  if (/波|波长|频率|wave|wavelength|frequency/i.test(question)) {
    return "wave_speed";
  }

  if (/折射|光.*弯|入射|refraction|refract|light bend|glass/i.test(question)) {
    return "refraction";
  }

  if (/透镜|成像|焦距|lens|image|focal/i.test(question)) {
    return "lens_imaging";
  }

  if (/库仑|电荷|静电|electric force|charge|coulomb/i.test(question)) {
    return "coulombs_law";
  }

  return null;
}

function detectLanguage(question: string): "en" | "zh-CN" {
  return /[\u4e00-\u9fa5]/u.test(question) ? "zh-CN" : "en";
}

function createInclinedPlanePlan(language: "en" | "zh-CN"): SimulationPlan {
  if (language === "zh-CN") {
    return {
      concept: "inclined_plane",
      title: "斜面与摩擦",
      objective: "观察斜面角度和摩擦系数如何改变小球的加速度、到底时间和末速度。",
      variables: {
        angleDeg: 25,
        frictionCoefficient: 0.15,
        lengthM: 4,
        massKg: 1,
      },
      guidingQuestions: [
        "角度变大时，加速度为什么会变大？",
        "摩擦系数变大时，小球为什么可能不再下滑？",
        "在这个简化模型里，质量会改变加速度吗？",
      ],
    };
  }

  return {
    concept: "inclined_plane",
    title: "Inclined plane and friction",
    objective: "Observe how slope angle and friction change acceleration, time to bottom, and final speed.",
    variables: {
      angleDeg: 25,
      frictionCoefficient: 0.15,
      lengthM: 4,
      massKg: 1,
    },
    guidingQuestions: [
      "Why does acceleration increase when the angle increases?",
      "Why can high friction stop the object from sliding?",
      "Does mass change acceleration in this simplified model?",
    ],
  };
}

function createProjectileMotionPlan(language: "en" | "zh-CN"): SimulationPlan {
  if (language === "zh-CN") {
    return {
      concept: "projectile_motion",
      title: "抛体运动",
      objective: "观察发射速度、角度和初始高度如何改变飞行时间、射程和最高点。",
      variables: {
        launchSpeedMps: 18,
        launchAngleDeg: 40,
        launchHeightM: 1,
        gravityMps2: 9.81,
      },
      guidingQuestions: [
        "发射角度怎样改变射程？",
        "速度变大时，飞行时间和最高点会怎样变化？",
        "重力更强时，轨迹会怎样改变？",
      ],
    };
  }

  return {
    concept: "projectile_motion",
    title: "Projectile motion",
    objective: "Observe how launch speed, angle, and height change flight time, range, and maximum height.",
    variables: {
      launchSpeedMps: 18,
      launchAngleDeg: 40,
      launchHeightM: 1,
      gravityMps2: 9.81,
    },
    guidingQuestions: [
      "Which launch angle sends the projectile farthest?",
      "How does launch speed change flight time and range?",
      "How does stronger gravity change the trajectory?",
    ],
  };
}

function createSpringOscillatorPlan(language: "en" | "zh-CN"): SimulationPlan {
  if (language === "zh-CN") {
    return {
      concept: "spring_oscillator",
      title: "弹簧振子",
      objective: "观察质量、弹簧劲度系数和振幅如何改变周期、最大速度和能量。",
      variables: {
        massKg: 1,
        springConstantNpm: 80,
        amplitudeM: 0.4,
        dampingRatio: 0.05,
      },
      guidingQuestions: [
        "质量变大时，振动周期为什么变长？",
        "弹簧更硬时，振动为什么更快？",
        "振幅变大时，系统能量怎样变化？",
      ],
    };
  }

  return {
    concept: "spring_oscillator",
    title: "Spring oscillator",
    objective: "Observe how mass, spring stiffness, and amplitude change period, maximum speed, and energy.",
    variables: {
      massKg: 1,
      springConstantNpm: 80,
      amplitudeM: 0.4,
      dampingRatio: 0.05,
    },
    guidingQuestions: [
      "Why does more mass make the period longer?",
      "Why does a stiffer spring oscillate faster?",
      "How does amplitude change stored energy?",
    ],
  };
}

function createAdditionalPlan(
  concept: Exclude<SimulationConcept, "inclined_plane" | "projectile_motion" | "spring_oscillator">,
  language: "en" | "zh-CN",
): SimulationPlan {
  const zh = language === "zh-CN";

  if (concept === "pendulum") {
    return {
      concept,
      title: zh ? "单摆周期" : "Pendulum period",
      objective: zh ? "观察摆长、重力和振幅如何改变单摆周期和最大速度。" : "Observe how length, gravity, and amplitude change period and maximum speed.",
      variables: {
        lengthM: 2,
        gravityMps2: 9.81,
        amplitudeDeg: 12,
        massKg: 1,
      },
      guidingQuestions: zh
        ? ["摆长变长时，周期为什么变长？", "质量会改变理想单摆周期吗？", "重力更强时周期怎样变化？"]
        : ["Why does a longer pendulum take more time?", "Does mass change the ideal period?", "How does stronger gravity change the period?"],
    };
  }

  if (concept === "circular_motion") {
    return {
      concept,
      title: zh ? "匀速圆周运动" : "Circular motion",
      objective: zh ? "观察半径、速度和质量如何改变向心加速度和向心力。" : "Observe how radius, speed, and mass change centripetal acceleration and force.",
      variables: {
        radiusM: 3,
        speedMps: 12,
        massKg: 2,
      },
      guidingQuestions: zh
        ? ["速度加倍时，向心力为什么不只是加倍？", "半径变大时，转弯需要的向心力怎样变？", "质量如何影响向心力？"]
        : ["Why does doubling speed more than double centripetal force?", "How does a larger radius change turning force?", "How does mass affect centripetal force?"],
    };
  }

  if (concept === "elastic_collision") {
    return {
      concept,
      title: zh ? "一维弹性碰撞" : "Elastic collision",
      objective: zh ? "观察两个小车质量和初速度如何决定弹性碰撞后的速度。" : "Observe how cart masses and initial velocities determine final velocities after a 1D elastic collision.",
      variables: {
        mass1Kg: 1,
        mass2Kg: 2,
        velocity1Mps: 6,
        velocity2Mps: -1,
      },
      guidingQuestions: zh
        ? ["质量差异如何改变碰撞后的速度？", "总动量在碰撞前后如何保持？", "动能为什么在弹性碰撞中保持？"]
        : ["How do different masses change the final speeds?", "How is total momentum preserved?", "Why is kinetic energy preserved in an elastic collision?"],
    };
  }

  if (concept === "buoyancy") {
    return {
      concept,
      title: zh ? "浮力与漂浮" : "Buoyancy and floating",
      objective: zh ? "观察排开液体体积、物体质量和流体密度如何决定物体上浮或下沉。" : "Observe how displaced volume, object mass, and fluid density decide whether an object floats or sinks.",
      variables: {
        objectVolumeL: 3,
        objectMassKg: 2,
        fluidDensityKgM3: 1000,
      },
      guidingQuestions: zh
        ? ["为什么体积更大的物体可能更容易漂浮？", "流体密度变大时浮力怎样变化？", "净力为正时物体会怎样运动？"]
        : ["Why can a larger volume make floating easier?", "How does fluid density change buoyant force?", "What happens when net force is upward?"],
    };
  }

  if (concept === "lever_balance") {
    return {
      concept,
      title: zh ? "杠杆平衡" : "Lever balance",
      objective: zh ? "观察左右质量和力臂如何决定杠杆是否平衡。" : "Observe how masses and arm lengths decide whether a lever balances.",
      variables: {
        leftMassKg: 4,
        rightMassKg: 3,
        leftArmM: 1.2,
        rightArmM: 1.6,
      },
      guidingQuestions: zh
        ? ["小质量为什么可以用更长力臂平衡大质量？", "左右力矩相等时会发生什么？", "移动支点相当于改变了什么？"]
        : ["How can a smaller mass balance a larger one?", "What happens when torques are equal?", "What does moving the fulcrum change?"],
    };
  }

  if (concept === "ohms_law") {
    return {
      concept,
      title: zh ? "欧姆定律电路" : "Ohm's law circuit",
      objective: zh ? "观察电压和电阻如何决定电流、功率和电导。" : "Observe how voltage and resistance determine current, power, and conductance.",
      variables: {
        voltageV: 12,
        resistanceOhm: 6,
      },
      guidingQuestions: zh
        ? ["电阻变大时电流为什么变小？", "电压变大时功率怎样变化？", "电导和电阻是什么关系？"]
        : ["Why does current fall when resistance rises?", "How does voltage change power?", "How is conductance related to resistance?"],
    };
  }

  if (concept === "work_energy") {
    return {
      concept,
      title: zh ? "功与能量" : "Work and energy",
      objective: zh ? "观察力、位移、夹角和质量如何决定做功、动能变化和末速度。" : "Observe how force, distance, angle, and mass determine work, kinetic energy gain, and final speed.",
      variables: {
        forceN: 25,
        distanceM: 4,
        angleDeg: 0,
        massKg: 2,
      },
      guidingQuestions: zh
        ? ["力和位移方向相同时为什么做功最大？", "负功会如何影响动能？", "相同做功下质量如何改变速度？"]
        : ["Why is work largest when force and displacement align?", "How does negative work affect kinetic energy?", "How does mass change speed for the same work?"],
    };
  }

  if (concept === "wave_speed") {
    return {
      concept,
      title: zh ? "波速关系" : "Wave speed",
      objective: zh ? "观察频率、波长和振幅如何对应波速、周期和角频率。" : "Observe how frequency, wavelength, and amplitude relate to wave speed, period, and angular frequency.",
      variables: {
        frequencyHz: 5,
        wavelengthM: 2,
        amplitudeM: 0.3,
      },
      guidingQuestions: zh
        ? ["频率变大时，周期怎样变化？", "波长和频率怎样共同决定波速？", "振幅是否改变这个简化模型中的波速？"]
        : ["How does period change when frequency rises?", "How do wavelength and frequency determine speed?", "Does amplitude change speed in this simplified model?"],
    };
  }

  if (concept === "refraction") {
    return {
      concept,
      title: zh ? "光的折射" : "Refraction",
      objective: zh ? "观察入射角和折射率如何决定光线进入另一介质后的折射角。" : "Observe how incident angle and refractive indices determine the refracted angle.",
      variables: {
        incidentAngleDeg: 30,
        refractiveIndex1: 1,
        refractiveIndex2: 1.5,
      },
      guidingQuestions: zh
        ? ["折射率更大时光线为什么向法线偏折？", "什么时候会发生全反射？", "介质中的光速如何改变？"]
        : ["Why does light bend toward the normal in a higher-index material?", "When can total internal reflection occur?", "How does light speed change in a medium?"],
    };
  }

  if (concept === "lens_imaging") {
    return {
      concept,
      title: zh ? "薄透镜成像" : "Lens imaging",
      objective: zh ? "观察焦距、物距和物高如何决定像距、放大率和像高。" : "Observe how focal length, object distance, and object height determine image distance, magnification, and image height.",
      variables: {
        focalLengthCm: 10,
        objectDistanceCm: 30,
        objectHeightCm: 4,
      },
      guidingQuestions: zh
        ? ["物体靠近焦点时像距会怎样？", "什么时候成倒立实像？", "放大率的正负号代表什么？"]
        : ["What happens as the object nears the focal point?", "When is the image real and inverted?", "What does the sign of magnification mean?"],
    };
  }

  if (concept === "coulombs_law") {
    return {
      concept,
      title: zh ? "库仑定律" : "Coulomb force",
      objective: zh ? "观察两个点电荷的电量和距离如何决定静电力和势能。" : "Observe how two point charges and their separation determine electric force and potential energy.",
      variables: {
        charge1MicroC: 2,
        charge2MicroC: -3,
        distanceM: 0.5,
      },
      guidingQuestions: zh
        ? ["距离加倍时电力为什么变为四分之一？", "同号和异号电荷的相互作用有什么不同？", "势能符号代表什么？"]
        : ["Why does doubling distance quarter the force?", "How do like and unlike charges differ?", "What does the sign of potential energy mean?"],
    };
  }

  if (concept === "rc_circuit") {
    return {
      concept,
      title: zh ? "RC 电路充电" : "RC circuit charging",
      objective: zh ? "观察电压、电阻、电容和时间如何决定电容电压、电流和电荷量。" : "Observe how voltage, resistance, capacitance, and time determine capacitor voltage, current, and charge.",
      variables: {
        voltageV: 9,
        resistanceOhm: 1000,
        capacitanceMicroF: 100,
        timeMs: 100,
      },
      guidingQuestions: zh
        ? ["时间常数代表什么？", "电容电压为什么逐渐接近电源电压？", "充电时电流为什么逐渐变小？"]
        : ["What does the time constant represent?", "Why does capacitor voltage approach the supply voltage?", "Why does current fall during charging?"],
    };
  }

  return {
    concept: "ideal_gas",
    title: zh ? "理想气体压强" : "Ideal gas pressure",
    objective: zh ? "观察物质的量、温度和体积如何决定封闭容器内的气体压强。" : "Observe how amount of gas, temperature, and volume determine pressure in a closed container.",
    variables: {
      molesMol: 1,
      temperatureK: 300,
      volumeL: 24,
    },
    guidingQuestions: zh
      ? ["温度升高时压强为什么升高？", "体积变大时压强怎样变化？", "更多气体分子如何改变压强？"]
      : ["Why does pressure rise with temperature?", "How does larger volume change pressure?", "How does adding gas change pressure?"],
  };
}

function createDefaultPlanForConcept(
  concept: SimulationConcept,
  language: "en" | "zh-CN",
): SimulationPlan {
  if (concept === "inclined_plane") {
    return createInclinedPlanePlan(language);
  }

  if (concept === "projectile_motion") {
    return createProjectileMotionPlan(language);
  }

  if (concept === "spring_oscillator") {
    return createSpringOscillatorPlan(language);
  }

  return createAdditionalPlan(concept, language);
}

function createTemplateSuggestion(
  concept: SimulationConcept,
  language: "en" | "zh-CN",
): SimulationTemplateSuggestion {
  const plan = createDefaultPlanForConcept(concept, language);
  const reasons: Record<SimulationConcept, { en: string; zh: string }> = {
    inclined_plane: {
      en: "Use this to explore forces, friction, and acceleration on a slope.",
      zh: "用它研究斜面上的力、摩擦和加速度。",
    },
    projectile_motion: {
      en: "Use this to explore launched objects, trajectory, flight time, and range.",
      zh: "用它研究发射物体的轨迹、飞行时间和射程。",
    },
    spring_oscillator: {
      en: "Use this to explore oscillation, stiffness, mass, and energy.",
      zh: "用它研究振动、劲度系数、质量和能量。",
    },
    pendulum: {
      en: "Use this to explore periodic motion controlled by length and gravity.",
      zh: "用它研究由摆长和重力控制的周期运动。",
    },
    circular_motion: {
      en: "Use this to explore turning motion, centripetal acceleration, and force.",
      zh: "用它研究转弯运动、向心加速度和向心力。",
    },
    elastic_collision: {
      en: "Use this to explore momentum and kinetic energy in 1D collisions.",
      zh: "用它研究一维碰撞中的动量和动能。",
    },
    buoyancy: {
      en: "Use this to explore floating, sinking, displaced volume, and fluid density.",
      zh: "用它研究漂浮、下沉、排开体积和流体密度。",
    },
    lever_balance: {
      en: "Use this to explore torque, lever arms, and balance.",
      zh: "用它研究力矩、力臂和平衡。",
    },
    ohms_law: {
      en: "Use this to explore voltage, resistance, current, and power.",
      zh: "用它研究电压、电阻、电流和功率。",
    },
    ideal_gas: {
      en: "Use this to explore gas pressure, temperature, volume, and amount.",
      zh: "用它研究气体压强、温度、体积和物质的量。",
    },
    work_energy: {
      en: "Use this to explore force, distance, work, and kinetic energy.",
      zh: "用它研究力、位移、做功和动能。",
    },
    wave_speed: {
      en: "Use this to explore frequency, wavelength, speed, and period.",
      zh: "用它研究频率、波长、波速和周期。",
    },
    refraction: {
      en: "Use this to explore how light bends between two materials.",
      zh: "用它研究光在两种介质之间如何偏折。",
    },
    lens_imaging: {
      en: "Use this to explore focal length, object distance, and image formation.",
      zh: "用它研究焦距、物距和成像。",
    },
    coulombs_law: {
      en: "Use this to explore electric force between point charges.",
      zh: "用它研究点电荷之间的电力。",
    },
    rc_circuit: {
      en: "Use this to explore capacitor charging over time.",
      zh: "用它研究电容随时间充电的过程。",
    },
  };

  return {
    concept,
    title: plan.title,
    reason: language === "zh-CN" ? reasons[concept].zh : reasons[concept].en,
  };
}

function createUnsupportedSuggestions(language: "en" | "zh-CN"): SuggestedSimulationTemplates {
  return {
    message: language === "zh-CN"
      ? "没有完全匹配的内置实验。请选择一个相近实验继续。"
      : "No exact built-in experiment matched. Choose a nearby experiment to continue.",
    suggestions: (["inclined_plane", "projectile_motion", "work_energy"] as const).map((concept) =>
      createTemplateSuggestion(concept, language),
    ),
    unsupportedReason: "No built-in template matched the question.",
  };
}

function createInclinedExplanation(language: "en" | "zh-CN", measurements: InclinedPlaneResult): string {
  if (language === "zh-CN") {
    return measurements.willSlide
      ? `重力沿斜面方向的分量大于摩擦阻力，所以物体会下滑。当前加速度约为 ${measurements.accelerationMps2} m/s²。`
      : "摩擦阻力抵消了重力沿斜面方向的分量，所以物体不会自行下滑。";
  }

  return measurements.willSlide
    ? `The downslope component of gravity is larger than friction, so the object slides. The current acceleration is about ${measurements.accelerationMps2} m/s².`
    : "Friction cancels the downslope component of gravity, so the object does not slide by itself.";
}

function createProjectileExplanation(language: "en" | "zh-CN", measurements: ProjectileMotionResult): string {
  if (language === "zh-CN") {
    return `水平速度近似保持不变，竖直速度受重力改变，所以轨迹形成抛物线。当前射程约为 ${measurements.rangeM} m。`;
  }

  return `horizontal velocity stays constant while gravity changes vertical velocity, creating a parabolic path. The current range is about ${measurements.rangeM} m.`;
}

function createSpringExplanation(language: "en" | "zh-CN", measurements: SpringOscillatorResult): string {
  if (language === "zh-CN") {
    return `弹簧被拉开后会把物体拉回平衡位置，能量在弹性势能和动能之间转换。当前周期约为 ${measurements.periodS} s。`;
  }

  return `The spring pulls the mass back toward equilibrium, trading elastic potential energy with kinetic energy. The current period is about ${measurements.periodS} s.`;
}

function createAdditionalExplanation(
  language: "en" | "zh-CN",
  plan: SimulationPlan,
  measurements: AdditionalTemplateResult,
): string {
  const zh = language === "zh-CN";

  if (plan.concept === "pendulum" && "periodS" in measurements) {
    return zh
      ? `单摆周期主要由摆长和重力决定。当前周期约为 ${measurements.periodS} s。`
      : `A pendulum's period is mainly set by length and gravity. The current period is about ${measurements.periodS} s.`;
  }

  if (plan.concept === "circular_motion" && "centripetalForceN" in measurements) {
    return zh
      ? `保持圆周运动需要指向圆心的向心力。当前向心力约为 ${measurements.centripetalForceN} N。`
      : `Circular motion needs inward centripetal force. The current force is about ${measurements.centripetalForceN} N.`;
  }

  if (plan.concept === "elastic_collision" && "finalVelocity1Mps" in measurements) {
    return zh
      ? `一维弹性碰撞同时守恒动量和动能。碰撞后物体 1 速度约为 ${measurements.finalVelocity1Mps} m/s。`
      : `A 1D elastic collision preserves momentum and kinetic energy. Object 1 leaves at about ${measurements.finalVelocity1Mps} m/s.`;
  }

  if (plan.concept === "buoyancy" && "buoyantForceN" in measurements) {
    return zh
      ? `浮力等于被排开流体的重量。当前浮力约为 ${measurements.buoyantForceN} N。`
      : `Buoyant force equals the weight of displaced fluid. The current buoyant force is about ${measurements.buoyantForceN} N.`;
  }

  if (plan.concept === "lever_balance" && "leftTorqueNm" in measurements) {
    return zh
      ? `杠杆比较的是左右力矩。当前状态是 ${measurements.balance}。`
      : `A lever compares torque on each side. The current state is ${measurements.balance}.`;
  }

  if (plan.concept === "ohms_law" && "currentA" in measurements) {
    return zh
      ? `欧姆定律给出 I = V / R。当前电流约为 ${measurements.currentA} A。`
      : `Ohm's law gives I = V / R. The current is about ${measurements.currentA} A.`;
  }

  if ("pressureKpa" in measurements) {
    return zh
      ? `理想气体满足 PV = nRT。当前压强约为 ${measurements.pressureKpa} kPa。`
      : `The ideal gas model follows PV = nRT. The current pressure is about ${measurements.pressureKpa} kPa.`;
  }

  if ("workJ" in measurements) {
    return zh
      ? `做功等于力在位移方向上的分量乘以位移。当前做功约为 ${measurements.workJ} J。`
      : `Work equals the force component along displacement times distance. The current work is about ${measurements.workJ} J.`;
  }

  if ("speedMps" in measurements && plan.concept === "wave_speed") {
    return zh
      ? `波速等于频率乘以波长。当前波速约为 ${measurements.speedMps} m/s。`
      : `Wave speed equals frequency times wavelength. The current speed is about ${measurements.speedMps} m/s.`;
  }

  if ("refractedAngleDeg" in measurements) {
    return zh
      ? `斯涅尔定律把入射角和折射角联系起来。当前折射角约为 ${measurements.refractedAngleDeg ?? "全反射"}。`
      : `Snell's law connects incident and refracted angles. The current refracted angle is ${measurements.refractedAngleDeg ?? "total internal reflection"}.`;
  }

  if ("imageDistanceCm" in measurements) {
    return zh
      ? `薄透镜公式 1/f = 1/do + 1/di 决定像距。当前像距约为 ${measurements.imageDistanceCm ?? "无穷远"} cm。`
      : `The thin lens equation sets image distance. The current image distance is about ${measurements.imageDistanceCm ?? "infinity"} cm.`;
  }

  if ("forceN" in measurements && plan.concept === "coulombs_law") {
    return zh
      ? `库仑力随电荷乘积增大，随距离平方减小。当前电力约为 ${measurements.forceN} N。`
      : `Coulomb force grows with charge product and falls with distance squared. The current force is about ${measurements.forceN} N.`;
  }

  if ("timeConstantMs" in measurements) {
    return zh
      ? `RC 时间常数决定充电快慢。当前时间常数约为 ${measurements.timeConstantMs} ms。`
      : `The RC time constant sets the charging rate. The current time constant is about ${measurements.timeConstantMs} ms.`;
  }

  return zh ? "这个模板使用确定性公式计算关键测量值。" : "This template uses deterministic formulas for the key measurements.";
}

function createPlannedSimulationFromPlan(
  plan: SimulationPlan,
  language: "en" | "zh-CN",
): PlannedSimulation {
  if (plan.concept === "projectile_motion") {
    const measurements = solveProjectileMotion(plan.variables);

    return {
      plan,
      measurements,
      explanation: createProjectileExplanation(language, measurements),
    };
  }

  if (plan.concept === "spring_oscillator") {
    const measurements = solveSpringOscillator(plan.variables);

    return {
      plan,
      measurements,
      explanation: createSpringExplanation(language, measurements),
    };
  }

  if (
    plan.concept === "pendulum" ||
    plan.concept === "circular_motion" ||
    plan.concept === "elastic_collision" ||
    plan.concept === "buoyancy" ||
    plan.concept === "lever_balance" ||
    plan.concept === "ohms_law" ||
    plan.concept === "ideal_gas" ||
    plan.concept === "work_energy" ||
    plan.concept === "wave_speed" ||
    plan.concept === "refraction" ||
    plan.concept === "lens_imaging" ||
    plan.concept === "coulombs_law" ||
    plan.concept === "rc_circuit"
  ) {
    const measurements = solveAdditionalTemplate(plan.concept, plan.variables);

    return {
      plan,
      measurements,
      explanation: createAdditionalExplanation(language, plan, measurements),
    };
  }

  const measurements = solveInclinedPlane(plan.variables);

  return {
    plan,
    measurements,
    explanation: createInclinedExplanation(language, measurements),
  };
}

function parseModelPlan(input: unknown): SimulationPlan | null {
  if (!input) {
    return null;
  }

  try {
    return SimulationPlanSchema.parse(input);
  } catch {
    return null;
  }
}

export function planSimulation(
  question: string,
  options?: PlanningOptions & { suggestWhenUnsupported?: false },
): PlannedSimulation;
export function planSimulation(
  question: string,
  options: PlanningOptions & { suggestWhenUnsupported: true },
): SimulationPlanningResult;
export function planSimulation(
  question: string,
  options: PlanningOptions = {},
): SimulationPlanningResult {
  const language = detectLanguage(question);
  const selectedConcept = isSimulationConcept(options.selectedConcept)
    ? options.selectedConcept
    : null;

  if (selectedConcept) {
    return createPlannedSimulationFromPlan(
      createDefaultPlanForConcept(selectedConcept, language),
      language,
    );
  }

  const modelPlan = parseModelPlan(options.modelPlan);

  if (modelPlan) {
    return createPlannedSimulationFromPlan(modelPlan, language);
  }

  if (isProjectileQuestion(question)) {
    const plan = createProjectileMotionPlan(language);
    return createPlannedSimulationFromPlan(plan, language);
  }

  if (isSpringQuestion(question)) {
    const plan = createSpringOscillatorPlan(language);
    return createPlannedSimulationFromPlan(plan, language);
  }

  const additionalConcept = matchAdditionalConcept(question);
  if (additionalConcept) {
    const plan = createAdditionalPlan(additionalConcept, language);
    return createPlannedSimulationFromPlan(plan, language);
  }

  if (!isInclinedPlaneQuestion(question) && options.suggestWhenUnsupported) {
    return createUnsupportedSuggestions(language);
  }

  const plan = createInclinedPlanePlan(language);
  const planned = createPlannedSimulationFromPlan(plan, language);

  return {
    ...planned,
    ...(!isInclinedPlaneQuestion(question)
      ? { unsupportedReason: "No built-in template matched the question, so the inclined-plane demo was used." }
      : {}),
  };
}
