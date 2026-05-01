import type { CreateInputEnvelope } from "../../../../../packages/prompt-contracts/src/input-adapters";
import { SpawnIntentSchema } from "../../../../../packages/prompt-contracts/src/spawn-intent";
import {
  createPlannerError,
  isPlannerError,
} from "../planner-errors";
import type { PlannerProvider, PlannerProviderResult } from "../planner-provider";

function unwrapMiniMaxText(text: string): string {
  let normalized = text.trim();
  normalized = normalized.replace(/^<think>[\s\S]*?<\/think>\s*/i, "").trim();

  const fencedMatch = normalized.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    normalized = fencedMatch[1].trim();
  }

  const objectStart = normalized.indexOf("{");
  const objectEnd = normalized.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    return normalized.slice(objectStart, objectEnd + 1);
  }

  return normalized;
}

function getMiniMaxPrompt(input: CreateInputEnvelope): string {
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
  ].join("\n");
}

function parseMiniMaxResult(payload: unknown, statusCode: number): PlannerProviderResult {
  const parsedPayload = payload as {
    model?: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const usage = parsedPayload?.usage;
  const text = parsedPayload?.choices?.[0]?.message?.content;

  if (typeof text !== "string") {
    throw createPlannerError("invalid_response", "invalid MiniMax planner response", statusCode);
  }

  try {
    const parsedIntent = SpawnIntentSchema.parse(JSON.parse(unwrapMiniMaxText(text)) as unknown);

    return {
      intent: parsedIntent,
      model: parsedPayload?.model || "unknown",
      provider: "minimax",
      statusCode,
      usage: {
        promptTokenCount: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : null,
        candidatesTokenCount:
          typeof usage?.completion_tokens === "number" ? usage.completion_tokens : null,
        totalTokenCount: typeof usage?.total_tokens === "number" ? usage.total_tokens : null,
        cachedContentTokenCount: null,
      },
    };
  } catch (error) {
    if (isPlannerError(error)) {
      throw error;
    }

    throw createPlannerError("invalid_response", "invalid MiniMax planner response", statusCode);
  }
}

export function createMiniMaxProvider(props: {
  apiKey?: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}): PlannerProvider {
  return {
    name: "minimax",
    model: props.model,
    async plan(input: CreateInputEnvelope) {
      if (input.source === "image") {
        throw createPlannerError(
          "provider_unavailable",
          "MiniMax image planning is not configured",
        );
      }

      if (!props.apiKey) {
        throw createPlannerError(
          "auth_misconfigured",
          "missing MINIMAX_API_KEY for MiniMax planner",
        );
      }

      try {
        const response = await globalThis.fetch(
          `${props.baseUrl.replace(/\/$/, "")}/chat/completions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${props.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: props.model,
              messages: [
                {
                  role: "user",
                  content: getMiniMaxPrompt(input),
                },
              ],
            }),
            signal: AbortSignal.timeout(props.timeoutMs),
          },
        );

        const payload = (await response.json()) as
          | {
              base_resp?: {
                status_code?: number;
                status_msg?: string;
              };
              choices?: Array<{
                message?: {
                  content?: string;
                };
              }>;
              model?: string;
              usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                total_tokens?: number;
              };
            }
          | null;

        const minimaxStatusCode = payload?.base_resp?.status_code ?? 0;
        const minimaxStatusMessage = payload?.base_resp?.status_msg?.trim() || null;

        if (response.status === 429) {
          throw createPlannerError("rate_limited", "MiniMax planner rate limited", 429);
        }

        if (
          response.status === 401 ||
          response.status === 403 ||
          minimaxStatusCode === 2049 ||
          /invalid api key/i.test(minimaxStatusMessage || "")
        ) {
          throw createPlannerError(
            "auth_misconfigured",
            "MiniMax planner authentication failed",
            response.status,
          );
        }

        if (response.status >= 500) {
          throw createPlannerError(
            "provider_unavailable",
            "MiniMax planner request failed",
            response.status,
          );
        }

        if (!response.ok || minimaxStatusCode !== 0) {
          throw createPlannerError(
            "invalid_response",
            minimaxStatusMessage || "MiniMax planner request failed",
            response.status,
          );
        }

        const parsed = parseMiniMaxResult(payload, response.status);
        return {
          ...parsed,
          model: parsed.model === "unknown" ? props.model : parsed.model,
        };
      } catch (error) {
        if (isPlannerError(error)) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw createPlannerError("timeout", "MiniMax planner request timed out");
        }

        throw createPlannerError(
          "unknown",
          error instanceof Error ? error.message : "MiniMax planner request failed",
        );
      }
    },
  };
}
