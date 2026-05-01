import { describe, expect, it } from "vitest";

import { CreateInputEnvelopeSchema } from "./input-adapters";
import { SpawnIntentSchema } from "./spawn-intent";

describe("spawn intent schema", () => {
  it("accepts valid create inputs for text and image sources", () => {
    expect(
      CreateInputEnvelopeSchema.parse({
        source: "text",
        prompt: "build a cube tower",
      }),
    ).toEqual({
      source: "text",
      prompt: "build a cube tower",
    });

    expect(
      CreateInputEnvelopeSchema.parse({
        source: "image",
        prompt: "recreate this wheel setup",
        image: {
          dataUrl: "data:image/png;base64,abc123",
          mimeType: "image/png",
          name: "wheel.png",
        },
      }),
    ).toEqual({
      source: "image",
      prompt: "recreate this wheel setup",
      image: {
        dataUrl: "data:image/png;base64,abc123",
        mimeType: "image/png",
        name: "wheel.png",
      },
    });
  });

  it("rejects removed sketch inputs and image inputs without image data", () => {
    expect(() =>
      CreateInputEnvelopeSchema.parse({
        source: "sketch",
        prompt: "turn this sketch into a ramp",
      }),
    ).toThrow("source must be text or image");

    expect(() =>
      CreateInputEnvelopeSchema.parse({
        source: "image",
        prompt: "recreate this wheel setup",
      }),
    ).toThrow("image input must include image data");
  });

  it("rejects array payloads for create inputs", () => {
    const payload = [];
    Object.assign(payload, {
      source: "text",
      prompt: "build a cube tower",
    });

    expect(() => CreateInputEnvelopeSchema.parse(payload)).toThrow();
  });

  it("accepts an MVP spawn intent payload", () => {
    expect(
      SpawnIntentSchema.parse({
        source: "text",
        objectKind: "spring",
        prompt: "add a spring launcher",
        scale: [1, 2, 3],
      }),
    ).toEqual({
      source: "text",
      objectKind: "spring",
      prompt: "add a spring launcher",
      scale: [1, 2, 3],
    });
  });

  it("rejects empty prompts and unknown object kinds", () => {
    expect(() =>
      SpawnIntentSchema.parse({
        source: "text",
        objectKind: "unknown-kind",
        prompt: "valid prompt",
        scale: [1, 1, 1],
      }),
    ).toThrow();

    expect(() =>
      SpawnIntentSchema.parse({
        source: "image",
        objectKind: "cube",
        prompt: "",
        scale: [1, 1, 1],
      }),
    ).toThrow();
  });

  it("rejects non-finite and non-positive scale values", () => {
    expect(() =>
      SpawnIntentSchema.parse({
        source: "text",
        objectKind: "cube",
        prompt: "make it invalid",
        scale: [1, Number.NaN, 1],
      }),
    ).toThrow();

    expect(() =>
      SpawnIntentSchema.parse({
        source: "text",
        objectKind: "cube",
        prompt: "make it invalid",
        scale: [1, Number.POSITIVE_INFINITY, 1],
      }),
    ).toThrow();

    expect(() =>
      SpawnIntentSchema.parse({
        source: "text",
        objectKind: "cube",
        prompt: "make it invalid",
        scale: [1, 0, 1],
      }),
    ).toThrow();
  });
});
