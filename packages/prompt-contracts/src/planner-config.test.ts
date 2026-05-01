import { describe, expect, it } from "vitest";

import { createPlannerHealth, parsePlannerConfig } from "./planner-config";

describe("planner config", () => {
  it("defaults to a mock Gemini 2.5 Flash planner", () => {
    expect(parsePlannerConfig({})).toEqual({
      mode: "mock",
      model: "gemini-2.5-flash",
      vendor: "google",
    });
  });

  it("accepts explicit vendor, model, and mode overrides", () => {
    expect(
      parsePlannerConfig({
        PLAYGROUND_AI_MODE: "live",
        PLAYGROUND_AI_MODEL: "gpt-4.1",
        PLAYGROUND_AI_VENDOR: "openai",
      }),
    ).toEqual({
      mode: "live",
      model: "gpt-4.1",
      vendor: "openai",
    });
  });

  it("rejects unsupported vendors and modes", () => {
    expect(() =>
      parsePlannerConfig({
        PLAYGROUND_AI_VENDOR: "unknown",
      }),
    ).toThrow("planner vendor must be google, openai, anthropic, or mock");

    expect(() =>
      parsePlannerConfig({
        PLAYGROUND_AI_MODE: "invalid",
      }),
    ).toThrow("planner mode must be mock or live");
  });

  it("creates ready planner health for mock planners", () => {
    expect(
      createPlannerHealth({
        mode: "mock",
        model: "gemini-2.5-flash",
        vendor: "google",
      }),
    ).toEqual({
      activeMode: "mock",
      fallbackReason: null,
      lastFailureAt: null,
      mode: "mock",
      model: "gemini-2.5-flash",
      status: "ready",
      vendor: "google",
    });
  });

  it("creates ready planner health for live planners", () => {
    expect(
      createPlannerHealth({
        mode: "live",
        model: "gpt-4.1",
        vendor: "openai",
      }),
    ).toEqual({
      activeMode: "live",
      fallbackReason: null,
      lastFailureAt: null,
      mode: "live",
      model: "gpt-4.1",
      status: "ready",
      vendor: "openai",
    });
  });
});
