export const ACCESS_TIERS = ["free", "pro"] as const;

export type AccessTier = (typeof ACCESS_TIERS)[number];

export type UserAccessPolicy = {
  tier: AccessTier;
  defaultStageSlug: string;
  maxStages: number;
  maxObjectsPerStage: number;
  canCreateStages: boolean;
  defaultRoomSlug: string;
  maxOwnedObjects: number;
  canCreateNamedRooms: boolean;
};

export type RuntimeAccessConfig = {
  defaultAuthenticatedTier: AccessTier;
  tiers: Record<AccessTier, UserAccessPolicy>;
  userOverrides: Record<string, AccessTier>;
};

export const DEFAULT_SHARED_ROOM_SLUG = "my-stage";

export const DEFAULT_RUNTIME_ACCESS_CONFIG: RuntimeAccessConfig = {
  defaultAuthenticatedTier: "free",
  tiers: {
    free: {
      tier: "free",
      defaultStageSlug: DEFAULT_SHARED_ROOM_SLUG,
      maxStages: 1,
      maxObjectsPerStage: 5,
      canCreateStages: false,
      defaultRoomSlug: DEFAULT_SHARED_ROOM_SLUG,
      maxOwnedObjects: 5,
      canCreateNamedRooms: false,
    },
    pro: {
      tier: "pro",
      defaultStageSlug: DEFAULT_SHARED_ROOM_SLUG,
      maxStages: 50,
      maxObjectsPerStage: 10,
      canCreateStages: true,
      defaultRoomSlug: DEFAULT_SHARED_ROOM_SLUG,
      maxOwnedObjects: 10,
      canCreateNamedRooms: true,
    },
  },
  userOverrides: {},
};

export function normalizeAccessEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getUserAccessPolicy(
  config: RuntimeAccessConfig,
  email: string,
): UserAccessPolicy {
  const normalizedEmail = normalizeAccessEmail(email);
  const tier =
    config.userOverrides[normalizedEmail] ?? config.defaultAuthenticatedTier;

  return config.tiers[tier];
}
