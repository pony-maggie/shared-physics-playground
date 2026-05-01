import { afterEach, describe, expect, test, vi } from "vitest";

import { createEducationModelPlanner } from "./model-planner";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("education model planner", () => {
  test("asks Gemini for a schema-valid simulation plan", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      concept: "refraction",
                      title: "Light bending through glass",
                      objective: "Tune refractive indices and incident angle.",
                      variables: {
                        incidentAngleDeg: 30,
                        refractiveIndex1: 1,
                        refractiveIndex2: 1.5,
                      },
                      guidingQuestions: [
                        "Why does the ray bend toward the normal?",
                        "What changes when the index increases?",
                      ],
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
    const planner = createEducationModelPlanner({
      apiKey: "key-1",
      model: "gemini-test",
      timeoutMs: 1000,
    });

    const plan = await planner.plan("show me why light bends in glass");

    expect(plan.concept).toBe("refraction");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("models/gemini-test:generateContent"),
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  test("rejects unsafe model output instead of passing it through", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      concept: "projectile_motion",
                      title: "Unsafe",
                      objective: "Unsafe",
                      variables: {
                        launchSpeedMps: 5000,
                        launchAngleDeg: 45,
                        launchHeightM: 0,
                        gravityMps2: 9.81,
                      },
                      guidingQuestions: ["What changes?", "What is unsafe?"],
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
    const planner = createEducationModelPlanner({
      apiKey: "key-1",
      model: "gemini-test",
      timeoutMs: 1000,
    });

    await expect(planner.plan("make a launch lab")).rejects.toThrow("launchSpeedMps must be between 1 and 60");
  });

  test("returns null when Gemini says no built-in template matches", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      status: "no_match",
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
    const planner = createEducationModelPlanner({
      apiKey: "key-1",
      model: "gemini-test",
      timeoutMs: 1000,
    });

    await expect(planner.plan("explain black holes")).resolves.toBeNull();
  });
});
