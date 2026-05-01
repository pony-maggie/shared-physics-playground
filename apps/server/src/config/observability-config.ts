import type { PlannerProviderName } from "../ai/planner-provider";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type ObservabilityConfig = {
  logLevel: LogLevel;
  logPath: string;
  logToStdout: boolean;
  plannerBypassEnabled: boolean;
  plannerCacheTtlMs: number;
  plannerCacheMaxEntries: number;
  plannerPromptVersion: string;
  liveProviderOrder: PlannerProviderName[] | null;
  fallbackProviderVendor: "minimax" | "disabled";
  minimaxModel: string;
  minimaxBaseUrl: string;
  providerTimeoutMs: number;
};

function parseBoolean(input: string | undefined, fallback: boolean): boolean {
  if (input === undefined) {
    return fallback;
  }

  const normalized = input.trim().toLowerCase();
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }

  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }

  return fallback;
}

function parsePositiveInt(input: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(input ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLogLevel(input: string | undefined): LogLevel {
  const normalized = input?.trim().toLowerCase();
  if (normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error") {
    return normalized;
  }

  return "info";
}

function parseProviderName(input: string): PlannerProviderName | null {
  const normalized = input.trim().toLowerCase();
  if (normalized === "google" || normalized === "minimax") {
    return normalized;
  }

  return null;
}

function parseLiveProviderOrder(input: string | undefined): PlannerProviderName[] | null {
  if (!input?.trim()) {
    return null;
  }

  const seen = new Set<PlannerProviderName>();
  const providers = input
    .split(",")
    .map((entry) => parseProviderName(entry))
    .filter((entry): entry is PlannerProviderName => entry !== null)
    .filter((entry) => {
      if (seen.has(entry)) {
        return false;
      }

      seen.add(entry);
      return true;
    });

  return providers.length > 0 ? providers : null;
}

export function parseObservabilityConfig(
  env: Record<string, string | undefined>,
): ObservabilityConfig {
  return {
    logLevel: parseLogLevel(env.PLAYGROUND_LOG_LEVEL),
    logPath: env.PLAYGROUND_LOG_PATH?.trim() || ".dev-runtime/server-events.log",
    logToStdout: parseBoolean(env.PLAYGROUND_LOG_TO_STDOUT, true),
    plannerBypassEnabled: parseBoolean(env.PLAYGROUND_AI_BYPASS_ENABLED, true),
    plannerCacheTtlMs: parsePositiveInt(env.PLAYGROUND_AI_CACHE_TTL_MS, 60 * 60 * 1000),
    plannerCacheMaxEntries: parsePositiveInt(env.PLAYGROUND_AI_CACHE_MAX_ENTRIES, 256),
    plannerPromptVersion: env.PLAYGROUND_AI_PROMPT_VERSION?.trim() || "v1",
    liveProviderOrder: parseLiveProviderOrder(env.PLAYGROUND_AI_LIVE_PROVIDER_ORDER),
    fallbackProviderVendor:
      env.PLAYGROUND_AI_FALLBACK_VENDOR?.trim() === "minimax" ? "minimax" : "disabled",
    minimaxModel:
      env.PLAYGROUND_AI_MINIMAX_MODEL?.trim() ||
      env.PLAYGROUND_AI_FALLBACK_MODEL?.trim() ||
      "MiniMax-M2.7",
    minimaxBaseUrl: env.MINIMAX_BASE_URL?.trim() || "https://api.minimaxi.com/v1",
    providerTimeoutMs: parsePositiveInt(env.PLAYGROUND_AI_PROVIDER_TIMEOUT_MS, 8_000),
  };
}
