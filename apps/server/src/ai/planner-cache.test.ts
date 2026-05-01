import { describe, expect, it } from "vitest";

import { createPlannerCache } from "./planner-cache";

describe("createPlannerCache", () => {
  it("returns a cached value before ttl expiry", () => {
    const cache = createPlannerCache({
      maxEntries: 2,
      ttlMs: 10_000,
      now: () => 1_000,
    });

    cache.set(
      {
        provider: "google",
        model: "gemini-2.5-flash",
        promptVersion: "v1",
        source: "text",
        prompt: "篮球",
      },
      {
        source: "text",
        prompt: "篮球",
        objectKind: "ball",
        scale: [1, 1, 1],
      },
    );

    expect(
      cache.get({
        provider: "google",
        model: "gemini-2.5-flash",
        promptVersion: "v1",
        source: "text",
        prompt: "篮球",
      }),
    ).toMatchObject({
      objectKind: "ball",
    });
  });

  it("expires entries after the ttl elapses", () => {
    let now = 1_000;
    const cache = createPlannerCache({
      maxEntries: 2,
      ttlMs: 10,
      now: () => now,
    });

    cache.set(
      {
        provider: "google",
        model: "gemini-2.5-flash",
        promptVersion: "v1",
        source: "text",
        prompt: "篮球",
      },
      {
        source: "text",
        prompt: "篮球",
        objectKind: "ball",
        scale: [1, 1, 1],
      },
    );

    now = 1_020;

    expect(
      cache.get({
        provider: "google",
        model: "gemini-2.5-flash",
        promptVersion: "v1",
        source: "text",
        prompt: "篮球",
      }),
    ).toBeNull();
  });

  it("normalizes prompt whitespace and casing when hashing keys", () => {
    const cache = createPlannerCache({
      maxEntries: 2,
      ttlMs: 10_000,
      now: () => 1_000,
    });

    cache.set(
      {
        provider: "google",
        model: "gemini-2.5-flash",
        promptVersion: "v1",
        source: "text",
        prompt: " Make   A   Launch Ramp ",
      },
      {
        source: "text",
        prompt: "make a launch ramp",
        objectKind: "ramp",
        scale: [1, 1, 1],
      },
    );

    expect(
      cache.get({
        provider: "google",
        model: "gemini-2.5-flash",
        promptVersion: "v1",
        source: "text",
        prompt: "make a launch ramp",
      }),
    ).toMatchObject({
      objectKind: "ramp",
    });
  });

  it("does not reuse a Gemini result for a MiniMax cache key", () => {
    const cache = createPlannerCache({
      maxEntries: 2,
      ttlMs: 10_000,
      now: () => 1_000,
    });

    cache.set(
      {
        provider: "google",
        model: "gemini-2.5-flash",
        promptVersion: "v1",
        source: "text",
        prompt: "teacup sculpture",
      },
      {
        source: "text",
        prompt: "teacup sculpture",
        objectKind: "cube",
        scale: [1, 1, 1],
      },
    );

    expect(
      cache.get({
        provider: "minimax",
        model: "MiniMax-M2.5",
        promptVersion: "v1",
        source: "text",
        prompt: "teacup sculpture",
      }),
    ).toBeNull();
  });
});
