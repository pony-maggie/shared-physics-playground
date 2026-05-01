import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createCreatePlanner } from "./ai/create-planner";
import { createPlaygroundHttpHandlers } from "./index";
import { createWorldRepository } from "./persistence/world-repository";
import { createPlaygroundService } from "./playground-service";

type CapturedResponse = {
  statusCode?: number;
  body?: unknown;
};

function createMockResponse() {
  const captured: CapturedResponse = {};

  return {
    captured,
    response: {
      status(code: number) {
        captured.statusCode = code;
        return this;
      },
      json(body: unknown) {
        captured.body = body;
      },
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("server HTTP routes", () => {
  it("creates the realtime server when education model planning is configured", () => {
    expect(() =>
      execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "--eval",
          'import { createRealtimeServer } from "./src/index.ts"; const realtimeServer = createRealtimeServer(0); realtimeServer.server.close();',
        ],
        {
          cwd: join(process.cwd(), "apps/server"),
          env: {
            ...process.env,
            GOOGLE_API_KEY: "key-1",
          },
          stdio: "pipe",
        },
      ),
    ).not.toThrow();
  });

  it("serves a fixed no-cost demo to anonymous education requests", () => {
    const service = createPlaygroundService();
    const authService = {
      resolveSession: () => null,
    };
    const handlers = createPlaygroundHttpHandlers(service, authService);
    const planned = createMockResponse();

    handlers.planSimulation(
      {
        body: {
          question: "为什么斜坡越陡，小球滚得越快？",
        },
      },
      planned.response,
    );

    expect(planned.captured.statusCode).toBe(200);
    expect(planned.captured.body).toEqual(
      expect.objectContaining({
        entitlement: expect.objectContaining({
          canGenerate: false,
          tier: "guest",
        }),
        plan: expect.objectContaining({
          concept: "inclined_plane",
        }),
        source: "demo",
      }),
    );
  });

  it("allows one lifetime AI education generation for free users", () => {
    const repository = createWorldRepository(":memory:");
    const service = createPlaygroundService();
    const authService = {
      resolveSession: () => ({
        userId: "user-free",
        email: "free@example.com",
        access: {
          tier: "free",
          defaultStageSlug: "my-stage",
          maxStages: 1,
          maxObjectsPerStage: 5,
          canCreateStages: false,
          defaultRoomSlug: "my-stage",
          maxOwnedObjects: 5,
          canCreateNamedRooms: false,
        },
      }),
    };
    const handlers = createPlaygroundHttpHandlers(service, authService, undefined, {
      usageRepository: repository,
    });

    const first = createMockResponse();
    handlers.planSimulation(
      {
        body: {
          question: "Why does a ball roll faster on a steeper slope?",
        },
      },
      first.response,
    );

    expect(first.captured.statusCode).toBe(200);
    expect(first.captured.body).toEqual(
      expect.objectContaining({
        entitlement: expect.objectContaining({
          remainingTextGenerations: 0,
          tier: "free",
        }),
        source: "ai",
      }),
    );

    const second = createMockResponse();
    handlers.planSimulation(
      {
        body: {
          question: "Why does a ball roll faster on a steeper slope?",
        },
      },
      second.response,
    );

    expect(second.captured.statusCode).toBe(403);
    expect(second.captured.body).toEqual(
      expect.objectContaining({
        error: "free plan includes one AI experiment generation",
      }),
    );
  });

  it("uses a schema-valid education model plan for authenticated generation", async () => {
    const repository = createWorldRepository(":memory:");
    const service = createPlaygroundService();
    const educationModelPlanner = {
      plan: vi.fn().mockResolvedValue({
        concept: "refraction",
        title: "Model selected refraction",
        objective: "Tune incident angle and refractive index.",
        variables: {
          incidentAngleDeg: 30,
          refractiveIndex1: 1,
          refractiveIndex2: 1.5,
        },
        guidingQuestions: [
          "Why does the ray bend?",
          "What changes when glass has a higher index?",
        ],
      }),
    };
    const authService = {
      resolveSession: () => ({
        userId: "user-pro",
        email: "pro@example.com",
        access: {
          tier: "pro",
          defaultStageSlug: "my-stage",
          maxStages: 50,
          maxObjectsPerStage: 10,
          canCreateStages: true,
          defaultRoomSlug: "my-stage",
          maxOwnedObjects: 10,
          canCreateNamedRooms: true,
        },
      }),
    };
    const handlers = createPlaygroundHttpHandlers(service, authService, undefined, {
      educationModelPlanner,
      usageRepository: repository,
    });
    const planned = createMockResponse();

    await handlers.planSimulation(
      {
        body: {
          question: "Why does light bend in glass?",
        },
      },
      planned.response,
    );

    expect(planned.captured.statusCode).toBe(200);
    expect(educationModelPlanner.plan).toHaveBeenCalledWith("Why does light bend in glass?");
    expect(planned.captured.body).toEqual(
      expect.objectContaining({
        plan: expect.objectContaining({
          concept: "refraction",
          title: "Model selected refraction",
        }),
        source: "ai",
      }),
    );
  });

  it("falls back to deterministic education routing when the model planner fails", async () => {
    const repository = createWorldRepository(":memory:");
    const service = createPlaygroundService();
    const educationModelPlanner = {
      plan: vi.fn().mockRejectedValue(new Error("invalid model plan")),
    };
    const authService = {
      resolveSession: () => ({
        userId: "user-pro",
        email: "pro@example.com",
        access: {
          tier: "pro",
          defaultStageSlug: "my-stage",
          maxStages: 50,
          maxObjectsPerStage: 10,
          canCreateStages: true,
          defaultRoomSlug: "my-stage",
          maxOwnedObjects: 10,
          canCreateNamedRooms: true,
        },
      }),
    };
    const handlers = createPlaygroundHttpHandlers(service, authService, undefined, {
      educationModelPlanner,
      usageRepository: repository,
    });
    const planned = createMockResponse();

    await handlers.planSimulation(
      {
        body: {
          question: "How fast does a capacitor charge in an RC circuit?",
        },
      },
      planned.response,
    );

    expect(planned.captured.statusCode).toBe(200);
    expect(planned.captured.body).toEqual(
      expect.objectContaining({
        plan: expect.objectContaining({
          concept: "rc_circuit",
        }),
        source: "ai",
      }),
    );
  });

  it("returns suggestions for unmatched authenticated prompts without consuming free usage", () => {
    const repository = createWorldRepository(":memory:");
    const service = createPlaygroundService();
    const authService = {
      resolveSession: () => ({
        userId: "user-free",
        email: "free@example.com",
        access: {
          tier: "free",
          defaultStageSlug: "my-stage",
          maxStages: 1,
          maxObjectsPerStage: 5,
          canCreateStages: false,
          defaultRoomSlug: "my-stage",
          maxOwnedObjects: 5,
          canCreateNamedRooms: false,
        },
      }),
    };
    const handlers = createPlaygroundHttpHandlers(service, authService, undefined, {
      usageRepository: repository,
    });

    const suggestions = createMockResponse();
    handlers.planSimulation(
      {
        body: {
          question: "teach me physics",
        },
      },
      suggestions.response,
    );

    expect(suggestions.captured.statusCode).toBe(200);
    expect(suggestions.captured.body).toEqual(
      expect.objectContaining({
        entitlement: expect.objectContaining({
          remainingTextGenerations: 1,
          tier: "free",
        }),
        source: "ai",
        suggestions: expect.arrayContaining([
          expect.objectContaining({ concept: "inclined_plane" }),
          expect.objectContaining({ concept: "projectile_motion" }),
          expect.objectContaining({ concept: "work_energy" }),
        ]),
      }),
    );
    expect(
      repository.countUsage({
        userId: "user-free",
        featureKey: "education.text.free.lifetime",
      }),
    ).toBe(0);

    const selected = createMockResponse();
    handlers.planSimulation(
      {
        body: {
          question: "teach me physics",
          selectedConcept: "work_energy",
        },
      },
      selected.response,
    );

    expect(selected.captured.statusCode).toBe(200);
    expect(selected.captured.body).toEqual(
      expect.objectContaining({
        entitlement: expect.objectContaining({
          remainingTextGenerations: 0,
          tier: "free",
        }),
        plan: expect.objectContaining({
          concept: "work_energy",
        }),
      }),
    );
  });

  it("enforces the Pro daily text generation quota", () => {
    const repository = createWorldRepository(":memory:");
    const service = createPlaygroundService();
    const authService = {
      resolveSession: () => ({
        userId: "user-pro",
        email: "pro@example.com",
        access: {
          tier: "pro",
          defaultStageSlug: "my-stage",
          maxStages: 50,
          maxObjectsPerStage: 10,
          canCreateStages: true,
          defaultRoomSlug: "my-stage",
          maxOwnedObjects: 10,
          canCreateNamedRooms: true,
        },
      }),
    };
    const handlers = createPlaygroundHttpHandlers(service, authService, undefined, {
      usageRepository: repository,
      now: () => new Date("2026-05-01T08:00:00.000Z"),
    });

    for (let index = 0; index < 30; index += 1) {
      const planned = createMockResponse();
      handlers.planSimulation(
        {
          body: {
            question: `Why does slope question ${index} matter?`,
          },
        },
        planned.response,
      );
      expect(planned.captured.statusCode).toBe(200);
    }

    const overLimit = createMockResponse();
    handlers.planSimulation(
      {
        body: {
          question: "Why does one more slope question matter?",
        },
      },
      overLimit.response,
    );

    expect(overLimit.captured.statusCode).toBe(403);
    expect(overLimit.captured.body).toEqual(
      expect.objectContaining({
        error: "daily Pro text generation quota reached",
      }),
    );
  });

  it("allows only Pro users to save educational simulations", async () => {
    const repository = createWorldRepository(":memory:");
    const service = createPlaygroundService();
    const proAuthService = {
      resolveSession: () => ({
        userId: "user-pro",
        email: "pro@example.com",
        access: {
          tier: "pro",
          defaultStageSlug: "my-stage",
          maxStages: 50,
          maxObjectsPerStage: 10,
          canCreateStages: true,
          defaultRoomSlug: "my-stage",
          maxOwnedObjects: 10,
          canCreateNamedRooms: true,
        },
      }),
    };
    const handlers = createPlaygroundHttpHandlers(service, proAuthService, undefined, {
      usageRepository: repository,
    });
    const saved = createMockResponse();

    await handlers.saveSimulation(
      {
        body: {
          title: "Inclined plane and friction",
          simulationJson: JSON.stringify({ plan: { concept: "inclined_plane" } }),
        },
      },
      saved.response,
    );

    expect(saved.captured.statusCode).toBe(201);
    expect(saved.captured.body).toEqual(
      expect.objectContaining({
        simulationId: "simulation-1",
        userId: "user-pro",
      }),
    );

    const freeHandlers = createPlaygroundHttpHandlers(service, {
      resolveSession: () => ({
        userId: "user-free",
        email: "free@example.com",
        access: {
          tier: "free",
          defaultStageSlug: "my-stage",
          maxStages: 1,
          maxObjectsPerStage: 5,
          canCreateStages: false,
          defaultRoomSlug: "my-stage",
          maxOwnedObjects: 5,
          canCreateNamedRooms: false,
        },
      }),
    }, undefined, {
      usageRepository: repository,
    });
    const denied = createMockResponse();

    await freeHandlers.saveSimulation(
      {
        body: {
          title: "Inclined plane and friction",
          simulationJson: JSON.stringify({ plan: { concept: "inclined_plane" } }),
        },
      },
      denied.response,
    );

    expect(denied.captured.statusCode).toBe(403);
    expect(denied.captured.body).toEqual({
      error: "saving experiments requires Pro",
    });
  });

  it("records Pro purchase interest and emails the operator", async () => {
    const service = createPlaygroundService();
    const sentInterests: Array<Record<string, unknown>> = [];
    const authService = {
      resolveSession: (token: string | null) =>
        token === "token-free"
          ? {
              userId: "user-free",
              email: "free@example.com",
              access: {
                tier: "free" as const,
                defaultStageSlug: "my-stage",
                maxStages: 1,
                maxObjectsPerStage: 5,
                canCreateStages: false,
                defaultRoomSlug: "my-stage",
                maxOwnedObjects: 5,
                canCreateNamedRooms: false,
              },
            }
          : null,
    };
    const handlers = createPlaygroundHttpHandlers(service, authService, undefined, {
      now: () => new Date("2026-05-01T08:00:00.000Z"),
      proInterestEmail: async (input) => {
        sentInterests.push(input);
      },
    });
    const response = createMockResponse();

    await handlers.proInterest(
      {
        body: {
          source: "pricing",
        },
        headers: {
          authorization: "Bearer token-free",
        },
      },
      response.response,
    );

    expect(response.captured.statusCode).toBe(202);
    expect(response.captured.body).toEqual({ ok: true });
    expect(sentInterests).toEqual([
      {
        currentTier: "free",
        ipAddress: "127.0.0.1",
        occurredAt: "2026-05-01T08:00:00.000Z",
        operatorEmail: "machengyu519@gmail.com",
        source: "pricing",
        userEmail: "free@example.com",
        userId: "user-free",
      },
    ]);
  });

  it("requires authentication and sends Pro purchase interest email only once per user", async () => {
    const service = createPlaygroundService();
    const repository = createWorldRepository(":memory:");
    const sentInterests: Array<Record<string, unknown>> = [];
    const authService = {
      resolveSession: (token: string | null) =>
        token === "token-free"
          ? {
              userId: "user-free",
              email: "free@example.com",
              access: {
                tier: "free" as const,
                defaultStageSlug: "my-stage",
                maxStages: 1,
                maxObjectsPerStage: 5,
                canCreateStages: false,
                defaultRoomSlug: "my-stage",
                maxOwnedObjects: 5,
                canCreateNamedRooms: false,
              },
            }
          : null,
    };
    const handlers = createPlaygroundHttpHandlers(service, authService, undefined, {
      now: () => new Date("2026-05-01T08:00:00.000Z"),
      proInterestEmail: async (input) => {
        sentInterests.push(input);
      },
      usageRepository: repository,
    });
    const unauthenticated = createMockResponse();

    await handlers.proInterest(
      {
        body: {
          source: "pricing",
        },
      },
      unauthenticated.response,
    );

    expect(unauthenticated.captured.statusCode).toBe(401);
    expect(sentInterests).toEqual([]);

    const first = createMockResponse();
    await handlers.proInterest(
      {
        body: {
          source: "pricing",
        },
        headers: {
          authorization: "Bearer token-free",
          "x-forwarded-for": "203.0.113.12, 10.0.0.1",
        },
      },
      first.response,
    );

    const second = createMockResponse();
    await handlers.proInterest(
      {
        body: {
          source: "pricing",
        },
        headers: {
          authorization: "Bearer token-free",
        },
      },
      second.response,
    );

    expect(first.captured.statusCode).toBe(202);
    expect(second.captured.statusCode).toBe(202);
    expect(sentInterests).toHaveLength(1);
    expect(sentInterests[0]).toEqual(
      expect.objectContaining({
        ipAddress: "203.0.113.12",
        userEmail: "free@example.com",
        userId: "user-free",
      }),
    );
  });

  it("rotates and scales an object through the fallback HTTP handlers", async () => {
    const service = createPlaygroundService();
    const handlers = createPlaygroundHttpHandlers(service);

    const join = createMockResponse();
    handlers.join(
      {
        body: {
          roomSlug: "rotation-room",
          playerId: "player-1",
        },
      },
      join.response,
    );

    expect(join.captured.statusCode).toBe(200);
    expect(join.captured.body).toEqual(
      expect.objectContaining({
        plannerStatus: expect.objectContaining({
          activeMode: "mock",
          fallbackReason: null,
          lastFailureAt: null,
          mode: "mock",
          model: "gemini-2.5-flash",
          status: "ready",
          vendor: "google",
        }),
      }),
    );

    const create = createMockResponse();
    await handlers.create(
      {
        body: {
          roomSlug: "rotation-room",
          playerId: "player-1",
          payload: {
            source: "text",
            prompt: "add a spring",
          },
        },
      },
      create.response,
    );

    expect(create.captured.statusCode).toBe(200);
    expect(create.captured.body).toEqual(
      expect.objectContaining({
        plannerStatus: expect.objectContaining({
          activeMode: "mock",
          fallbackReason: null,
          lastFailureAt: null,
          mode: "mock",
          model: "gemini-2.5-flash",
          status: "ready",
          vendor: "google",
        }),
      }),
    );

    const rotate = createMockResponse();
    handlers.rotate(
      {
        body: {
          roomSlug: "rotation-room",
          playerId: "player-1",
          objectId: "object-1",
          delta: [0, 45, 0],
        },
      },
      rotate.response,
    );

    expect(rotate.captured.statusCode).toBe(200);
    expect((rotate.captured.body as { roomState: { objects: Array<{ rotation: [number, number, number] }> } }).roomState.objects[0]?.rotation).toEqual([0, 45, 0]);

    const scale = createMockResponse();
    handlers.scale(
      {
        body: {
          roomSlug: "rotation-room",
          playerId: "player-1",
          objectId: "object-1",
          delta: [0.5, 0.25, 1],
        },
      },
      scale.response,
    );

    expect(scale.captured.statusCode).toBe(200);
    expect((scale.captured.body as { roomState: { objects: Array<{ scale: [number, number, number] }> } }).roomState.objects[0]?.scale).toEqual([1.5, 1.25, 2]);
  });

  it("joins a fallback HTTP room seeded from a saved world id", () => {
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
                  objects: [
                    {
                      id: "object-4",
                      kind: "ball",
                      ownerId: "old-owner",
                      position: [1, 0, 0],
                    },
                  ],
                }),
              }
            : null;
        },
      },
    });
    const handlers = createPlaygroundHttpHandlers(service);
    const join = createMockResponse();

    handlers.join(
      {
        body: {
          roomSlug: "world-copy",
          playerId: "player-1",
          worldId: "world-1",
        },
      },
      join.response,
    );

    expect(join.captured.statusCode).toBe(200);
    expect(join.captured.body).toEqual(
      expect.objectContaining({
        roomState: expect.objectContaining({
          objects: [
            expect.objectContaining({
              id: "object-4",
              kind: "ball",
              ownerId: "player-1",
              position: [1, 0, 0],
            }),
          ],
        }),
      }),
    );
  });

  it("rejects invalid scaling through the fallback HTTP handler", async () => {
    const service = createPlaygroundService();
    const handlers = createPlaygroundHttpHandlers(service);

    handlers.join(
      {
        body: {
          roomSlug: "invalid-scale-room",
          playerId: "player-1",
        },
      },
      createMockResponse().response,
    );

    await handlers.create(
      {
        body: {
          roomSlug: "invalid-scale-room",
          playerId: "player-1",
          payload: {
            source: "text",
            prompt: "add a spring",
          },
        },
      },
      createMockResponse().response,
    );

    const scale = createMockResponse();
    handlers.scale(
      {
        body: {
          roomSlug: "invalid-scale-room",
          playerId: "player-1",
          objectId: "object-1",
          delta: [-2, 0, 0],
        },
      },
      scale.response,
    );

    expect(scale.captured.statusCode).toBe(400);
    expect(scale.captured.body).toEqual({
      error: "invalid scale",
    });
  });

  it("keeps create, impulse, and delete handlers intact", async () => {
    const service = createPlaygroundService();
    const handlers = createPlaygroundHttpHandlers(service);

    handlers.join(
      {
        body: {
          roomSlug: "existing-flow-room",
          playerId: "player-1",
        },
      },
      createMockResponse().response,
    );

    await handlers.create(
      {
        body: {
          roomSlug: "existing-flow-room",
          playerId: "player-1",
          payload: {
            source: "text",
            prompt: "add a spring",
          },
        },
      },
      createMockResponse().response,
    );

    const impulse = createMockResponse();
    handlers.impulse(
      {
        body: {
          roomSlug: "existing-flow-room",
          playerId: "player-1",
          objectId: "object-1",
          impulse: [0, 5, 0],
        },
      },
      impulse.response,
    );
    expect(impulse.captured.statusCode).toBe(200);

    const remove = createMockResponse();
    handlers.delete(
      {
        body: {
          roomSlug: "existing-flow-room",
          playerId: "player-1",
          objectId: "object-1",
        },
      },
      remove.response,
    );
    expect(remove.captured.statusCode).toBe(200);
    expect(service.getState("existing-flow-room").objects).toEqual([]);
  });

  it("clears a room through the fallback HTTP handler", async () => {
    const service = createPlaygroundService();
    const handlers = createPlaygroundHttpHandlers(service);

    handlers.join(
      {
        body: {
          roomSlug: "clear-room",
          playerId: "player-1",
        },
      },
      createMockResponse().response,
    );

    await handlers.create(
      {
        body: {
          roomSlug: "clear-room",
          playerId: "player-1",
          payload: {
            source: "text",
            prompt: "add a spring",
          },
        },
      },
      createMockResponse().response,
    );

    const cleared = createMockResponse();
    handlers.clear(
      {
        body: {
          roomSlug: "clear-room",
          playerId: "player-1",
        },
      },
      cleared.response,
    );

    expect(cleared.captured.statusCode).toBe(200);
    expect(cleared.captured.body).toEqual({
      roomState: expect.objectContaining({
        objects: [],
        players: {
          "player-1": {
            id: "player-1",
            objectLimit: 10,
          },
        },
      }),
    });
  });

  it("returns degraded planner health from create when live planning falls back to mock and recovers later", async () => {
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
                        prompt: "add a spring",
                        objectKind: "spring",
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

    const service = createPlaygroundService({
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
    });
    const handlers = createPlaygroundHttpHandlers(service);

    handlers.join(
      {
        body: {
          roomSlug: "live-health-room",
          playerId: "player-1",
        },
      },
      createMockResponse().response,
    );

    const degradedCreate = createMockResponse();
    await handlers.create(
      {
        body: {
          roomSlug: "live-health-room",
          playerId: "player-1",
          payload: {
            source: "text",
            prompt: "teacup sculpture",
          },
        },
      },
      degradedCreate.response,
    );

    expect(degradedCreate.captured.statusCode).toBe(200);
    expect(degradedCreate.captured.body).toEqual(
      expect.objectContaining({
        plannerStatus: expect.objectContaining({
          activeMode: "mock",
          fallbackReason: "planner service unavailable",
          mode: "live",
          model: "gemini-2.5-flash",
          status: "degraded",
          vendor: "google",
        }),
      }),
    );

    const recoveredCreate = createMockResponse();
    await handlers.create(
      {
        body: {
          roomSlug: "live-health-room",
          playerId: "player-1",
          payload: {
            source: "text",
            prompt: "teacup sculpture",
          },
        },
      },
      recoveredCreate.response,
    );

    expect(recoveredCreate.captured.statusCode).toBe(200);
    expect(recoveredCreate.captured.body).toEqual(
      expect.objectContaining({
        plannerStatus: expect.objectContaining({
          activeMode: "live",
          fallbackReason: null,
          lastFailureAt: null,
          mode: "live",
          model: "gemini-2.5-flash",
          status: "ready",
          vendor: "google",
        }),
      }),
    );
  });

  it("saves a reusable template and can seed a room from that template on join", async () => {
    const repository = createWorldRepository(":memory:");
    const service = createPlaygroundService({ worldRepository: repository });
    const handlers = createPlaygroundHttpHandlers(service);

    const saveTemplate = createMockResponse();
    await handlers.saveTemplate(
      {
        body: {
          roomId: "template-source-room",
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
        },
      },
      saveTemplate.response,
    );

    expect(saveTemplate.captured.statusCode).toBe(201);
    expect(saveTemplate.captured.body).toEqual(
      expect.objectContaining({
        templateId: "template-1",
      }),
    );

    const join = createMockResponse();
    handlers.join(
      {
        body: {
          roomSlug: "reopened-template-room",
          playerId: "player-1",
          templateId: "template-1",
        },
      },
      join.response,
    );

    expect(join.captured.statusCode).toBe(200);
    expect(join.captured.body).toEqual(
      expect.objectContaining({
        roomState: expect.objectContaining({
          roomObjectLimit: 10,
          players: {
            "player-1": {
              id: "player-1",
              objectLimit: 10,
            },
          },
          objects: [
            {
              id: "object-7",
              kind: "spring",
              ownerId: "player-1",
              position: [1, 2, 3],
              rotation: [0, 0, 15],
              scale: [1.5, 1.5, 1.5],
            },
          ],
        }),
      }),
    );
  });
});
