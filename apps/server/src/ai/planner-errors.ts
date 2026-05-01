export type PlannerErrorCode =
  | "timeout"
  | "rate_limited"
  | "provider_unavailable"
  | "invalid_response"
  | "auth_misconfigured"
  | "network_failure"
  | "unknown";

export type PlannerError = Error & {
  code: PlannerErrorCode;
  statusCode: number | null;
};

export function createPlannerError(
  code: PlannerErrorCode,
  message: string,
  statusCode: number | null = null,
): PlannerError {
  const error = new Error(message) as PlannerError;
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export function isPlannerError(value: unknown): value is PlannerError {
  return value instanceof Error && "code" in value && "statusCode" in value;
}

export function normalizePlannerError(error: unknown): PlannerError {
  if (isPlannerError(error)) {
    return error;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return createPlannerError("timeout", error.message || "planner request timed out");
  }

  if (error instanceof Error) {
    return createPlannerError("unknown", error.message);
  }

  return createPlannerError("unknown", "unexpected planner failure");
}

export function isFallbackEligiblePlannerError(error: PlannerError): boolean {
  return new Set<PlannerErrorCode>([
    "timeout",
    "rate_limited",
    "provider_unavailable",
    "invalid_response",
    "auth_misconfigured",
    "network_failure",
  ]).has(error.code);
}
