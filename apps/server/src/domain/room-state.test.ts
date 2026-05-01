import { describe, expect, it } from "vitest";

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
} from "./room-state";

describe("server room state", () => {
  it("creates the default server room state", () => {
    expect(createServerRoomState("room-1")).toEqual({
      id: "room-1",
      roomObjectLimit: 10,
      objects: [],
      players: {},
    });
  });

  it("adds users with the default per-stage object limit", () => {
    const state = addPlayer(createServerRoomState("room-1"), "p1");

    expect(state.players.p1).toEqual({
      id: "p1",
      objectLimit: 10,
    });
  });

  it("adds users with a configured per-stage object limit", () => {
    const state = addPlayer(createServerRoomState("room-1"), "p1", {
      objectLimit: 5,
    });

    expect(state.players.p1).toEqual({
      id: "p1",
      objectLimit: 5,
    });
    expect(state.roomObjectLimit).toBe(5);
  });

  it("hydrates a reusable template into a room with fresh ownership and no players", () => {
    const state = createServerRoomStateFromTemplate(
      "room-2",
      JSON.stringify({
        roomObjectLimit: 10,
        objects: [
          {
            id: "object-7",
            kind: "spring",
            ownerId: "old-owner",
            position: [1, 2, 3],
            rotation: [0, 0, 15],
            scale: [1.5, 1.5, 1.5],
            impulseCount: 2,
            lastImpulse: [0, 5, 0],
          },
        ],
      }),
      "p1",
    );

    expect(state).toEqual({
      id: "room-2",
      roomObjectLimit: 10,
      players: {},
      objects: [
        {
          id: "object-7",
          kind: "spring",
          ownerId: "p1",
          position: [1, 2, 3],
          rotation: [0, 0, 15],
          scale: [1.5, 1.5, 1.5],
          impulseCount: 2,
          lastImpulse: [0, 5, 0],
        },
      ],
    });
  });

  it("does not reset objects when an existing user rejoins", () => {
    const state = addPlayer(createServerRoomState("room-1"), "p1");
    const spentState = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a spring",
      objectKind: "spring",
      scale: [1, 1, 1],
    });

    const rejoinedState = addPlayer(spentState, "p1");

    expect(rejoinedState.players.p1).toEqual({
      id: "p1",
      objectLimit: 10,
    });
    expect(rejoinedState.objects).toHaveLength(1);
  });

  it("spawns one object without applying catalog object limit cost", () => {
    const state = addPlayer(createServerRoomState("room-1"), "p1");

    const nextState = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a spring",
      objectKind: "spring",
      scale: [1, 1, 1],
    });

    expect(nextState.players.p1?.objectLimit).toBe(10);
    expect(nextState.objects).toHaveLength(1);
    expect(nextState.objects[0]).toEqual({
      id: "object-1",
      displayName: "add a spring",
      kind: "spring",
      ownerId: "p1",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
  });

  it("keeps the original prompt as the object display name", () => {
    const state = addPlayer(createServerRoomState("room-1"), "p1");

    const nextState = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "篮球",
      objectKind: "ball",
      scale: [1, 1, 1],
    });

    expect(nextState.objects[0]?.displayName).toBe("篮球");
  });

  it("spreads new objects across distinct spawn positions instead of stacking them all at the origin", () => {
    let state = addPlayer(createServerRoomState("room-1"), "p1");

    state = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a spring",
      objectKind: "spring",
      scale: [1, 1, 1],
    });
    state = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a ball",
      objectKind: "ball",
      scale: [1, 1, 1],
    });
    state = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a cube",
      objectKind: "cube",
      scale: [1, 1, 1],
    });

    expect(state.objects.map((object) => object.position)).toEqual([
      [0, 0, 0],
      [2.8, 0, 0],
      [-2.8, 0, 0],
    ]);
  });

  it("assigns the next object id without reusing gaps", () => {
    const state = addPlayer(
      {
        ...createServerRoomState("room-1"),
        objects: [
          { id: "object-1", kind: "cube", ownerId: "p1" },
          { id: "object-3", kind: "ramp", ownerId: "p1" },
        ],
      },
      "p1",
    );

    const nextState = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a ball",
      objectKind: "ball",
      scale: [1, 1, 1],
    });

    expect(nextState.objects[2]).toEqual({
      id: "object-4",
      displayName: "add a ball",
      kind: "ball",
      ownerId: "p1",
      position: [-2.8, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
  });

  it("throws when the player is missing", () => {
    expect(() =>
      applySpawnIntent(createServerRoomState("room-1"), "missing", {
        source: "text",
        prompt: "add a spring",
        objectKind: "spring",
        scale: [1, 1, 1],
      }),
    ).toThrowError("invalid player");
  });

  it("handles inherited object keys safely", () => {
    expect(() =>
      applySpawnIntent(createServerRoomState("room-1"), "toString", {
        source: "text",
        prompt: "add a spring",
        objectKind: "spring",
        scale: [1, 1, 1],
      }),
    ).toThrowError("invalid player");

    const state = addPlayer(createServerRoomState("room-1"), "toString");

    expect(state.players.toString).toEqual({
      id: "toString",
      objectLimit: 10,
    });
  });

  it("ignores legacy budget fields and uses object count limits", () => {
    const state = addPlayer(
      {
        ...createServerRoomState("room-1"),
        players: {
          p1: {
            id: "p1",
            budgetRemaining: 2,
            objectLimit: 10,
          },
        },
      },
      "p1",
    );

    const nextState = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a spring",
      objectKind: "spring",
      scale: [1, 1, 1],
    });

    expect(nextState.objects).toHaveLength(1);
  });

  it("throws when the user has already reached the stage object limit", () => {
    let state = addPlayer(createServerRoomState("room-1"), "p1", {
      objectLimit: 2,
    });

    state = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a ball",
      objectKind: "ball",
      scale: [1, 1, 1],
    });
    state = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a wheel",
      objectKind: "wheel",
      scale: [1, 1, 1],
    });

    expect(() =>
      applySpawnIntent(state, "p1", {
        source: "text",
        prompt: "add a cube",
        objectKind: "cube",
        scale: [1, 1, 1],
      }),
    ).toThrowError("player object limit reached");
  });

  it("throws when the room object limit is reached", () => {
    const state = addPlayer(
      {
        ...createServerRoomState("room-1"),
        roomObjectLimit: 0,
      },
      "p1",
    );

    expect(() =>
      applySpawnIntent(state, "p1", {
        source: "text",
        prompt: "add a spring",
        objectKind: "spring",
        scale: [1, 1, 1],
      }),
    ).toThrowError("room object limit reached");
  });

  it("records a queued impulse on an existing object", () => {
    const state = addPlayer(createServerRoomState("room-1"), "p1");
    const spawned = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a spring",
      objectKind: "spring",
      scale: [1, 1, 1],
    });

    const nextState = applyQueuedImpulse(spawned, "p1", "object-1", [0, 5, 0]);

    expect(nextState.objects[0]).toEqual({
      id: "object-1",
      displayName: "add a spring",
      kind: "spring",
      ownerId: "p1",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      impulseCount: 1,
      lastImpulse: [0, 5, 0],
    });
  });

  it("removes an owned object without changing the stage object limit", () => {
    const state = addPlayer(createServerRoomState("room-1"), "p1");
    const spawned = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a spring",
      objectKind: "spring",
      scale: [1, 1, 1],
    });

    const nextState = applyObjectRemoval(spawned, "p1", "object-1");

    expect(nextState.objects).toEqual([]);
    expect(nextState.players.p1).toEqual({
      id: "p1",
      objectLimit: 10,
    });
  });

  it("nudges an existing object position within the room state", () => {
    const state = addPlayer(createServerRoomState("room-1"), "p1");
    const spawned = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a spring",
      objectKind: "spring",
      scale: [1, 1, 1],
    });

    const nextState = applyObjectNudge(spawned, "p1", "object-1", [1, 0, 0]);

    expect(nextState.objects[0]?.position).toEqual([1, 0, 0]);
  });

  it("rotates an existing object by adding the delta to its rotation", () => {
    const state = addPlayer(createServerRoomState("room-1"), "p1");
    const spawned = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a spring",
      objectKind: "spring",
      scale: [1, 1, 1],
    });

    const nextState = applyObjectRotation(spawned, "p1", "object-1", [0, 45, 0]);

    expect(nextState.objects[0]?.rotation).toEqual([0, 45, 0]);
  });

  it("scales an existing object by adding the delta to its scale", () => {
    const state = addPlayer(createServerRoomState("room-1"), "p1");
    const spawned = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a spring",
      objectKind: "spring",
      scale: [1, 1, 1],
    });

    const nextState = applyObjectScale(spawned, "p1", "object-1", [0.5, 0.25, 1]);

    expect(nextState.objects[0]?.scale).toEqual([1.5, 1.25, 2]);
  });

  it("rejects non-positive resulting scale values", () => {
    const state = addPlayer(createServerRoomState("room-1"), "p1");
    const spawned = applySpawnIntent(state, "p1", {
      source: "text",
      prompt: "add a spring",
      objectKind: "spring",
      scale: [1, 1, 1],
    });

    expect(() =>
      applyObjectScale(spawned, "p1", "object-1", [-2, 0, 0]),
    ).toThrowError("invalid scale");
  });

  it("clears the stage without changing user object limits", () => {
    const state = {
      ...createServerRoomState("room-1"),
      players: {
        p1: {
          id: "p1",
          objectLimit: 5,
        },
        p2: {
          id: "p2",
          objectLimit: 10,
        },
      },
      objects: [
        {
          id: "object-1",
          kind: "spring",
          ownerId: "p1",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      ],
    };

    expect(clearRoom(state, "p1")).toEqual({
      ...state,
      objects: [],
      players: {
        p1: {
          id: "p1",
          objectLimit: 5,
        },
        p2: {
          id: "p2",
          objectLimit: 10,
        },
      },
    });
  });
});
