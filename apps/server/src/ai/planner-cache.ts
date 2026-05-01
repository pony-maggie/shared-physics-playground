import { createHash } from "node:crypto";

import type { CreateInputSource } from "../../../../packages/prompt-contracts/src/input-adapters";
import type { SpawnIntent } from "../../../../packages/prompt-contracts/src/spawn-intent";

export type PlannerCacheKey = {
  provider: string;
  model: string;
  promptVersion: string;
  source: CreateInputSource;
  prompt: string;
  imageDataUrl?: string;
};

type PlannerCacheEntry = {
  intent: SpawnIntent;
  expiresAt: number;
};

export type PlannerCache = {
  get: (input: PlannerCacheKey) => SpawnIntent | null;
  set: (input: PlannerCacheKey, intent: SpawnIntent) => void;
};

function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/gu, " ");
}

function hashKey(input: PlannerCacheKey): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        ...input,
        prompt: normalizePrompt(input.prompt),
      }),
    )
    .digest("hex");
}

export function createPlannerCache(props: {
  maxEntries: number;
  ttlMs: number;
  now?: () => number;
}): PlannerCache {
  const now = props.now ?? (() => Date.now());
  const entries = new Map<string, PlannerCacheEntry>();

  return {
    get(input) {
      const key = hashKey(input);
      const entry = entries.get(key);

      if (!entry) {
        return null;
      }

      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return null;
      }

      return entry.intent;
    },
    set(input, intent) {
      const key = hashKey(input);

      if (entries.size >= props.maxEntries) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey) {
          entries.delete(oldestKey);
        }
      }

      entries.set(key, {
        intent,
        expiresAt: now() + props.ttlMs,
      });
    },
  };
}
