export const PLANNER_VENDORS = ["google", "openai", "anthropic", "mock"] as const;
export const PLANNER_MODES = ["mock", "live"] as const;

export type PlannerVendor = (typeof PLANNER_VENDORS)[number];
export type PlannerMode = (typeof PLANNER_MODES)[number];

export type PlannerConfig = {
  vendor: PlannerVendor;
  model: string;
  mode: PlannerMode;
};

export type PlannerHealth = PlannerConfig & {
  status: "ready" | "degraded";
  activeMode: "mock" | "live";
  fallbackReason: string | null;
  lastFailureAt: string | null;
};

type PlannerConfigInput = {
  PLAYGROUND_AI_VENDOR?: string;
  PLAYGROUND_AI_MODEL?: string;
  PLAYGROUND_AI_MODE?: string;
};

function parsePlannerVendor(input: string | undefined): PlannerVendor {
  const vendor = input ?? "google";

  if (!PLANNER_VENDORS.includes(vendor as PlannerVendor)) {
    throw new Error("planner vendor must be google, openai, anthropic, or mock");
  }

  return vendor as PlannerVendor;
}

function parsePlannerMode(input: string | undefined): PlannerMode {
  const mode = input ?? "mock";

  if (!PLANNER_MODES.includes(mode as PlannerMode)) {
    throw new Error("planner mode must be mock or live");
  }

  return mode as PlannerMode;
}

export function parsePlannerConfig(input: PlannerConfigInput): PlannerConfig {
  const vendor = parsePlannerVendor(input.PLAYGROUND_AI_VENDOR);
  const model = input.PLAYGROUND_AI_MODEL?.trim() || "gemini-2.5-flash";
  const mode = parsePlannerMode(input.PLAYGROUND_AI_MODE);

  return {
    mode,
    model,
    vendor,
  };
}

export function createPlannerHealth(config: PlannerConfig): PlannerHealth {
  return {
    ...config,
    activeMode: config.mode,
    fallbackReason: null,
    lastFailureAt: null,
    status: "ready",
  };
}
