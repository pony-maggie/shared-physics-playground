import type { CreateInputEnvelope } from "../../../../packages/prompt-contracts/src/input-adapters";
import type { SpawnIntent } from "../../../../packages/prompt-contracts/src/spawn-intent";

export type PlannerProviderName = "google" | "minimax";

export type PlannerProviderUsage = {
  promptTokenCount: number | null;
  candidatesTokenCount: number | null;
  totalTokenCount: number | null;
  cachedContentTokenCount: number | null;
};

export type PlannerProviderResult = {
  intent: SpawnIntent;
  model: string;
  provider: string;
  statusCode: number | null;
  usage: PlannerProviderUsage;
};

export type PlannerProvider = {
  name: PlannerProviderName;
  model: string;
  plan: (input: CreateInputEnvelope) => Promise<PlannerProviderResult>;
};
