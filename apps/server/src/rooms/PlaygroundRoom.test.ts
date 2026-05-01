import { afterEach, describe, expect, it, vi } from "vitest";

import { createCreatePlanner } from "../ai/create-planner";
import { createPlannerHealth } from "../../../../packages/prompt-contracts/src/planner-config";

type MockBroadcast = {
  type: string;
  payload: unknown;
};

type MockSend = {
  type: string;
  payload: unknown;
};

type MockState = {
  players: Record<string, { id: string; objectLimit: number }>;
  objects: Array<{
    id: string;
    kind: string;
    ownerId: string;
    impulseCount?: number;
    lastImpulse?: [number, number, number];
  }>;
};

type MockedPlaygroundRoom = PlaygroundRoom & {
  roomId: string;
  state: MockState;
  __broadcasts: MockBroadcast[];
  __handlers: Map<string, (client: unknown, payload: unknown) => void>;
};

const { MockRoom } = vi.hoisted(() => {
  class HoistedMockRoom<State> {
    roomId = "";
    state!: State;
    __broadcasts: MockBroadcast[] = [];
    __handlers = new Map<string, (client: unknown, payload: unknown) => void>();

    setState(state: State): void {
      this.state = state;
    }

    onMessage(
      type: string,
      handler: (client: unknown, payload: unknown) => void,
    ): void {
      this.__handlers.set(type, handler);
    }

    broadcast(type: string, payload: unknown): void {
      this.__broadcasts.push({ type, payload });
    }
  }

  return { MockRoom: HoistedMockRoom };
});

vi.mock(
  "colyseus",
  () => ({
    Room: MockRoom,
  }),
);

afterEach(() => {
  vi.restoreAllMocks();
  PlaygroundRoom.configurePersistence(null);
  PlaygroundRoom.configureLogger(null);
});

import { normalizeCreateMessage } from "../domain/spawn-intents";
import { PlaygroundRoom } from "./PlaygroundRoom";

function createMockPlanner() {
  const health = createPlannerHealth({
    mode: "mock",
    model: "gemini-2.5-flash",
    vendor: "google",
  });

  return {
    health,
    metadata: health,
    plan: vi.fn().mockResolvedValue({
      source: "text" as const,
      prompt: "add a spring",
      objectKind: "spring" as const,
      scale: [1, 1, 1] as [number, number, number],
    }),
  };
}

describe("normalizeCreateMessage", () => {
  it('maps "add a big spring" to a spring spawn intent with big scale', () => {
    expect(
      normalizeCreateMessage({
        source: "text",
        prompt: "add a big spring",
      }),
    ).toEqual({
      source: "text",
      prompt: "add a big spring",
      objectKind: "spring",
      scale: [1.5, 1.5, 1.5],
    });
  });
});

describe("PlaygroundRoom", () => {
  it("keeps the same state object when players join and create objects", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    const planner = createMockPlanner();
    room.onCreate({ planner } as never);

    const initialState = room.state;
    const sends: MockSend[] = [];
    const client = {
      sessionId: "player-1",
      send(type: string, payload: unknown) {
        sends.push({ type, payload });
      },
    };

    room.onJoin(client as never);

    const createHandler = room.__handlers.get("create");

    expect(createHandler).toBeTypeOf("function");

    await createHandler?.(client, {
      source: "text",
      prompt: "add a spring",
    });

    expect(planner.plan).toHaveBeenCalledWith({
      source: "text",
      prompt: "add a spring",
    });
    expect(room.state).toBe(initialState);
    expect(room.state.players["player-1"]).toEqual({
      id: "player-1",
      objectLimit: 10,
    });
    expect(room.state.objects).toEqual([
      {
        displayName: "add a spring",
        id: "object-1",
        kind: "spring",
        ownerId: "player-1",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    ]);
    expect(sends).toEqual([
      {
        type: "planner-status",
        payload: {
          activeMode: "mock",
          fallbackReason: null,
          lastFailureAt: null,
          mode: "mock",
          model: "gemini-2.5-flash",
          status: "ready",
          vendor: "google",
        },
      },
      {
        type: "room-state",
        payload: room.state,
      },
    ]);
    expect(room.__broadcasts).toEqual([
      {
        type: "room-state",
        payload: room.state,
      },
      {
        type: "planner-status",
        payload: {
          activeMode: "mock",
          fallbackReason: null,
          lastFailureAt: null,
          mode: "mock",
          model: "gemini-2.5-flash",
          status: "ready",
          vendor: "google",
        },
      },
      {
        type: "room-state",
        payload: room.state,
      },
    ]);
  });

  it("logs room joins and recoverable action errors through the configured room logger", async () => {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    PlaygroundRoom.configureLogger(logger);

    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-logger";
    room.onCreate();

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };

    room.onJoin(client as never);
    room.__handlers.get("queue-impulse")?.(client, {
      objectId: "missing-object",
      impulse: [0, 1, 0],
    });

    expect(logger.info).toHaveBeenCalledWith("room.client_joined", {
      roomId: "room-logger",
      sessionId: "player-1",
      userId: "player-1",
      writable: true,
    });
    expect(logger.warn).toHaveBeenCalledWith("room.action_error", {
      action: "queue-impulse",
      reason: "invalid object",
      roomId: "room-logger",
      sessionId: "player-1",
      userId: null,
    });
  });

  it("swallows ordinary create errors without mutating state or broadcasting", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const initialState = room.state;
    const createHandler = room.__handlers.get("create");
    const client = {
      sessionId: "missing-player",
      send: vi.fn(),
    };

    expect(createHandler).toBeTypeOf("function");
    await expect(
      createHandler?.(
        client,
        {
          source: "text",
          prompt: "add a spring",
        },
      ),
    ).resolves.toBeUndefined();
    expect(room.state).toBe(initialState);
    expect(room.state.players).toEqual({});
    expect(room.state.objects).toEqual([]);
    expect(room.__broadcasts).toEqual([
      {
        type: "planner-status",
        payload: {
          activeMode: "mock",
          fallbackReason: null,
          lastFailureAt: null,
          mode: "mock",
          model: "gemini-2.5-flash",
          status: "ready",
          vendor: "google",
        },
      },
    ]);
    expect(client.send).toHaveBeenCalledWith("action-error", {
      action: "create",
      message: "invalid player",
    });
  });

  it("sends recoverable create errors when the player has reached the owned object cap", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    room.onJoin(client as never);
    room.state.players["player-1"].objectLimit = 0;

    const createHandler = room.__handlers.get("create");

    expect(createHandler).toBeTypeOf("function");
    await expect(
      createHandler?.(client, {
        source: "text",
        prompt: "add a spring",
      }),
    ).resolves.toBeUndefined();

    expect(client.send).toHaveBeenCalledWith("action-error", {
      action: "create",
      message: "player object limit reached",
    });
  });

  it("hydrates the initial room from a saved template when the first player joins with a template id", () => {
    PlaygroundRoom.configurePersistence({
      getTemplate(templateId: string) {
        return templateId === "template-1"
          ? {
              templateId,
              roomId: "saved-room",
              title: "Saved Template",
              stateJson: JSON.stringify({
                roomObjectLimit: 10,
                objects: [
                  {
                    id: "object-7",
                    kind: "spring",
                    ownerId: "old-owner",
                    position: [1, 2, 3],
                    rotation: [0, 0, 15],
                    scale: [1.5, 1.5, 1.5],
                  },
                ],
              }),
            }
          : null;
      },
    });

    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate({ templateId: "template-1" } as never);

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };

    room.onJoin(client as never);

    expect(room.state.roomObjectLimit).toBe(10);
    expect(room.state.players["player-1"]).toEqual({
      id: "player-1",
      objectLimit: 10,
    });
    expect(room.state.objects).toEqual([
      {
        id: "object-7",
        kind: "spring",
        ownerId: "player-1",
        position: [1, 2, 3],
        rotation: [0, 0, 15],
        scale: [1.5, 1.5, 1.5],
      },
    ]);
  });

  it("broadcasts room state when an impulse is queued for an existing object", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    room.onJoin(client as never);
    await room.__handlers.get("create")?.(client, {
      source: "text",
      prompt: "add a spring",
    });

    const impulseHandler = room.__handlers.get("queue-impulse");

    expect(impulseHandler).toBeTypeOf("function");

    impulseHandler?.(client, {
      objectId: "object-1",
      impulse: [0, 5, 0],
    });

    expect(room.state.objects).toEqual([
      {
        displayName: "add a spring",
        id: "object-1",
        kind: "spring",
        ownerId: "player-1",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        impulseCount: 1,
        lastImpulse: [0, 5, 0],
      },
    ]);
    expect(room.__broadcasts.at(-1)).toEqual({
      type: "room-state",
      payload: room.state,
    });
  });

  it("clears the room and preserves stage limits when a player triggers clear-room", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const playerOne = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    const playerTwo = {
      sessionId: "player-2",
      send: vi.fn(),
    };

    room.onJoin(playerOne as never);
    room.onJoin(playerTwo as never);
    await room.__handlers.get("create")?.(playerOne, {
      source: "text",
      prompt: "add a spring",
    });

    room.__handlers.get("clear-room")?.(playerOne, undefined);

    expect(room.state.objects).toEqual([]);
    expect(room.state.players["player-1"]?.objectLimit).toBe(10);
    expect(room.state.players["player-2"]?.objectLimit).toBe(10);
    expect(room.__broadcasts.at(-1)).toEqual({
      type: "room-state",
      payload: room.state,
    });
  });

  it("broadcasts room state when an owned object is removed", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    room.onJoin(client as never);
    await room.__handlers.get("create")?.(client, {
      source: "text",
      prompt: "add a spring",
    });

    const removeHandler = room.__handlers.get("remove-object");

    expect(removeHandler).toBeTypeOf("function");

    removeHandler?.(client, {
      objectId: "object-1",
    });

    expect(room.state.objects).toEqual([]);
    expect(room.state.players["player-1"]).toEqual({
      id: "player-1",
      objectLimit: 10,
    });
    expect(room.__broadcasts.at(-1)).toEqual({
      type: "room-state",
      payload: room.state,
    });
  });

  it("broadcasts room state when an existing object is nudged", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    room.onJoin(client as never);
    await room.__handlers.get("create")?.(client, {
      source: "text",
      prompt: "add a spring",
    });

    const nudgeHandler = room.__handlers.get("nudge-object");

    expect(nudgeHandler).toBeTypeOf("function");

    nudgeHandler?.(client, {
      objectId: "object-1",
      delta: [1, 0, 0],
    });

    expect(room.state.objects[0]?.position).toEqual([1, 0, 0]);
    expect(room.__broadcasts.at(-1)).toEqual({
      type: "room-state",
      payload: room.state,
    });
  });

  it("broadcasts room state when an existing object is rotated", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    room.onJoin(client as never);
    await room.__handlers.get("create")?.(client, {
      source: "text",
      prompt: "add a spring",
    });

    const rotateHandler = room.__handlers.get("rotate-object");

    expect(rotateHandler).toBeTypeOf("function");

    rotateHandler?.(client, {
      objectId: "object-1",
      delta: [0, 45, 0],
    });

    expect(room.state.objects[0]?.rotation).toEqual([0, 45, 0]);
    expect(room.__broadcasts.at(-1)).toEqual({
      type: "room-state",
      payload: room.state,
    });
  });

  it("broadcasts room state when an existing object is scaled", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    room.onJoin(client as never);
    await room.__handlers.get("create")?.(client, {
      source: "text",
      prompt: "add a spring",
    });

    const scaleHandler = room.__handlers.get("scale-object");

    expect(scaleHandler).toBeTypeOf("function");

    scaleHandler?.(client, {
      objectId: "object-1",
      delta: [0.5, 0.25, 1],
    });

    expect(room.state.objects[0]?.scale).toEqual([1.5, 1.25, 2]);
    expect(room.__broadcasts.at(-1)).toEqual({
      type: "room-state",
      payload: room.state,
    });
  });

  it("falls back to mock planning and recovers planner health in live mode", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("planner service unavailable"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        source: "text",
                        prompt: "teacup sculpture",
                        objectKind: "cube",
                        scale: [1, 1, 1],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate({
      planner: createCreatePlanner(
        {
          mode: "live",
          model: "gemini-2.5-flash",
          vendor: "google",
        },
        {
          googleApiKey: "test-key",
        },
      ),
    } as never);

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    room.onJoin(client as never);

    await room.__handlers.get("create")?.(client, {
      source: "text",
      prompt: "teacup sculpture",
    });

    expect(room.state.objects[0]).toMatchObject({
      kind: "cube",
      scale: [1, 1, 1],
    });
    expect(room.__broadcasts.at(-2)).toEqual({
      type: "planner-status",
      payload: {
        activeMode: "mock",
        fallbackReason: "planner service unavailable",
        lastFailureAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        mode: "live",
        model: "gemini-2.5-flash",
        status: "degraded",
        vendor: "google",
      },
    });

    await room.__handlers.get("create")?.(client, {
      source: "text",
      prompt: "teacup sculpture",
    });

    expect(room.__broadcasts.at(-2)).toEqual({
      type: "planner-status",
      payload: {
        activeMode: "live",
        fallbackReason: null,
        lastFailureAt: null,
        mode: "live",
        model: "gemini-2.5-flash",
        status: "ready",
        vendor: "google",
      },
    });
  });

  it("sends a recoverable action error when scaling would produce a non-positive value", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    room.onJoin(client as never);
    await room.__handlers.get("create")?.(client, {
      source: "text",
      prompt: "add a spring",
    });

    room.__handlers.get("scale-object")?.(client, {
      objectId: "object-1",
      delta: [-2, 0, 0],
    });

    expect(room.__broadcasts).toHaveLength(3);
    expect(client.send).toHaveBeenCalledWith("action-error", {
      action: "scale-object",
      message: "invalid scale",
    });
  });

  it("sends recoverable queue-impulse errors with the queue-impulse action name", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    room.onJoin(client as never);

    room.__handlers.get("queue-impulse")?.(client, {
      objectId: "missing-object",
      impulse: [0, 1, 0],
    });

    expect(client.send).toHaveBeenCalledWith("action-error", {
      action: "queue-impulse",
      message: "invalid object",
    });
  });

  it("sends recoverable nudge-object errors with the nudge-object action name", async () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const client = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    room.onJoin(client as never);

    room.__handlers.get("nudge-object")?.(client, {
      objectId: "missing-object",
      delta: [1, 0, 0],
    });

    expect(client.send).toHaveBeenCalledWith("action-error", {
      action: "nudge-object",
      message: "invalid object",
    });
  });

  it("broadcasts updated room state to existing clients when another player joins", () => {
    const room = new PlaygroundRoom() as MockedPlaygroundRoom;
    room.roomId = "room-1";
    room.onCreate();

    const firstClient = {
      sessionId: "player-1",
      send: vi.fn(),
    };
    const secondClient = {
      sessionId: "player-2",
      send: vi.fn(),
    };

    room.onJoin(firstClient as never);
    room.onJoin(secondClient as never);

    expect(room.state.players).toEqual({
      "player-1": {
        id: "player-1",
        objectLimit: 10,
      },
      "player-2": {
        id: "player-2",
        objectLimit: 10,
      },
    });
    expect(room.__broadcasts.at(-1)).toEqual({
      type: "room-state",
      payload: room.state,
    });
    expect(secondClient.send).toHaveBeenCalledWith("room-state", room.state);
    expect(secondClient.send).toHaveBeenCalledWith("planner-status", {
      activeMode: "mock",
      fallbackReason: null,
      lastFailureAt: null,
      mode: "mock",
      model: "gemini-2.5-flash",
      status: "ready",
      vendor: "google",
    });
  });
});
