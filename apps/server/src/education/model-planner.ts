import {
  SIMULATION_CONCEPTS,
  SimulationPlanSchema,
  type SimulationPlan,
} from "../../../../packages/prompt-contracts/src/simulation-spec";

function getGoogleGeminiEndpoint(model: string, apiKey: string): string {
  const params = new URLSearchParams({ key: apiKey });
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?${params.toString()}`;
}

function getEducationPrompt(question: string): string {
  return [
    "Choose one built-in physics experiment template and configure safe starter values.",
    "Return JSON only. Do not include markdown.",
    `Allowed concepts: ${SIMULATION_CONCEPTS.join(", ")}`,
    'If none of the allowed concepts is a reasonable match, return exactly {"status":"no_match"}.',
    "Use exactly this top-level shape:",
    '{"concept":"one_allowed_concept","title":"short title","objective":"one sentence","variables":{},"guidingQuestions":["question 1","question 2"]}',
    "Variables must match the chosen concept and stay inside the application schema ranges.",
    "Do not invent concepts, code, formulas, assets, or fields.",
    `Student question: ${question}`,
  ].join("\n");
}

function extractGeminiText(payload: unknown): string {
  const text = (payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  })?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("invalid education model response");
  }

  return text.trim();
}

export type EducationModelPlanner = {
  plan: (question: string) => Promise<SimulationPlan | null>;
};

export function createEducationModelPlanner(props: {
  apiKey?: string;
  model: string;
  timeoutMs: number;
}): EducationModelPlanner {
  return {
    async plan(question) {
      if (!props.apiKey) {
        throw new Error("missing GOOGLE_API_KEY for education planner");
      }

      const response = await globalThis.fetch(
        getGoogleGeminiEndpoint(props.model, props.apiKey),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: getEducationPrompt(question) }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(props.timeoutMs),
        },
      );

      if (!response.ok) {
        throw new Error(`education model planner request failed: ${response.status}`);
      }

      const parsed = JSON.parse(extractGeminiText(await response.json())) as unknown;

      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed as { status?: unknown }).status === "no_match"
      ) {
        return null;
      }

      return SimulationPlanSchema.parse(parsed);
    },
  };
}
