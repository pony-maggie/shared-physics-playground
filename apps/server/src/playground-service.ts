import type { CreateInputEnvelope } from "../../../packages/prompt-contracts/src/input-adapters";
import type { PlannerHealth } from "../../../packages/prompt-contracts/src/planner-config";
import type { Vector3 } from "../../../packages/physics-schema/src/world-object";
import type { UserAccessPolicy } from "../../../packages/shared/src/access-policy";
import { getObjectTemplate } from "../../../packages/physics-schema/src/catalog";
import type { createWorldRepository } from "./persistence/world-repository";

import { createCreatePlanner, type CreatePlanner } from "./ai/create-planner";
import type { Logger } from "./logging/logger";
import {
  addPlayer,
  applyObjectNudge,
  applyObjectRotation,
  applyObjectScale,
  applyObjectRemoval,
  applyQueuedImpulse,
  applySpawnIntent,
  clearRoom,
  createServerRoomStateFromTemplate,
  createServerRoomState,
  type ServerRoomState,
} from "./domain/room-state";

type WorldRepository = ReturnType<typeof createWorldRepository>;
type SeedRepository = Pick<WorldRepository, "getTemplate" | "saveTemplate"> &
  Partial<Pick<WorldRepository, "getWorld">>;
export const DEMO_ROOM_SLUG = "demo-stage";

function createDemoRoomState(id: string): ServerRoomState {
  return {
    id,
    roomObjectLimit: 5,
    players: {},
    objects: [
      {
        id: "object-1",
        displayName: "Spring launcher",
        kind: getObjectTemplate("spring").kind,
        ownerId: "demo-owner",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1.2, 1.2, 1.2],
        impulseCount: 1,
        lastImpulse: [0, 5, 0],
      },
      {
        id: "object-2",
        displayName: "Ramp",
        kind: getObjectTemplate("ramp").kind,
        ownerId: "demo-owner",
        position: [2, 0, 0],
        rotation: [0, 0, 12],
        scale: [1, 1, 1],
      },
      {
        id: "object-3",
        displayName: "Ball",
        kind: getObjectTemplate("ball").kind,
        ownerId: "demo-owner",
        position: [-2, 1, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    ],
  };
}

export type PlaygroundService = {
  getState: (roomSlug?: string) => ServerRoomState;
  getPlannerStatus: () => PlannerHealth;
  saveTemplate: (input: {
    roomId: string;
    title: string;
    stateJson: string;
  }) => Promise<{
    templateId: string;
    roomId: string;
    title: string;
    stateJson: string;
  }>;
  join: (
    roomSlug: string,
    playerId?: string | null,
    templateId?: string | null,
    access?: UserAccessPolicy | null,
    worldId?: string | null,
  ) => ServerRoomState;
  create: (
    roomSlug: string,
    playerId: string,
    payload: CreateInputEnvelope,
  ) => Promise<ServerRoomState>;
  queueImpulse: (
    roomSlug: string,
    playerId: string,
    objectId: string,
    impulse: [number, number, number],
  ) => ServerRoomState;
  nudgeObject: (
    roomSlug: string,
    playerId: string,
    objectId: string,
    delta: Vector3,
  ) => ServerRoomState;
  rotateObject: (
    roomSlug: string,
    playerId: string,
    objectId: string,
    delta: Vector3,
  ) => ServerRoomState;
  scaleObject: (
    roomSlug: string,
    playerId: string,
    objectId: string,
    delta: Vector3,
  ) => ServerRoomState;
  removeObject: (
    roomSlug: string,
    playerId: string,
    objectId: string,
  ) => ServerRoomState;
  clearRoom: (roomSlug: string, playerId: string) => ServerRoomState;
};

const NOOP_LOGGER: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

export function createPlaygroundService(props?: {
  planner?: CreatePlanner;
  worldRepository?: SeedRepository;
  logger?: Logger;
}): PlaygroundService {
  const rooms = new Map<string, ServerRoomState>();
  const planner = props?.planner ?? createCreatePlanner();
  const worldRepository = props?.worldRepository ?? null;
  const logger = props?.logger ?? NOOP_LOGGER;

  function getRoomState(roomSlug: string): ServerRoomState {
    const existing = rooms.get(roomSlug);

    if (existing) {
      return existing;
    }

    const created =
      roomSlug === DEMO_ROOM_SLUG ? createDemoRoomState(roomSlug) : createServerRoomState(roomSlug);
    rooms.set(roomSlug, created);
    return created;
  }

  function ensureTemplateRoom(
    roomSlug: string,
    playerId: string,
    templateId?: string | null,
  ): void {
    if (!templateId || !worldRepository) {
      return;
    }

    const existing = rooms.get(roomSlug);

    if (existing && (existing.objects.length > 0 || Object.keys(existing.players).length > 0)) {
      return;
    }

    const template = worldRepository.getTemplate(templateId);

    if (!template) {
      return;
    }

    rooms.set(
      roomSlug,
      createServerRoomStateFromTemplate(roomSlug, template.stateJson, playerId),
    );
  }

  function ensureWorldRoom(
    roomSlug: string,
    playerId: string,
    worldId?: string | null,
  ): void {
    if (!worldId || !worldRepository?.getWorld) {
      return;
    }

    const existing = rooms.get(roomSlug);

    if (existing && (existing.objects.length > 0 || Object.keys(existing.players).length > 0)) {
      return;
    }

    const world = worldRepository.getWorld(worldId);

    if (!world) {
      return;
    }

    rooms.set(roomSlug, createServerRoomStateFromTemplate(roomSlug, world.stateJson, playerId));
  }

  return {
    getState(roomSlug = "shared-stage") {
      return getRoomState(roomSlug);
    },
    getPlannerStatus() {
      return { ...planner.health };
    },
    async saveTemplate(input) {
      if (!worldRepository) {
        throw new Error("template persistence is not configured");
      }

      const saved = await worldRepository.saveTemplate(input);
      logger.info("playground.template_saved", {
        roomId: input.roomId,
        templateId: saved.templateId,
        title: input.title,
      });
      return saved;
    },
    join(roomSlug, playerId, templateId, access, worldId) {
      ensureWorldRoom(roomSlug, playerId ?? "demo-owner", worldId);
      ensureTemplateRoom(roomSlug, playerId ?? "demo-owner", templateId);

      if (!playerId) {
        return getRoomState(roomSlug);
      }

      const nextState = addPlayer(getRoomState(roomSlug), playerId, {
        objectLimit: access?.maxObjectsPerStage,
      });
      rooms.set(roomSlug, nextState);
      logger.info("playground.player_joined", {
        playerId,
        roomSlug,
        templateId: templateId ?? null,
        worldId: worldId ?? null,
      });
      return nextState;
    },
    async create(roomSlug, playerId, payload) {
      const intent = await planner.plan(payload);
      const nextState = applySpawnIntent(getRoomState(roomSlug), playerId, intent);
      rooms.set(roomSlug, nextState);
      const createdObject = nextState.objects.at(-1);
      logger.info("playground.object_created", {
        objectId: createdObject?.id ?? null,
        objectKind: intent.objectKind,
        playerId,
        prompt: payload.prompt,
        roomSlug,
        source: payload.source,
      });
      return nextState;
    },
    queueImpulse(roomSlug, playerId, objectId, impulse) {
      const nextState = applyQueuedImpulse(
        getRoomState(roomSlug),
        playerId,
        objectId,
        impulse,
      );
      rooms.set(roomSlug, nextState);
      return nextState;
    },
    nudgeObject(roomSlug, playerId, objectId, delta) {
      const nextState = applyObjectNudge(
        getRoomState(roomSlug),
        playerId,
        objectId,
        delta,
      );
      rooms.set(roomSlug, nextState);
      return nextState;
    },
    rotateObject(roomSlug, playerId, objectId, delta) {
      const nextState = applyObjectRotation(
        getRoomState(roomSlug),
        playerId,
        objectId,
        delta,
      );
      rooms.set(roomSlug, nextState);
      return nextState;
    },
    scaleObject(roomSlug, playerId, objectId, delta) {
      const nextState = applyObjectScale(
        getRoomState(roomSlug),
        playerId,
        objectId,
        delta,
      );
      rooms.set(roomSlug, nextState);
      return nextState;
    },
    removeObject(roomSlug, playerId, objectId) {
      const nextState = applyObjectRemoval(
        getRoomState(roomSlug),
        playerId,
        objectId,
      );
      rooms.set(roomSlug, nextState);
      return nextState;
    },
    clearRoom(roomSlug, playerId) {
      const nextState = clearRoom(getRoomState(roomSlug), playerId);
      rooms.set(roomSlug, nextState);
      return nextState;
    },
  };
}
