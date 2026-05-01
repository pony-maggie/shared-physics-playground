import { afterEach, describe, expect, it, vi } from "vitest";

import { createGeminiProvider } from "./gemini-provider";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("gemini provider", () => {
  it("returns a normalized provider result", async () => {
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
                      prompt: "teacup sculpture",
                      objectKind: "cube",
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

    const provider = createGeminiProvider({
      apiKey: "test-key",
      model: "gemini-2.5-flash",
      timeoutMs: 8000,
    });

    await expect(
      provider.plan({ source: "text", prompt: "teacup sculpture" }),
    ).resolves.toEqual(
      expect.objectContaining({
        provider: "google",
        model: "gemini-2.5-flash",
        statusCode: 200,
        usage: {
          promptTokenCount: 42,
          candidatesTokenCount: 10,
          totalTokenCount: 52,
          cachedContentTokenCount: null,
        },
      }),
    );
  });

  it("sends image inputs as Gemini inline image parts", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      source: "image",
                      prompt: "recreate this wheel setup",
                      objectKind: "wheel",
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

    const provider = createGeminiProvider({
      apiKey: "test-key",
      model: "gemini-2.5-flash",
      timeoutMs: 8000,
    });

    await provider.plan({
      source: "image",
      prompt: "recreate this wheel setup",
      image: {
        dataUrl: "data:image/png;base64,aGVsbG8=",
        mimeType: "image/png",
        name: "wheel.png",
      },
    });

    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as {
      contents: Array<{ parts: Array<Record<string, unknown>> }>;
    };

    expect(body.contents[0]?.parts).toEqual([
      expect.objectContaining({ text: expect.stringContaining("Input source: image") }),
      {
        inlineData: {
          mimeType: "image/png",
          data: "aGVsbG8=",
        },
      },
    ]);
  });
});
