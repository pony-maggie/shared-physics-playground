export type ApparatusConcept =
  | "circular_motion"
  | "inclined_plane"
  | "lever_balance"
  | "spring_oscillator";

export type ApparatusRole =
  | "component"
  | "force-vector"
  | "measurement-line"
  | "moving-object"
  | "path"
  | "source"
  | "surface";

export type ApparatusPrimitive =
  | {
      kind: "box";
      size: [number, number, number];
    }
  | {
      kind: "sphere";
      radius: number;
      segments?: number;
    }
  | {
      kind: "cylinder";
      radius: number;
      depth: number;
      segments?: number;
    }
  | {
      kind: "torus";
      radius: number;
      tube: number;
      segments?: number;
    };

export interface ApparatusMotion {
  kind: "path" | "revolute";
  path?: {
    from: [number, number, number];
    to: [number, number, number];
  };
  axis?: "x" | "y" | "z";
  revolutions?: number;
}

export interface ApparatusPart {
  id: string;
  role: ApparatusRole;
  label: string;
  primitive: ApparatusPrimitive;
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  motion?: ApparatusMotion;
  sourceTags?: string[];
}

export interface ApparatusTemplate {
  id: string;
  concept: ApparatusConcept;
  label: string;
  parts: ApparatusPart[];
  sourceHint: {
    reference: "articraft";
    articraftTerms: string[];
  };
}

export const APPARATUS_TEMPLATES = {
  "inclined-plane-rig": {
    id: "inclined-plane-rig",
    concept: "inclined_plane",
    label: "Inclined plane rig",
    sourceHint: {
      reference: "articraft",
      articraftTerms: ["ramp", "drawbridge", "loading ramp"],
    },
    parts: [
      {
        id: "ramp-surface",
        role: "surface",
        label: "Ramp surface",
        primitive: { kind: "box", size: [4, 0.12, 1.2] },
        position: [0, 0, 0],
        color: "#344054",
        sourceTags: ["ramp", "drawbridge"],
      },
      {
        id: "rolling-object",
        role: "moving-object",
        label: "Rolling object",
        primitive: { kind: "sphere", radius: 0.22, segments: 24 },
        position: [-1.45, 0.28, 0],
        color: "#5fc7ff",
        motion: {
          kind: "path",
          path: {
            from: [-1.45, 0.28, 0],
            to: [1.45, 0.28, 0],
          },
        },
        sourceTags: ["wheel", "ball"],
      },
      {
        id: "ramp-measure",
        role: "measurement-line",
        label: "Ramp length guide",
        primitive: { kind: "box", size: [3.2, 0.025, 0.025] },
        position: [0, 0.42, -0.66],
        color: "#fedf89",
      },
    ],
  },
  "spring-cart-rig": {
    id: "spring-cart-rig",
    concept: "spring_oscillator",
    label: "Spring cart rig",
    sourceHint: {
      reference: "articraft",
      articraftTerms: ["slider", "cartesian_stage", "gantry", "carriage"],
    },
    parts: [
      {
        id: "fixed-wall",
        role: "source",
        label: "Fixed wall",
        primitive: { kind: "box", size: [0.18, 1, 1.1] },
        position: [-1.4, 0.5, 0],
        color: "#98a2b3",
        sourceTags: ["linear axis", "gantry"],
      },
      {
        id: "cart-body",
        role: "moving-object",
        label: "Oscillating cart",
        primitive: { kind: "box", size: [0.62, 0.42, 0.58] },
        position: [0.8, 0.32, 0],
        color: "#5fc7ff",
        motion: {
          kind: "path",
          path: {
            from: [0.2, 0.32, 0],
            to: [1.4, 0.32, 0],
          },
        },
        sourceTags: ["carriage", "slider"],
      },
      {
        id: "cart-rail",
        role: "path",
        label: "Linear rail",
        primitive: { kind: "box", size: [2.7, 0.05, 0.08] },
        position: [0.05, 0.1, 0],
        color: "#667085",
        sourceTags: ["slider", "gantry"],
      },
      {
        id: "amplitude-guide",
        role: "measurement-line",
        label: "Amplitude guide",
        primitive: { kind: "box", size: [1.5, 0.025, 0.025] },
        position: [0.8, 0.9, -0.45],
        color: "#fedf89",
      },
    ],
  },
  "lever-balance-rig": {
    id: "lever-balance-rig",
    concept: "lever_balance",
    label: "Lever balance rig",
    sourceHint: {
      reference: "articraft",
      articraftTerms: ["lever", "wheelbarrow", "trunnion", "pivot"],
    },
    parts: [
      {
        id: "lever-pivot",
        role: "surface",
        label: "Fulcrum",
        primitive: { kind: "cylinder", radius: 0.22, depth: 0.5, segments: 24 },
        position: [0, 0.28, 0],
        rotation: [Math.PI / 2, 0, 0],
        color: "#98a2b3",
        sourceTags: ["pivot", "trunnion"],
      },
      {
        id: "lever-beam",
        role: "moving-object",
        label: "Balance beam",
        primitive: { kind: "box", size: [3.2, 0.11, 0.35] },
        position: [0, 0.58, 0],
        color: "#5fc7ff",
        motion: {
          kind: "revolute",
          axis: "z",
          revolutions: 0.08,
        },
        sourceTags: ["lever", "handle"],
      },
      {
        id: "lever-load",
        role: "force-vector",
        label: "Load side",
        primitive: { kind: "box", size: [0.36, 0.36, 0.36] },
        position: [-1.25, 0.86, 0],
        color: "#f97066",
      },
      {
        id: "lever-arm-guide",
        role: "measurement-line",
        label: "Lever arm guide",
        primitive: { kind: "box", size: [2.8, 0.025, 0.025] },
        position: [0, 1.12, -0.32],
        color: "#fedf89",
      },
    ],
  },
  "circular-wheel-rig": {
    id: "circular-wheel-rig",
    concept: "circular_motion",
    label: "Circular wheel rig",
    sourceHint: {
      reference: "articraft",
      articraftTerms: ["wheel", "skateboard", "wheelchair", "fan", "rotary", "shaft"],
    },
    parts: [
      {
        id: "wheel-track",
        role: "path",
        label: "Circular path",
        primitive: { kind: "torus", radius: 1.2, tube: 0.025, segments: 64 },
        position: [0, 0.55, 0],
        rotation: [Math.PI / 2, 0, 0],
        color: "#98a2b3",
        sourceTags: ["wheel", "observation_wheel"],
      },
      {
        id: "wheel-body",
        role: "moving-object",
        label: "Rotating wheel body",
        primitive: { kind: "torus", radius: 0.28, tube: 0.06, segments: 32 },
        position: [1.2, 0.55, 0],
        rotation: [Math.PI / 2, 0, 0],
        color: "#5fc7ff",
        motion: {
          kind: "revolute",
          axis: "z",
          revolutions: 1,
        },
        sourceTags: ["wheel", "skateboard", "wheelchair", "fan"],
      },
      {
        id: "centripetal-vector",
        role: "force-vector",
        label: "Centripetal force guide",
        primitive: { kind: "box", size: [1.1, 0.035, 0.035] },
        position: [0.55, 0.55, 0],
        color: "#f97066",
      },
      {
        id: "radius-guide",
        role: "measurement-line",
        label: "Radius guide",
        primitive: { kind: "box", size: [1.2, 0.025, 0.025] },
        position: [0.6, 0.78, -0.25],
        color: "#fedf89",
      },
    ],
  },
} as const satisfies Record<string, ApparatusTemplate>;

export type ApparatusTemplateId = keyof typeof APPARATUS_TEMPLATES;

export function getApparatusTemplate(id: ApparatusTemplateId): ApparatusTemplate {
  return APPARATUS_TEMPLATES[id];
}

export function validateApparatusTemplate(template: ApparatusTemplate): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const seenPartIds = new Set<string>();
  const seenRoles = new Set<ApparatusRole>();

  for (const part of template.parts) {
    if (seenPartIds.has(part.id)) {
      issues.push(`duplicate part id: ${part.id}`);
    }
    seenPartIds.add(part.id);

    if (seenRoles.has(part.role)) {
      issues.push(`duplicate semantic role: ${part.role}`);
    }
    seenRoles.add(part.role);

    if (part.motion?.kind === "path" && !part.motion.path) {
      issues.push(`path motion missing endpoints: ${part.id}`);
    }

    if (part.motion?.kind === "revolute" && !part.motion.axis) {
      issues.push(`revolute motion missing axis: ${part.id}`);
    }
  }

  if (!template.parts.some((part) => part.role === "moving-object" && part.motion)) {
    issues.push("missing moving-object motion metadata");
  }

  return { ok: issues.length === 0, issues };
}
