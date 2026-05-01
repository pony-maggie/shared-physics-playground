import { getObjectTemplate } from "../../../../packages/physics-schema/src/catalog";
import type { Vector3 } from "../../../../packages/physics-schema/src/world-object";
import type { SpawnIntent } from "../../../../packages/prompt-contracts/src/spawn-intent";

export type ServerRoomPlayerState = {
  id: string;
  objectLimit: number;
};

export type ServerRoomState = {
  id: string;
  roomObjectLimit: number;
  objects: ServerRoomObjectState[];
  players: Record<string, ServerRoomPlayerState>;
};

export type ServerRoomObjectState = {
  id: string;
  kind: ReturnType<typeof getObjectTemplate>["kind"];
  ownerId: string;
  displayName?: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  impulseCount?: number;
  lastImpulse?: [number, number, number];
};

const DEFAULT_STAGE_OBJECT_LIMIT = 10;

function hasOwnPlayer(
  players: ServerRoomState["players"],
  playerId: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(players, playerId);
}

function getNextObjectId(objects: ServerRoomObjectState[]): string {
  let maxObjectNumber = 0;

  for (const object of objects) {
    const match = /^object-(\d+)$/.exec(object.id);

    if (!match) {
      continue;
    }

    const objectNumber = Number.parseInt(match[1], 10);

    if (objectNumber > maxObjectNumber) {
      maxObjectNumber = objectNumber;
    }
  }

  return `object-${maxObjectNumber + 1}`;
}

function isValidImpulse(impulse: [number, number, number]): boolean {
  return impulse.length === 3 && impulse.every((value) => Number.isFinite(value));
}

function isValidVector3(input: Vector3): boolean {
  return input.length === 3 && input.every((value) => Number.isFinite(value));
}

function addVector3(left: Vector3, right: Vector3): Vector3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function getSpawnPosition(objectCount: number): Vector3 {
  if (objectCount === 0) {
    return [0, 0, 0];
  }

  const row = Math.floor((objectCount - 1) / 3);
  const column = (objectCount - 1) % 3;
  const xOffsets: [number, number, number] = [2.8, -2.8, 0];

  return [xOffsets[column], 0, row > 0 ? -row * 2.8 : 0];
}

function isWorldObjectCandidate(input: unknown): input is Partial<ServerRoomObjectState> & {
  id: string;
  kind: string;
} {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof (input as { id?: unknown }).id === "string" &&
    typeof (input as { kind?: unknown }).kind === "string"
  );
}

function normalizeVector3(input: unknown, fallback: Vector3): Vector3 {
  return Array.isArray(input) &&
    input.length === 3 &&
    input.every((value) => typeof value === "number" && Number.isFinite(value))
    ? [input[0], input[1], input[2]]
    : fallback;
}

export function createServerRoomState(id: string): ServerRoomState {
  return {
    id,
    roomObjectLimit: DEFAULT_STAGE_OBJECT_LIMIT,
    objects: [],
    players: {},
  };
}

export function createServerRoomStateFromTemplate(
  id: string,
  stateJson: string,
  ownerId: string,
): ServerRoomState {
  const parsed = JSON.parse(stateJson) as {
    roomObjectLimit?: unknown;
    objects?: unknown[];
  };
  const objectsInput = Array.isArray(parsed.objects) ? parsed.objects : [];

  return {
    id,
    roomObjectLimit: DEFAULT_STAGE_OBJECT_LIMIT,
    players: {},
    objects: objectsInput.flatMap((object): ServerRoomObjectState[] => {
      if (!isWorldObjectCandidate(object)) {
        return [];
      }

      const template = getObjectTemplate(object.kind);

      if (!template) {
        return [];
      }

      return [
        {
          id: object.id,
          kind: template.kind,
          ownerId,
          displayName:
            typeof object.displayName === "string" && object.displayName.trim().length > 0
              ? object.displayName.trim()
              : undefined,
          position: normalizeVector3(object.position, [0, 0, 0]),
          rotation: normalizeVector3(object.rotation, [0, 0, 0]),
          scale: normalizeVector3(object.scale, [1, 1, 1]),
          impulseCount:
            typeof object.impulseCount === "number" ? object.impulseCount : undefined,
          lastImpulse: normalizeVector3(object.lastImpulse, [0, 0, 0]),
        },
      ];
    }).map((object) => ({
      ...object,
      lastImpulse: object.impulseCount ? object.lastImpulse : undefined,
    })),
  };
}

export function addPlayer(
  state: ServerRoomState,
  playerId: string,
  options?: {
    objectLimit?: number;
    ownedObjectLimit?: number;
  },
): ServerRoomState {
  const objectLimit =
    typeof options?.objectLimit === "number" && options.objectLimit > 0
      ? options.objectLimit
      : typeof options?.ownedObjectLimit === "number" && options.ownedObjectLimit > 0
        ? options.ownedObjectLimit
      : state.roomObjectLimit > 0
        ? state.roomObjectLimit
        : DEFAULT_STAGE_OBJECT_LIMIT;
  const hasExplicitObjectLimit =
    (typeof options?.objectLimit === "number" && options.objectLimit > 0) ||
    (typeof options?.ownedObjectLimit === "number" && options.ownedObjectLimit > 0);
  const roomObjectLimit = hasExplicitObjectLimit ? objectLimit : state.roomObjectLimit;

  if (hasOwnPlayer(state.players, playerId)) {
    return {
      ...state,
      roomObjectLimit,
      players: {
        ...state.players,
        [playerId]: {
          ...state.players[playerId],
          objectLimit,
        },
      },
    };
  }

  return {
    ...state,
    roomObjectLimit,
    players: {
      ...state.players,
      [playerId]: {
        id: playerId,
        objectLimit,
      },
    },
  };
}

export function clearRoom(
  state: ServerRoomState,
  playerId: string,
): ServerRoomState {
  if (!hasOwnPlayer(state.players, playerId)) {
    throw new Error("invalid player");
  }

  return {
    ...state,
    objects: [],
  };
}

export function applySpawnIntent(
  state: ServerRoomState,
  playerId: string,
  intent: SpawnIntent,
): ServerRoomState {
  if (!hasOwnPlayer(state.players, playerId)) {
    throw new Error("invalid player");
  }

  const player = state.players[playerId];

  const template = getObjectTemplate(intent.objectKind);

  if (!template) {
    throw new Error("invalid object kind");
  }

  if (state.objects.filter((object) => object.ownerId === playerId).length >= player.objectLimit) {
    throw new Error("player object limit reached");
  }

  if (state.objects.length >= state.roomObjectLimit) {
    throw new Error("room object limit reached");
  }

  const nextObject: ServerRoomObjectState = {
    id: getNextObjectId(state.objects),
    ownerId: playerId,
    kind: template.kind,
    displayName: intent.prompt.trim().length > 0 ? intent.prompt.trim() : template.kind,
    position: getSpawnPosition(state.objects.length),
    rotation: [0, 0, 0],
    scale: intent.scale,
  };

  return {
    ...state,
    objects: [...state.objects, nextObject],
  };
}

export function applyQueuedImpulse(
  state: ServerRoomState,
  playerId: string,
  objectId: string,
  impulse: [number, number, number],
): ServerRoomState {
  if (!hasOwnPlayer(state.players, playerId)) {
    throw new Error("invalid player");
  }

  if (!isValidImpulse(impulse)) {
    throw new Error("invalid impulse");
  }

  const targetObject = state.objects.find((object) => object.id === objectId);

  if (!targetObject) {
    throw new Error("invalid object");
  }

  return {
    ...state,
    objects: state.objects.map((object) =>
      object.id === objectId
        ? {
            ...object,
            impulseCount: (object.impulseCount ?? 0) + 1,
            lastImpulse: impulse,
          }
        : object,
    ),
  };
}

export function applyObjectRemoval(
  state: ServerRoomState,
  playerId: string,
  objectId: string,
): ServerRoomState {
  if (!hasOwnPlayer(state.players, playerId)) {
    throw new Error("invalid player");
  }

  const targetObject = state.objects.find((object) => object.id === objectId);

  if (!targetObject) {
    throw new Error("invalid object");
  }

  if (targetObject.ownerId !== playerId) {
    throw new Error("forbidden object owner");
  }

  return {
    ...state,
    objects: state.objects.filter((object) => object.id !== objectId),
  };
}

export function applyObjectNudge(
  state: ServerRoomState,
  playerId: string,
  objectId: string,
  delta: Vector3,
): ServerRoomState {
  if (!hasOwnPlayer(state.players, playerId)) {
    throw new Error("invalid player");
  }

  if (!isValidVector3(delta)) {
    throw new Error("invalid nudge");
  }

  const targetObject = state.objects.find((object) => object.id === objectId);

  if (!targetObject) {
    throw new Error("invalid object");
  }

  return {
    ...state,
    objects: state.objects.map((object) =>
      object.id === objectId
        ? {
            ...object,
            position: [
              object.position[0] + delta[0],
              object.position[1] + delta[1],
              object.position[2] + delta[2],
            ],
          }
        : object,
      ),
  };
}

export function applyObjectRotation(
  state: ServerRoomState,
  playerId: string,
  objectId: string,
  delta: Vector3,
): ServerRoomState {
  if (!hasOwnPlayer(state.players, playerId)) {
    throw new Error("invalid player");
  }

  if (!isValidVector3(delta)) {
    throw new Error("invalid rotation");
  }

  const targetObject = state.objects.find((object) => object.id === objectId);

  if (!targetObject) {
    throw new Error("invalid object");
  }

  return {
    ...state,
    objects: state.objects.map((object) =>
      object.id === objectId
        ? {
            ...object,
            rotation: addVector3(object.rotation, delta),
          }
        : object,
    ),
  };
}

export function applyObjectScale(
  state: ServerRoomState,
  playerId: string,
  objectId: string,
  delta: Vector3,
): ServerRoomState {
  if (!hasOwnPlayer(state.players, playerId)) {
    throw new Error("invalid player");
  }

  if (!isValidVector3(delta)) {
    throw new Error("invalid scale");
  }

  const targetObject = state.objects.find((object) => object.id === objectId);

  if (!targetObject) {
    throw new Error("invalid object");
  }

  const nextScale = addVector3(targetObject.scale, delta);

  if (nextScale.some((value) => value <= 0)) {
    throw new Error("invalid scale");
  }

  return {
    ...state,
    objects: state.objects.map((object) =>
      object.id === objectId
        ? {
            ...object,
            scale: nextScale,
          }
        : object,
    ),
  };
}
