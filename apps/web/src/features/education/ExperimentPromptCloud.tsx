import React from "react";

import type { Language } from "../../state/auth-store";

type PromptCloudItem = {
  label: Record<Language, string>;
  question: Record<Language, string>;
};

const PROMPT_CLOUD_ITEMS: PromptCloudItem[] = [
  {
    label: { en: "Inclined plane", "zh-CN": "斜面与摩擦" },
    question: {
      en: "Why does a ball roll faster on a steeper slope?",
      "zh-CN": "为什么斜坡越陡，小球滚得越快？",
    },
  },
  {
    label: { en: "Projectile motion", "zh-CN": "抛体运动" },
    question: {
      en: "How far will a ball fly if I launch it upward?",
      "zh-CN": "小球向上抛出后会飞多远？",
    },
  },
  {
    label: { en: "Spring oscillator", "zh-CN": "弹簧振子" },
    question: {
      en: "Why does a spring oscillator move back and forth?",
      "zh-CN": "为什么弹簧振子会来回运动？",
    },
  },
  {
    label: { en: "Pendulum", "zh-CN": "单摆" },
    question: {
      en: "How does pendulum length change its period?",
      "zh-CN": "摆长如何影响单摆周期？",
    },
  },
  {
    label: { en: "Circular motion", "zh-CN": "圆周运动" },
    question: {
      en: "Why does a car need force to turn in a circle?",
      "zh-CN": "汽车转弯时为什么需要向心力？",
    },
  },
  {
    label: { en: "Elastic collision", "zh-CN": "弹性碰撞" },
    question: {
      en: "What happens when two carts collide elastically?",
      "zh-CN": "两个小车弹性碰撞后速度如何变化？",
    },
  },
  {
    label: { en: "Buoyancy", "zh-CN": "浮力" },
    question: {
      en: "Why does a block float in water?",
      "zh-CN": "为什么木块在水里会上浮？",
    },
  },
  {
    label: { en: "Lever balance", "zh-CN": "杠杆平衡" },
    question: {
      en: "How can a lever balance two different masses?",
      "zh-CN": "杠杆如何平衡两个不同质量的物体？",
    },
  },
  {
    label: { en: "Ohm's law", "zh-CN": "欧姆定律" },
    question: {
      en: "How much current flows through a resistor?",
      "zh-CN": "电阻中的电流由什么决定？",
    },
  },
  {
    label: { en: "Ideal gas", "zh-CN": "理想气体" },
    question: {
      en: "What pressure does a gas make in a container?",
      "zh-CN": "容器里的气体压强由什么决定？",
    },
  },
  {
    label: { en: "Work and energy", "zh-CN": "功与能量" },
    question: {
      en: "How much work does a force do on a box?",
      "zh-CN": "力对箱子做了多少功？",
    },
  },
  {
    label: { en: "Wave speed", "zh-CN": "波速" },
    question: {
      en: "How are wavelength and frequency related in a wave?",
      "zh-CN": "波长和频率如何决定波速？",
    },
  },
  {
    label: { en: "Refraction", "zh-CN": "光的折射" },
    question: {
      en: "Why does light bend when it enters glass?",
      "zh-CN": "为什么光进入玻璃会弯折？",
    },
  },
  {
    label: { en: "Lens imaging", "zh-CN": "透镜成像" },
    question: {
      en: "Where will a lens form an image?",
      "zh-CN": "透镜会在哪里成像？",
    },
  },
  {
    label: { en: "Coulomb force", "zh-CN": "库仑力" },
    question: {
      en: "How strong is the electric force between two charges?",
      "zh-CN": "两个电荷之间的电力有多大？",
    },
  },
  {
    label: { en: "RC circuit", "zh-CN": "RC 电路" },
    question: {
      en: "How fast does a capacitor charge in an RC circuit?",
      "zh-CN": "RC 电路里的电容充电有多快？",
    },
  },
];

export default function ExperimentPromptCloud(props: {
  language: Language;
  onSelectQuestion: (question: string) => void;
}) {
  return (
    <div aria-label="Supported experiments" className="prompt-cloud" role="group">
      {PROMPT_CLOUD_ITEMS.map((item, index) => (
        <button
          className="prompt-cloud__chip"
          key={item.label.en}
          style={{
            "--prompt-cloud-delay": `${(index % 8) * -0.45}s`,
            "--prompt-cloud-distance": `${6 + (index % 4) * 2}px`,
          } as React.CSSProperties}
          type="button"
          onClick={() => props.onSelectQuestion(item.question[props.language])}
        >
          <span className="prompt-cloud__label">{item.label[props.language]}</span>
        </button>
      ))}
    </div>
  );
}
