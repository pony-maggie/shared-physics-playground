import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "../logging/logger";
import { createCreatePlanner } from "./create-planner";

afterEach(() => {
  vi.restoreAllMocks();
});

function createTestObservability(overrides: Record<string, unknown> = {}) {
  return {
    fallbackProviderVendor: "disabled" as const,
    logLevel: "info" as const,
    logPath: null,
    logToStdout: false,
    liveProviderOrder: ["google", "minimax"] as const,
    minimaxBaseUrl: "https://api.minimaxi.com/v1",
    minimaxModel: "MiniMax-M2.7",
    plannerBypassEnabled: true,
    plannerCacheMaxEntries: 256,
    plannerCacheTtlMs: 60_000,
    plannerPromptVersion: "v1",
    providerTimeoutMs: 8_000,
    ...overrides,
  };
}

function createTestSecrets(overrides: Record<string, unknown> = {}) {
  return {
    googleApiKey: "test-google-key",
    minimaxApiKey: "test-minimax-key",
    ...overrides,
  };
}

describe("create planner", () => {
  it("skips live Gemini for high-confidence ball prompts", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const planner = createCreatePlanner(
      {
        mode: "live",
        model: "gemini-2.5-flash",
        vendor: "google",
      },
      createTestSecrets(),
      createTestObservability(),
      createLogger({
        level: "info",
        path: null,
        stdout: false,
      }),
    );

    const result = await planner.plan({
      source: "text",
      prompt: "篮球",
    });

    expect(result.objectKind).toBe("ball");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(planner.health.activeMode).toBe("live");
    expect(planner.health.status).toBe("ready");
  });

  it("exposes the configured planner health", () => {
    const planner = createCreatePlanner({
      mode: "mock",
      model: "gemini-2.5-flash",
      vendor: "google",
    });

    expect(planner.health).toEqual({
      activeMode: "mock",
      fallbackReason: null,
      lastFailureAt: null,
      mode: "mock",
      model: "gemini-2.5-flash",
      status: "ready",
      vendor: "google",
    });
    expect(planner.metadata).toBe(planner.health);
  });

  it("uses the mock planner to convert text input into a constrained spawn intent", async () => {
    const planner = createCreatePlanner({
      mode: "mock",
      model: "gemini-2.5-flash",
      vendor: "google",
    });

    await expect(
      planner.plan({
        source: "text",
        prompt: "add a big spring",
      }),
    ).resolves.toEqual({
      objectKind: "spring",
      prompt: "add a big spring",
      scale: [1.5, 1.5, 1.5],
      source: "text",
    });
  });

  it("uses MiniMax when Gemini explicitly fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    source: "text",
                    prompt: "teacup sculpture",
                    objectKind: "cube",
                    scale: [1, 1, 1],
                  }),
                },
              },
            ],
            usage: {
              prompt_tokens: 40,
              completion_tokens: 12,
              total_tokens: 52,
            },
          }),
          { status: 200 },
        ),
      );

    const planner = createCreatePlanner(
      {
        mode: "live",
        model: "gemini-2.5-flash",
        vendor: "google",
      },
      createTestSecrets(),
      createTestObservability(),
      createLogger({
        level: "info",
        path: null,
        stdout: false,
      }),
    );

    await expect(
      planner.plan({
        source: "text",
        prompt: "teacup sculpture",
      }),
    ).resolves.toEqual({
      source: "text",
      prompt: "teacup sculpture",
      objectKind: "cube",
      scale: [1, 1, 1],
    });

    expect(planner.health.status).toBe("ready");
    expect(planner.health.activeMode).toBe("live");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("can route MiniMax before Gemini when provider order prefers it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "MiniMax-M2.7",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  source: "text",
                  prompt: "teacup sculpture",
                  objectKind: "cube",
                  scale: [1, 1, 1],
                }),
              },
            },
          ],
          base_resp: {
            status_code: 0,
          },
          usage: {
            prompt_tokens: 12,
            completion_tokens: 6,
            total_tokens: 18,
          },
        }),
        { status: 200 },
      ),
    );

    const planner = createCreatePlanner(
      {
        mode: "live",
        model: "gemini-2.5-flash",
        vendor: "google",
      },
      createTestSecrets(),
      createTestObservability({
        liveProviderOrder: ["minimax", "google"],
      }),
      createLogger({
        level: "info",
        path: null,
        stdout: false,
      }),
    );

    await expect(
      planner.plan({
        source: "text",
        prompt: "teacup sculpture",
      }),
    ).resolves.toEqual({
      source: "text",
      prompt: "teacup sculpture",
      objectKind: "cube",
      scale: [1, 1, 1],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://api.minimaxi.com/v1/chat/completions");
    expect(planner.health.status).toBe("ready");
    expect(planner.health.activeMode).toBe("live");
  });

  it("falls back to local normalization and marks health degraded when both live providers fail, then recovers on success", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("planner service unavailable"))
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        source: "text",
                        prompt: "teacup sculpture",
                        objectKind: "cube",
                        scale: [1, 1, 1],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const planner = createCreatePlanner(
      {
        mode: "live",
        model: "gemini-2.5-flash",
        vendor: "google",
      },
      createTestSecrets(),
      createTestObservability(),
      createLogger({
        level: "info",
        path: null,
        stdout: false,
      }),
    );

    await expect(
      planner.plan({
        source: "text",
        prompt: "teacup sculpture",
      }),
    ).resolves.toEqual({
      source: "text",
      prompt: "teacup sculpture",
      objectKind: "cube",
      scale: [1, 1, 1],
    });

    expect(planner.health).toEqual({
      activeMode: "mock",
      fallbackReason: expect.stringMatching(/MiniMax planner request failed|planner service unavailable/),
      lastFailureAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      mode: "live",
      model: "gemini-2.5-flash",
      status: "degraded",
      vendor: "google",
    });

    await expect(
      planner.plan({
        source: "text",
        prompt: "teacup sculpture",
      }),
    ).resolves.toEqual({
      source: "text",
      prompt: "teacup sculpture",
      objectKind: "cube",
      scale: [1, 1, 1],
    });

    expect(planner.health).toEqual({
      activeMode: "live",
      fallbackReason: null,
      lastFailureAt: null,
      mode: "live",
      model: "gemini-2.5-flash",
      status: "ready",
      vendor: "google",
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("falls back to local normalization when live vendor is not configured", async () => {
    const planner = createCreatePlanner(
      {
        mode: "live",
        model: "gpt-4.1",
        vendor: "openai",
      },
      createTestSecrets(),
      createTestObservability({
        fallbackProviderVendor: "disabled",
        liveProviderOrder: [],
      }),
    );

    await expect(
      planner.plan({
        source: "image",
        prompt: "recreate this wheel setup",
        image: {
          dataUrl: "data:image/png;base64,abc123",
          mimeType: "image/png",
          name: "wheel.png",
        },
      }),
    ).resolves.toEqual({
      source: "image",
      prompt: "recreate this wheel setup",
      objectKind: "cube",
      scale: [1, 1, 1],
    });

    expect(planner.health.status).toBe("degraded");
  });

  it("reuses a cached live planner result for identical prompts", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      source: "text",
                      prompt: "make a launch ramp",
                      objectKind: "ramp",
                      scale: [1, 1, 1],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 42,
            candidatesTokenCount: 10,
            totalTokenCount: 52,
          },
        }),
        { status: 200 },
      ),
    );

    const planner = createCreatePlanner(
      {
        mode: "live",
        model: "gemini-2.5-flash",
        vendor: "google",
      },
      createTestSecrets(),
      createTestObservability(),
      createLogger({
        level: "info",
        path: null,
        stdout: false,
      }),
    );

    await planner.plan({ source: "text", prompt: "make a launch ramp" });
    await planner.plan({ source: "text", prompt: "make a launch ramp" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("logs planner success with selected provider and usage metadata", async () => {
    const dir = mkdtempSync(join(tmpdir(), "playground-planner-logs-"));
    const file = join(dir, "planner.log");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      source: "text",
                      prompt: "make a launch ramp",
                      objectKind: "ramp",
                      scale: [1, 1, 1],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 42,
            candidatesTokenCount: 10,
            totalTokenCount: 52,
            cachedContentTokenCount: 7,
          },
        }),
        { status: 200 },
      ),
    );

    const planner = createCreatePlanner(
      {
        mode: "live",
        model: "gemini-2.5-flash",
        vendor: "google",
      },
      createTestSecrets(),
      createTestObservability({
        logPath: file,
      }),
      createLogger({
        level: "info",
        path: file,
        stdout: false,
        now: () => "2026-04-16T10:00:00.000Z",
      }),
    );

    await planner.plan({ source: "text", prompt: "make a launch ramp" });

    const lines = readFileSync(file, "utf8").trim().split("\n");
    const record = JSON.parse(lines.at(-1) ?? "{}");

    expect(record).toMatchObject({
      at: "2026-04-16T10:00:00.000Z",
      event: "planner.live_success",
      level: "info",
      model: "gemini-2.5-flash",
      objectKind: "ramp",
      prompt: "make a launch ramp",
      selectedProvider: "google",
      source: "text",
      usage: {
        promptTokenCount: 42,
        candidatesTokenCount: 10,
        totalTokenCount: 52,
        cachedContentTokenCount: 7,
      },
    });
    expect(record.durationMs).toEqual(expect.any(Number));
  });

  it("logs primary failure and fallback success", async () => {
    const dir = mkdtempSync(join(tmpdir(), "playground-planner-fallback-logs-"));
    const file = join(dir, "planner.log");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    source: "text",
                    prompt: "teacup sculpture",
                    objectKind: "cube",
                    scale: [1, 1, 1],
                  }),
                },
              },
            ],
            usage: {
              prompt_tokens: 40,
              completion_tokens: 12,
              total_tokens: 52,
            },
          }),
          { status: 200 },
        ),
      );

    const planner = createCreatePlanner(
      {
        mode: "live",
        model: "gemini-2.5-flash",
        vendor: "google",
      },
      createTestSecrets(),
      createTestObservability({
        logPath: file,
      }),
      createLogger({
        level: "info",
        path: file,
        stdout: false,
        now: () => "2026-04-16T10:00:00.000Z",
      }),
    );

    await planner.plan({ source: "text", prompt: "teacup sculpture" });

    const records = readFileSync(file, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(records).toEqual(
      expect.arrayContaining([
      expect.objectContaining({
        event: "planner.provider_failed",
        attemptedProvider: "google",
        providerOrder: ["google", "minimax"],
      }),
      expect.objectContaining({
        event: "planner.live_success",
        providerOrder: ["google", "minimax"],
        selectedProvider: "minimax",
      }),
    ]),
    );
  });
});
