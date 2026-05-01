import { describe, expect, it } from "vitest";

import { parseObservabilityConfig } from "./observability-config";

describe("parseObservabilityConfig", () => {
  it("uses safe defaults when env is empty", () => {
    expect(parseObservabilityConfig({})).toEqual({
      logLevel: "info",
      logPath: ".dev-runtime/server-events.log",
      logToStdout: true,
      plannerBypassEnabled: true,
      plannerCacheMaxEntries: 256,
      plannerCacheTtlMs: 60 * 60 * 1000,
      plannerPromptVersion: "v1",
      liveProviderOrder: null,
      fallbackProviderVendor: "disabled",
      minimaxModel: "MiniMax-M2.7",
      minimaxBaseUrl: "https://api.minimaxi.com/v1",
      providerTimeoutMs: 8_000,
    });
  });

  it("parses explicit env overrides", () => {
    expect(
      parseObservabilityConfig({
        PLAYGROUND_LOG_LEVEL: "debug",
        PLAYGROUND_LOG_PATH: "/tmp/playground.log",
        PLAYGROUND_LOG_TO_STDOUT: "false",
        PLAYGROUND_AI_BYPASS_ENABLED: "false",
        PLAYGROUND_AI_CACHE_TTL_MS: "15000",
        PLAYGROUND_AI_CACHE_MAX_ENTRIES: "32",
        PLAYGROUND_AI_PROMPT_VERSION: "v2",
      }),
    ).toEqual({
      logLevel: "debug",
      logPath: "/tmp/playground.log",
      logToStdout: false,
      plannerBypassEnabled: false,
      plannerCacheMaxEntries: 32,
      plannerCacheTtlMs: 15000,
      plannerPromptVersion: "v2",
      liveProviderOrder: null,
      fallbackProviderVendor: "disabled",
      minimaxModel: "MiniMax-M2.7",
      minimaxBaseUrl: "https://api.minimaxi.com/v1",
      providerTimeoutMs: 8_000,
    });
  });

  it("parses explicit provider-pool settings", () => {
    expect(
      parseObservabilityConfig({
        PLAYGROUND_AI_LIVE_PROVIDER_ORDER: "minimax,google,minimax",
        PLAYGROUND_AI_FALLBACK_VENDOR: "minimax",
        PLAYGROUND_AI_MINIMAX_MODEL: "MiniMax-M2.7",
        MINIMAX_BASE_URL: "https://api.minimaxi.com/v1",
        PLAYGROUND_AI_PROVIDER_TIMEOUT_MS: "8000",
      }),
    ).toEqual(
      expect.objectContaining({
        liveProviderOrder: ["minimax", "google"],
        fallbackProviderVendor: "minimax",
        minimaxModel: "MiniMax-M2.7",
        minimaxBaseUrl: "https://api.minimaxi.com/v1",
        providerTimeoutMs: 8000,
      }),
    );
  });
});
