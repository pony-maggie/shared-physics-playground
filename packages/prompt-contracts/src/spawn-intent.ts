import {
  OBJECT_KINDS,
  type ObjectKind,
} from "../../physics-schema/src/catalog";
import {
  CREATE_INPUT_SOURCES,
  type CreateInputSource,
} from "./input-adapters";

export type SpawnIntent = {
  source: CreateInputSource;
  prompt: string;
  objectKind: ObjectKind;
  scale: [number, number, number];
};

function isNumberTuple3(input: unknown): input is [number, number, number] {
  return (
    Array.isArray(input) &&
    input.length === 3 &&
    input.every(
      (value) =>
        typeof value === "number" && Number.isFinite(value) && value > 0,
    )
  );
}

type SpawnIntentInput = {
  source: CreateInputSource;
  prompt: string;
  objectKind: ObjectKind;
  scale: [number, number, number];
};

export const SpawnIntentSchema = {
  parse(input: unknown): SpawnIntent {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      throw new Error("spawn intent must be an object");
    }

    const record = input as Record<string, unknown>;
    const { objectKind, prompt, scale, source } = record;

    if (!CREATE_INPUT_SOURCES.includes(source as CreateInputSource)) {
      throw new Error("source must be text or image");
    }

    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      throw new Error("prompt must be a non-empty string");
    }

    if (!OBJECT_KINDS.includes(objectKind as ObjectKind)) {
      throw new Error("objectKind must be a supported object kind");
    }

    if (!isNumberTuple3(scale)) {
      throw new Error("scale must be a tuple of three positive finite numbers");
    }

    const parsed: SpawnIntentInput = {
      source: source as CreateInputSource,
      prompt,
      objectKind: objectKind as ObjectKind,
      scale,
    };

    return parsed;
  },
};
