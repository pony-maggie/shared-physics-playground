import type { CreateInputEnvelope } from "../../../../../packages/prompt-contracts/src/input-adapters";
import { SpawnIntentSchema } from "../../../../../packages/prompt-contracts/src/spawn-intent";
import {
  createPlannerError,
  isPlannerError,
} from "../planner-errors";
import type { PlannerProvider, PlannerProviderResult } from "../planner-provider";

function getGoogleGeminiEndpoint(model: string, apiKey: string): string {
  const params = new URLSearchParams({
    key: apiKey,
  });
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?${params.toString()}`;
}

function getGeminiPrompt(input: CreateInputEnvelope): string {
  return [
    "Convert the user request into a constrained spawn intent JSON object.",
    "Return JSON only.",
    'Use this shape: {"source":"text|image","prompt":"...","objectKind":"cube|ball|ramp|spring|wheel|trigger-zone","scale":[number,number,number]}',
    "Map basketballs, soccer balls, and generic balls to objectKind=ball.",
    "Map ramps, slopes, and incline surfaces to objectKind=ramp.",
    "Map wheels, tires, and round vehicle parts to objectKind=wheel.",
    "Scale values must be positive finite numbers.",
    `Input source: ${input.source}`,
    `Input prompt: ${input.prompt}`,
    input.source === "image"
      ? "Inspect the attached local image and map the dominant physical object or setup to the nearest supported objectKind."
      : "",
  ].join("\n");
}

function getGeminiParts(input: CreateInputEnvelope): Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [{ text: getGeminiPrompt(input) }];

  if (input.source !== "image" || !input.image) {
    return parts;
  }

  const base64Data = input.image.dataUrl.split(",")[1];
  if (!base64Data) {
    throw createPlannerError("invalid_response", "invalid image input", null);
  }

  parts.push({
    inlineData: {
      mimeType: input.image.mimeType,
      data: base64Data,
    },
  });

  return parts;
}

function parseGeminiResult(payload: unknown, statusCode: number): PlannerProviderResult {
  const text = (payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
      cachedContentTokenCount?: number;
    };
  })?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string") {
    throw createPlannerError("invalid_response", "invalid Gemini planner response", statusCode);
  }

  return {
    intent: SpawnIntentSchema.parse(JSON.parse(text) as unknown),
    model: "unknown",
    provider: "google",
    statusCode,
    usage: {
      promptTokenCount:
        typeof (payload as { usageMetadata?: { promptTokenCount?: number } })?.usageMetadata?.promptTokenCount === "number"
          ? (payload as { usageMetadata: { promptTokenCount: number } }).usageMetadata.promptTokenCount
          : null,
      candidatesTokenCount:
        typeof (payload as { usageMetadata?: { candidatesTokenCount?: number } })?.usageMetadata?.candidatesTokenCount === "number"
          ? (payload as { usageMetadata: { candidatesTokenCount: number } }).usageMetadata.candidatesTokenCount
          : null,
      totalTokenCount:
        typeof (payload as { usageMetadata?: { totalTokenCount?: number } })?.usageMetadata?.totalTokenCount === "number"
          ? (payload as { usageMetadata: { totalTokenCount: number } }).usageMetadata.totalTokenCount
          : null,
      cachedContentTokenCount:
        typeof (payload as { usageMetadata?: { cachedContentTokenCount?: number } })?.usageMetadata?.cachedContentTokenCount === "number"
          ? (payload as { usageMetadata: { cachedContentTokenCount: number } }).usageMetadata.cachedContentTokenCount
          : null,
    },
  };
}

export function createGeminiProvider(props: {
  apiKey?: string;
  model: string;
  timeoutMs: number;
}): PlannerProvider {
  return {
    name: "google",
    model: props.model,
    async plan(input: CreateInputEnvelope) {
      if (!props.apiKey) {
        throw createPlannerError(
          "auth_misconfigured",
          "missing GOOGLE_API_KEY for Gemini planner",
        );
      }

      try {
        const response = await globalThis.fetch(
          getGoogleGeminiEndpoint(props.model, props.apiKey),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: getGeminiParts(input),
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(props.timeoutMs),
          },
        );

        if (response.status === 429) {
          throw createPlannerError("rate_limited", "Gemini planner rate limited", 429);
        }

        if (response.status >= 500) {
          throw createPlannerError(
            "provider_unavailable",
            "Gemini planner request failed",
            response.status,
          );
        }

        if (!response.ok) {
          throw createPlannerError(
            "invalid_response",
            "Gemini planner request failed",
            response.status,
          );
        }

        const parsed = parseGeminiResult(await response.json(), response.status);
        return {
          ...parsed,
          model: props.model,
        };
      } catch (error) {
        if (isPlannerError(error)) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw createPlannerError("timeout", "Gemini planner request timed out");
        }

        throw createPlannerError(
          "network_failure",
          error instanceof Error ? error.message : "Gemini planner request failed",
        );
      }
    },
  };
}
