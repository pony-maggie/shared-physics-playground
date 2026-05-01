import fs from "node:fs";
import path from "node:path";

import {
  ACCESS_TIERS,
  DEFAULT_RUNTIME_ACCESS_CONFIG,
  DEFAULT_SHARED_ROOM_SLUG,
  type AccessTier,
  type RuntimeAccessConfig,
} from "../../../../packages/shared/src/access-policy";

const ACCESS_CONFIG_RELATIVE_PATH = path.join("config", "playground-access.json");

function findDefaultConfigPath(startDir = process.cwd()): string {
  let currentDir = path.resolve(startDir);

  while (true) {
    const candidatePath = path.join(currentDir, ACCESS_CONFIG_RELATIVE_PATH);

    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      return path.resolve(startDir, ACCESS_CONFIG_RELATIVE_PATH);
    }

    currentDir = parentDir;
  }
}

function isAccessTier(input: unknown): input is AccessTier {
  return typeof input === "string" && ACCESS_TIERS.includes(input as AccessTier);
}

function parsePlan(
  tier: AccessTier,
  input: unknown,
  fallback: RuntimeAccessConfig["tiers"][AccessTier],
) {
  if (typeof input !== "object" || input === null) {
    return fallback;
  }

  const candidate = input as {
    defaultStageSlug?: unknown;
    maxStages?: unknown;
    maxObjectsPerStage?: unknown;
    canCreateStages?: unknown;
    defaultRoomSlug?: unknown;
    maxOwnedObjects?: unknown;
    canCreateNamedRooms?: unknown;
  };
  const defaultStageSlug =
    typeof candidate.defaultStageSlug === "string" && candidate.defaultStageSlug.trim().length > 0
      ? candidate.defaultStageSlug.trim()
      : typeof candidate.defaultRoomSlug === "string" && candidate.defaultRoomSlug.trim().length > 0
        ? candidate.defaultRoomSlug.trim()
        : fallback.defaultStageSlug || DEFAULT_SHARED_ROOM_SLUG;
  const maxObjectsPerStage =
    typeof candidate.maxObjectsPerStage === "number" && candidate.maxObjectsPerStage > 0
      ? candidate.maxObjectsPerStage
      : typeof candidate.maxOwnedObjects === "number" && candidate.maxOwnedObjects > 0
        ? candidate.maxOwnedObjects
        : fallback.maxObjectsPerStage;
  const canCreateStages =
    typeof candidate.canCreateStages === "boolean"
      ? candidate.canCreateStages
      : typeof candidate.canCreateNamedRooms === "boolean"
        ? candidate.canCreateNamedRooms
        : fallback.canCreateStages;

  return {
    tier,
    defaultStageSlug,
    maxStages:
      typeof candidate.maxStages === "number" && candidate.maxStages > 0
        ? candidate.maxStages
        : fallback.maxStages,
    maxObjectsPerStage,
    canCreateStages,
    defaultRoomSlug: defaultStageSlug,
    maxOwnedObjects: maxObjectsPerStage,
    canCreateNamedRooms: canCreateStages,
  };
}

export function loadRuntimeAccessConfig(
  configPath = findDefaultConfigPath(),
): RuntimeAccessConfig {
  if (!fs.existsSync(configPath)) {
    return DEFAULT_RUNTIME_ACCESS_CONFIG;
  }

  const raw = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
    defaultAuthenticatedTier?: unknown;
    tiers?: Record<string, unknown>;
    userOverrides?: Record<string, unknown>;
  };

  const defaultAuthenticatedTier = isAccessTier(raw.defaultAuthenticatedTier)
    ? raw.defaultAuthenticatedTier
    : DEFAULT_RUNTIME_ACCESS_CONFIG.defaultAuthenticatedTier;

  const tiers = {
    free: parsePlan("free", raw.tiers?.free, DEFAULT_RUNTIME_ACCESS_CONFIG.tiers.free),
    pro: parsePlan("pro", raw.tiers?.pro, DEFAULT_RUNTIME_ACCESS_CONFIG.tiers.pro),
  } satisfies RuntimeAccessConfig["tiers"];

  const userOverrides = Object.fromEntries(
    Object.entries(raw.userOverrides ?? {}).flatMap(([email, tier]) =>
      isAccessTier(tier) ? [[email.trim().toLowerCase(), tier]] : [],
    ),
  ) as RuntimeAccessConfig["userOverrides"];

  return {
    defaultAuthenticatedTier,
    tiers,
    userOverrides,
  };
}
