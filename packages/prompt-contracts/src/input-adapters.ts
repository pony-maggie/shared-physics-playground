export const CREATE_INPUT_SOURCES = ["text", "image"] as const;

export type CreateInputSource = (typeof CREATE_INPUT_SOURCES)[number];

export type CreateImageAttachment = {
  dataUrl: string;
  mimeType: string;
  name?: string;
};

export type CreateInputEnvelope = {
  source: CreateInputSource;
  prompt: string;
  image?: CreateImageAttachment;
};

type Schema<T> = {
  parse(input: unknown): T;
};

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function parsePrompt(input: unknown): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error("prompt must be a non-empty string");
  }

  return input;
}

function parseImageAttachment(input: unknown): CreateImageAttachment {
  if (!isRecord(input)) {
    throw new Error("image input must include image data");
  }

  const dataUrl = typeof input.dataUrl === "string" ? input.dataUrl.trim() : "";
  const mimeType = typeof input.mimeType === "string" ? input.mimeType.trim() : "";
  const name = typeof input.name === "string" && input.name.trim().length > 0
    ? input.name.trim()
    : undefined;

  if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(dataUrl)) {
    throw new Error("image input must include image data");
  }

  if (!/^image\/[a-z0-9.+-]+$/i.test(mimeType)) {
    throw new Error("image mime type must be an image");
  }

  return {
    dataUrl,
    mimeType,
    ...(name ? { name } : {}),
  };
}

export const CreateInputEnvelopeSchema: Schema<CreateInputEnvelope> = {
  parse(input) {
    if (!isRecord(input)) {
      throw new Error("create input must be an object");
    }

    const { source, prompt } = input;
    if (!CREATE_INPUT_SOURCES.includes(source as CreateInputSource)) {
      throw new Error("source must be text or image");
    }

    const parsed = {
      source: source as CreateInputSource,
      prompt: parsePrompt(prompt),
    };

    if (source === "image") {
      return {
        ...parsed,
        image: parseImageAttachment(input.image),
      };
    }

    return parsed;
  },
};
