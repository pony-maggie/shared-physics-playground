import { afterEach, describe, expect, it, vi } from "vitest";

import { createMiniMaxProvider } from "./minimax-provider";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("minimax provider", () => {
  it("uses the OpenAI-compatible MiniMax endpoint and unwraps think tags", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "MiniMax-M2.7",
          choices: [
            {
              message: {
                content:
                  "<think>Reasoning omitted</think>\n" +
                  JSON.stringify({
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
            prompt_tokens: 40,
            completion_tokens: 12,
            total_tokens: 52,
          },
        }),
        { status: 200 },
      ),
    );

    const provider = createMiniMaxProvider({
      apiKey: "test-key",
      baseUrl: "https://api.minimaxi.com/v1",
      model: "MiniMax-M2.7",
      timeoutMs: 8000,
    });

    await expect(
      provider.plan({ source: "text", prompt: "teacup sculpture" }),
    ).resolves.toEqual(
      expect.objectContaining({
        provider: "minimax",
        model: "MiniMax-M2.7",
        statusCode: 200,
        usage: {
          promptTokenCount: 40,
          candidatesTokenCount: 12,
          totalTokenCount: 52,
          cachedContentTokenCount: null,
        },
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.minimaxi.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      }),
    );
  });
});
