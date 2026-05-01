import { describe, expect, test, vi } from "vitest";

import { createPlaygroundService } from "./playground-service";

describe("playground service", () => {
  test("joins a player and creates an object through the planner-backed room rules", async () => {
    const planner = {
      metadata: {
        mode: "mock" as const,
        model: "gemini-2.5-flash",
        vendor: "google" as const,
      },
      plan: vi.fn().mockResolvedValue({
        source: "text" as const,
        prompt: "make it surprising",
        objectKind: "wheel" as const,
        scale: [1, 1, 1] as [number, number, number],
      }),
    };
    const service = createPlaygroundService({ planner });

    const joined = service.join("shared-stage", "player-1");
    expect(joined.players["player-1"]).toEqual({
      id: "player-1",
      objectLimit: 10,
    });

    const created = await service.create("shared-stage", "player-1", {
      source: "text",
      prompt: "make it surprising",
    });

    expect(planner.plan).toHaveBeenCalledWith({
      source: "text",
      prompt: "make it surprising",
    });
    expect(created.objects).toEqual([
      {
        displayName: "make it surprising",
        id: "object-1",
        kind: "wheel",
        ownerId: "player-1",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    ]);
    expect(created.players["player-1"]).toEqual({
      id: "player-1",
      objectLimit: 10,
    });
  });

  test("keeps different room slugs isolated", async () => {
    const service = createPlaygroundService();

    service.join("alpha-room", "player-1");
    service.join("beta-room", "player-2");
    await service.create("alpha-room", "player-1", {
      source: "text",
      prompt: "add a ball",
    });

    expect(service.getState("alpha-room").objects).toEqual([
      {
        displayName: "add a ball",
        id: "object-1",
        kind: "ball",
        ownerId: "player-1",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    ]);
    expect(service.getState("beta-room").objects).toEqual([]);
  });

  test("maps a Chinese basketball prompt to a spherical ball object", async () => {
    const service = createPlaygroundService();

    service.join("shared-stage", "player-1");
    const created = await service.create("shared-stage", "player-1", {
      source: "text",
      prompt: "放一个篮球",
    });

    expect(created.objects[0]).toEqual({
      displayName: "放一个篮球",
      id: "object-1",
      kind: "ball",
      ownerId: "player-1",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
  });

  test("applies a queued impulse within the room state", async () => {
    const service = createPlaygroundService();

    service.join("shared-stage", "player-1");
    await service.create("shared-stage", "player-1", {
      source: "text",
      prompt: "add a spring",
    });

    const nextState = service.queueImpulse("shared-stage", "player-1", "object-1", [0, 5, 0]);

    expect(nextState.objects).toEqual([
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
  });

  test("removes an object without changing the stage object limit", async () => {
    const service = createPlaygroundService();

    service.join("shared-stage", "player-1");
    await service.create("shared-stage", "player-1", {
      source: "text",
      prompt: "add a spring",
    });

    const nextState = service.removeObject("shared-stage", "player-1", "object-1");

    expect(nextState.objects).toEqual([]);
    expect(nextState.players["player-1"]).toEqual({
      id: "player-1",
      objectLimit: 10,
    });
  });

  test("nudges an object and persists the new shared position", async () => {
    const service = createPlaygroundService();

    service.join("shared-stage", "player-1");
    await service.create("shared-stage", "player-1", {
      source: "text",
      prompt: "add a spring",
    });

    const nextState = service.nudgeObject("shared-stage", "player-1", "object-1", [1, 0, 0]);

    expect(nextState.objects[0]?.position).toEqual([1, 0, 0]);
  });

  test("rotates an object and persists the shared rotation", async () => {
    const service = createPlaygroundService();

    service.join("shared-stage", "player-1");
    await service.create("shared-stage", "player-1", {
      source: "text",
      prompt: "add a spring",
    });

    const nextState = service.rotateObject("shared-stage", "player-1", "object-1", [0, 45, 0]);

    expect(nextState.objects[0]?.rotation).toEqual([0, 45, 0]);
  });

  test("scales an object and persists the shared scale", async () => {
    const service = createPlaygroundService();

    service.join("shared-stage", "player-1");
    await service.create("shared-stage", "player-1", {
      source: "text",
      prompt: "add a spring",
    });

    const nextState = service.scaleObject("shared-stage", "player-1", "object-1", [0.5, 0.25, 1]);

    expect(nextState.objects[0]?.scale).toEqual([1.5, 1.25, 2]);
  });

  test("seeds a room from a saved template when joining with a template id", () => {
    const service = createPlaygroundService({
      worldRepository: {
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
      },
    });

    const joined = service.join("template-room", "player-1", "template-1");

    expect(joined.players["player-1"]).toEqual({
      id: "player-1",
      objectLimit: 10,
    });
    expect(joined.roomObjectLimit).toBe(10);
    expect(joined.objects).toEqual([
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

  test("seeds a room from a saved world when joining with a world id", () => {
    const service = createPlaygroundService({
      worldRepository: {
        getTemplate() {
          return null;
        },
        getWorld(worldId: string) {
          return worldId === "world-1"
            ? {
                worldId,
                roomId: "saved-room",
                title: "Saved World",
                stateJson: JSON.stringify({
                  roomObjectLimit: 18,
                  objects: [
                    {
                      id: "object-9",
                      kind: "wheel",
                      ownerId: "old-owner",
                      position: [3, 0, 0],
                      rotation: [0, 45, 0],
                      scale: [2, 2, 2],
                    },
                  ],
                }),
              }
            : null;
        },
      },
    });

    const joined = service.join("world-room", "player-1", null, null, "world-1");

    expect(joined.players["player-1"]).toEqual({
      id: "player-1",
      objectLimit: 10,
    });
    expect(joined.roomObjectLimit).toBe(10);
    expect(joined.objects).toEqual([
      {
        id: "object-9",
        kind: "wheel",
        ownerId: "player-1",
        position: [3, 0, 0],
        rotation: [0, 45, 0],
        scale: [2, 2, 2],
      },
    ]);
  });

  test("clears a stage without changing object limits", async () => {
    const service = createPlaygroundService();

    service.join("shared-stage", "player-1");
    service.join("shared-stage", "player-2");
    await service.create("shared-stage", "player-1", {
      source: "text",
      prompt: "add a spring",
    });

    const cleared = service.clearRoom("shared-stage", "player-1");

    expect(cleared.objects).toEqual([]);
    expect(cleared.players["player-1"]?.objectLimit).toBe(10);
    expect(cleared.players["player-2"]?.objectLimit).toBe(10);
  });
});
