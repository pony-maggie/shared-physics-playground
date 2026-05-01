export const OBJECT_KINDS = [
  "cube",
  "ball",
  "ramp",
  "spring",
  "wheel",
  "trigger-zone",
] as const;

export type ObjectKind = (typeof OBJECT_KINDS)[number];

export type ObjectTemplate = {
  kind: ObjectKind;
  budgetCost: number;
};

export const OBJECT_CATALOG: Record<ObjectKind, ObjectTemplate> = {
  cube: {
    kind: "cube",
    budgetCost: 1,
  },
  ball: {
    kind: "ball",
    budgetCost: 1,
  },
  ramp: {
    kind: "ramp",
    budgetCost: 2,
  },
  spring: {
    kind: "spring",
    budgetCost: 3,
  },
  wheel: {
    kind: "wheel",
    budgetCost: 2,
  },
  "trigger-zone": {
    kind: "trigger-zone",
    budgetCost: 1,
  },
};

export function getObjectTemplate(kind: ObjectKind): ObjectTemplate {
  return OBJECT_CATALOG[kind];
}
