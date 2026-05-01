import { describe, expect, it } from "vitest";

import {
  createPlannerError,
  isFallbackEligiblePlannerError,
} from "./planner-errors";

describe("planner errors", () => {
  it("marks timeout and provider_unavailable as fallback-eligible", () => {
    expect(
      isFallbackEligiblePlannerError(createPlannerError("timeout", "timed out")),
    ).toBe(true);
    expect(
      isFallbackEligiblePlannerError(
        createPlannerError("provider_unavailable", "provider unavailable"),
      ),
    ).toBe(true);
  });

  it("marks invalid_response as fallback-eligible but unknown as ineligible", () => {
    expect(
      isFallbackEligiblePlannerError(
        createPlannerError("invalid_response", "bad payload"),
      ),
    ).toBe(true);
    expect(
      isFallbackEligiblePlannerError(createPlannerError("unknown", "unexpected")),
    ).toBe(false);
  });
});
