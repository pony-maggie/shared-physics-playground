import type { ObjectKind } from "../../../../packages/physics-schema/src/catalog";
import {
  CreateInputEnvelopeSchema,
  type CreateInputEnvelope,
} from "../../../../packages/prompt-contracts/src/input-adapters";
import type { SpawnIntent } from "../../../../packages/prompt-contracts/src/spawn-intent";

const DEFAULT_SCALE: SpawnIntent["scale"] = [1, 1, 1];
const BIG_SCALE: SpawnIntent["scale"] = [1.5, 1.5, 1.5];

const OBJECT_KIND_MATCHERS: Array<{
  pattern: RegExp;
  objectKind: ObjectKind;
}> = [
  { pattern: /\b(spring|coil)\b|弹簧/i, objectKind: "spring" },
  { pattern: /\b(ramp|slope)\b|斜坡|坡道/i, objectKind: "ramp" },
  { pattern: /\b(wheel|tire)\b|车轮|轮子/i, objectKind: "wheel" },
  { pattern: /\b(ball|basketball|soccer|football)\b|篮球|皮球|球体|球/i, objectKind: "ball" },
];

const HIGH_CONFIDENCE_TEXT_MATCHERS: Array<{
  pattern: RegExp;
  objectKind: ObjectKind;
}> = [
  { pattern: /^(spring|coil|弹簧)$/i, objectKind: "spring" },
  { pattern: /^(ramp|slope|斜坡|坡道)$/i, objectKind: "ramp" },
  { pattern: /^(wheel|tire|车轮|轮子)$/i, objectKind: "wheel" },
  { pattern: /^(ball|basketball|soccer|football|篮球|皮球|球体|球)$/i, objectKind: "ball" },
];

export type LocalPlannerResult = {
  confidence: "high" | "low";
  intent: SpawnIntent;
};

function getObjectKind(prompt: string): ObjectKind {
  const matcher = OBJECT_KIND_MATCHERS.find(({ pattern }) => pattern.test(prompt));

  return matcher?.objectKind ?? "cube";
}

function getScale(prompt: string): SpawnIntent["scale"] {
  return /\bbig\b/i.test(prompt) ? BIG_SCALE : DEFAULT_SCALE;
}

function normalizePromptForConfidence(prompt: string): string {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/[，。！？、,.!?]/gu, " ")
    .replace(
      /\b(add|create|spawn|place|put|make|give|me|a|an|the|big|small|huge|giant|please)\b/gu,
      " ",
    )
    .replace(/(放一个|放个|来一个|来个|加一个|加个|一个|一個|加|放|来|大号|大)/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function isHighConfidenceTextPrompt(prompt: string): boolean {
  const normalized = normalizePromptForConfidence(prompt);
  if (normalized.length === 0) {
    return false;
  }

  return HIGH_CONFIDENCE_TEXT_MATCHERS.some(({ pattern }) => pattern.test(normalized));
}

export function normalizeCreateMessage(input: CreateInputEnvelope): SpawnIntent {
  const parsed = CreateInputEnvelopeSchema.parse(input);

  if (parsed.source === "image") {
    return {
      source: parsed.source,
      prompt: parsed.prompt,
      objectKind: "cube",
      scale: DEFAULT_SCALE,
    };
  }

  return {
    source: parsed.source,
    prompt: parsed.prompt,
    objectKind: getObjectKind(parsed.prompt),
    scale: getScale(parsed.prompt),
  };
}

export function resolveLocalCreateIntent(input: CreateInputEnvelope): LocalPlannerResult {
  const intent = normalizeCreateMessage(input);

  if (intent.source !== "text") {
    return {
      confidence: "low",
      intent,
    };
  }

  return {
    confidence: isHighConfidenceTextPrompt(intent.prompt) ? "high" : "low",
    intent,
  };
}
