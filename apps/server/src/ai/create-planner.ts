import type { CreateInputEnvelope } from "../../../../packages/prompt-contracts/src/input-adapters";
import {
  createPlannerHealth,
  type PlannerHealth,
  type PlannerConfig,
  parsePlannerConfig,
} from "../../../../packages/prompt-contracts/src/planner-config";
import type { SpawnIntent } from "../../../../packages/prompt-contracts/src/spawn-intent";
import {
  parseObservabilityConfig,
  type ObservabilityConfig,
} from "../config/observability-config";
import { resolveLocalCreateIntent } from "../domain/spawn-intents";
import { createLogger, type Logger } from "../logging/logger";
import { normalizePlannerError } from "./planner-errors";
import { createPlannerCache } from "./planner-cache";
import type { PlannerProvider, PlannerProviderName } from "./planner-provider";
import { createGeminiProvider } from "./providers/gemini-provider";
import { createMiniMaxProvider } from "./providers/minimax-provider";

export type CreatePlanner = {
  health: PlannerHealth;
  metadata: PlannerHealth;
  plan: (input: CreateInputEnvelope) => Promise<SpawnIntent>;
};

type PlannerSecrets = {
  googleApiKey?: string;
  minimaxApiKey?: string;
};

function markPlannerReady(health: PlannerHealth, activeMode: PlannerHealth["activeMode"]): void {
  health.status = "ready";
  health.activeMode = activeMode;
  health.fallbackReason = null;
  health.lastFailureAt = null;
}

function markPlannerDegraded(health: PlannerHealth, fallbackReason: string): void {
  health.status = "degraded";
  health.activeMode = "mock";
  health.fallbackReason = fallbackReason;
  health.lastFailureAt = new Date().toISOString();
}

function createGoogleProvider(
  config: PlannerConfig,
  observability: ObservabilityConfig,
  secrets: PlannerSecrets,
): PlannerProvider | null {
  if (config.vendor !== "google") {
    return null;
  }

  return createGeminiProvider({
    apiKey: secrets.googleApiKey,
    model: config.model,
    timeoutMs: observability.providerTimeoutMs,
  });
}

function createMiniMaxLiveProvider(
  observability: ObservabilityConfig,
  secrets: PlannerSecrets,
): PlannerProvider {
  return createMiniMaxProvider({
    apiKey: secrets.minimaxApiKey,
    baseUrl: observability.minimaxBaseUrl,
    model: observability.minimaxModel,
    timeoutMs: observability.providerTimeoutMs,
  });
}

function resolveProviderOrder(
  config: PlannerConfig,
  observability: ObservabilityConfig,
): PlannerProviderName[] {
  if (observability.liveProviderOrder?.length) {
    return observability.liveProviderOrder;
  }

  const providerOrder: PlannerProviderName[] = [];
  if (config.vendor === "google") {
    providerOrder.push("google");
  }

  if (observability.fallbackProviderVendor === "minimax") {
    providerOrder.push("minimax");
  }

  return providerOrder;
}

function getImageCachePart(input: CreateInputEnvelope): string | undefined {
  return input.source === "image" ? input.image?.dataUrl : undefined;
}

export function createCreatePlanner(
  config = parsePlannerConfig(process.env),
  secrets: PlannerSecrets = {
    googleApiKey: process.env.GOOGLE_API_KEY,
    minimaxApiKey: process.env.MINIMAX_API_KEY,
  },
  observability: ObservabilityConfig = parseObservabilityConfig(process.env),
  logger: Logger = createLogger({
    level: observability.logLevel,
    path: observability.logPath,
    stdout: observability.logToStdout,
  }),
): CreatePlanner {
  const health = createPlannerHealth(config);
  const cache = createPlannerCache({
    maxEntries: observability.plannerCacheMaxEntries,
    ttlMs: observability.plannerCacheTtlMs,
  });
  const providerOrder = resolveProviderOrder(config, observability);
  const providers: Partial<Record<PlannerProviderName, PlannerProvider>> = {};

  if (providerOrder.includes("google")) {
    const googleProvider = createGoogleProvider(config, observability, secrets);
    if (googleProvider) {
      providers.google = googleProvider;
    }
  }

  if (providerOrder.includes("minimax")) {
    providers.minimax = createMiniMaxLiveProvider(observability, secrets);
  }

  return {
    health,
    metadata: health,
    async plan(input) {
      const localResult = resolveLocalCreateIntent(input);

      if (config.mode === "mock") {
        markPlannerReady(health, "mock");
        return localResult.intent;
      }

      if (observability.plannerBypassEnabled && localResult.confidence === "high") {
        logger.info("planner.bypass_hit", {
          model: config.model,
          objectKind: localResult.intent.objectKind,
          prompt: input.prompt,
          source: input.source,
        });
        markPlannerReady(health, "live");
        return localResult.intent;
      }

      const liveProviders = providerOrder
        .map((providerName) => providers[providerName] ?? null)
        .filter((provider): provider is PlannerProvider => provider !== null);

      if (liveProviders.length === 0) {
        const reason = "live planner vendor is not configured";
        markPlannerDegraded(health, reason);
        logger.warn("planner.live_failed", {
          model: config.model,
          prompt: input.prompt,
          promptVersion: observability.plannerPromptVersion,
          providerOrder,
          reason,
          selectedProvider: "local",
          source: input.source,
        });
        return localResult.intent;
      }

      for (const provider of liveProviders) {
        const cached = cache.get({
          provider: provider.name,
          model: provider.model,
          promptVersion: observability.plannerPromptVersion,
          prompt: input.prompt,
          source: input.source,
          imageDataUrl: getImageCachePart(input),
        });

        if (cached) {
          logger.info("planner.cache_hit", {
            model: provider.model,
            prompt: input.prompt,
            promptVersion: observability.plannerPromptVersion,
            providerOrder,
            selectedProvider: provider.name,
            source: input.source,
          });
          markPlannerReady(health, "live");
          return cached;
        }
      }

      let lastError: ReturnType<typeof normalizePlannerError> | null = null;

      for (const provider of liveProviders) {
        logger.info("planner.provider_attempt", {
          attemptedProvider: provider.name,
          model: provider.model,
          prompt: input.prompt,
          promptVersion: observability.plannerPromptVersion,
          providerOrder,
          source: input.source,
        });

        try {
          const startedAt = Date.now();
          const result = await provider.plan(input);
          cache.set(
            {
              provider: result.provider,
              model: result.model,
              promptVersion: observability.plannerPromptVersion,
              prompt: input.prompt,
              source: input.source,
              imageDataUrl: getImageCachePart(input),
            },
            result.intent,
          );
          markPlannerReady(health, "live");
          logger.info("planner.live_success", {
            attemptedProvider: provider.name,
            durationMs: Date.now() - startedAt,
            model: result.model,
            objectKind: result.intent.objectKind,
            prompt: input.prompt,
            promptVersion: observability.plannerPromptVersion,
            providerOrder,
            selectedProvider: result.provider,
            source: input.source,
            usage: result.usage,
          });
          return result.intent;
        } catch (error) {
          lastError = normalizePlannerError(error);
          logger.warn("planner.provider_failed", {
            attemptedProvider: provider.name,
            model: provider.model,
            prompt: input.prompt,
            promptVersion: observability.plannerPromptVersion,
            providerOrder,
            reason: lastError.code,
            source: input.source,
            statusCode: lastError.statusCode,
          });
        }
      }

      const reason = lastError?.message ?? "all live providers failed";
      markPlannerDegraded(health, reason);
      logger.warn("planner.live_failed", {
        model: config.model,
        prompt: input.prompt,
        promptVersion: observability.plannerPromptVersion,
        providerOrder,
        reason,
        selectedProvider: "local",
        source: input.source,
      });
      return localResult.intent;
    },
  };
}
