import { Room, type Client } from "colyseus";

import type { CreateInputEnvelope } from "../../../../packages/prompt-contracts/src/input-adapters";
import type { PlannerHealth } from "../../../../packages/prompt-contracts/src/planner-config";
import type { Vector3 } from "../../../../packages/physics-schema/src/world-object";
import { DEMO_ROOM_SLUG } from "../playground-service";
import { createAuthService, type AuthUser } from "../auth/auth-service";
import { createCreatePlanner, type CreatePlanner } from "../ai/create-planner";
import type { Logger } from "../logging/logger";
import type { createWorldRepository } from "../persistence/world-repository";
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
} from "../domain/room-state";

type WorldRepository = ReturnType<typeof createWorldRepository>;
type SeedRepository = Pick<WorldRepository, "getTemplate"> &
  Partial<Pick<WorldRepository, "getWorld">>;

const NOOP_LOGGER: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

const RECOVERABLE_CREATE_ERROR_MESSAGES = new Set([
  "create input must be an object",
  "prompt must be a non-empty string",
  "source must be text or image",
  "invalid player",
  "room object limit reached",
  "player object limit reached",
  "invalid object kind",
  "budget exceeded",
  "invalid impulse",
  "invalid nudge",
  "invalid rotation",
  "invalid scale",
  "invalid object",
  "forbidden object owner",
  "authentication required",
]);

export class PlaygroundRoom extends Room<ServerRoomState> {
  private static worldRepository: SeedRepository | null = null;
  private static authService: Pick<ReturnType<typeof createAuthService>, "resolveSession"> | null = null;
  private static logger: Logger = NOOP_LOGGER;

  private createPlanner: CreatePlanner = createCreatePlanner();
  private pendingTemplateId: string | null = null;
  private pendingWorldId: string | null = null;
  private clientUsers = new Map<string, AuthUser | null>();

  static configurePersistence(
    worldRepository: SeedRepository | null,
  ): void {
    PlaygroundRoom.worldRepository = worldRepository;
  }

  static configureAuth(
    authService: Pick<ReturnType<typeof createAuthService>, "resolveSession"> | null,
  ): void {
    PlaygroundRoom.authService = authService;
  }

  static configureLogger(logger: Logger | null): void {
    PlaygroundRoom.logger = logger ?? NOOP_LOGGER;
  }

  private applyState(nextState: ServerRoomState): void {
    Object.assign(this.state, nextState);
  }

  private isRecoverableActionError(error: unknown): error is Error {
    return (
      error instanceof Error &&
      RECOVERABLE_CREATE_ERROR_MESSAGES.has(error.message)
    );
  }

  private sendActionError(
    client: Client,
    action:
      | "create"
      | "queue-impulse"
      | "nudge-object"
      | "rotate-object"
      | "scale-object"
      | "remove-object"
      | "clear-room",
    error: Error,
  ): void {
    PlaygroundRoom.logger.warn("room.action_error", {
      action,
      reason: error.message,
      roomId: this.roomId,
      sessionId: client.sessionId,
      userId: this.clientUsers.get(client.sessionId)?.userId ?? null,
    });
    client.send("action-error", {
      action,
      message: error.message,
    });
  }

  private sendPlannerStatus(client: Client): void {
    client.send("planner-status", { ...this.createPlanner.health } satisfies PlannerHealth);
  }

  private getActorId(client: Client): string {
    if (!PlaygroundRoom.authService) {
      return client.sessionId;
    }

    const user = this.clientUsers.get(client.sessionId);

    if (!user) {
      throw new Error("authentication required");
    }

    return user.userId;
  }

  private broadcastPlannerStatus(): void {
    this.broadcast("planner-status", {
      ...this.createPlanner.health,
    } satisfies PlannerHealth);
  }

  override onCreate(options?: { planner?: CreatePlanner; templateId?: string; worldId?: string }): void {
    const roomId = this.roomId || crypto.randomUUID();
    this.createPlanner = options?.planner ?? createCreatePlanner();
    this.pendingTemplateId =
      typeof options?.templateId === "string" && options.templateId.length > 0
        ? options.templateId
        : null;
    this.pendingWorldId =
      typeof options?.worldId === "string" && options.worldId.length > 0
        ? options.worldId
        : null;

    this.setState(createServerRoomState(roomId));

    this.onMessage("sync-request", (client: Client) => {
      this.sendPlannerStatus(client);
      client.send("room-state", this.state);
    });

    this.onMessage("create", async (client: Client, payload: CreateInputEnvelope) => {
      try {
        const intent = await this.createPlanner.plan(payload);
        const nextState = applySpawnIntent(this.state, this.getActorId(client), intent);

        this.applyState(nextState);
        PlaygroundRoom.logger.info("room.object_created", {
          objectKind: intent.objectKind,
          prompt: payload.prompt,
          roomId: this.roomId,
          sessionId: client.sessionId,
          source: payload.source,
          userId: this.clientUsers.get(client.sessionId)?.userId ?? client.sessionId,
        });
        this.broadcastPlannerStatus();
        this.broadcast("room-state", this.state);
      } catch (error) {
        this.broadcastPlannerStatus();
        if (this.isRecoverableActionError(error)) {
          this.sendActionError(client, "create", error);
          return;
        }

        throw error;
      }
    });

    this.onMessage(
      "queue-impulse",
      (
        client: Client,
        payload: { objectId: string; impulse: [number, number, number] },
      ) => {
        try {
          const nextState = applyQueuedImpulse(
            this.state,
            this.getActorId(client),
            payload.objectId,
            payload.impulse,
          );

          this.applyState(nextState);
          this.broadcast("room-state", this.state);
        } catch (error) {
          if (this.isRecoverableActionError(error)) {
            this.sendActionError(client, "queue-impulse", error);
            return;
          }

          throw error;
        }
      },
    );

    this.onMessage(
      "nudge-object",
      (client: Client, payload: { objectId: string; delta: Vector3 }) => {
        try {
          const nextState = applyObjectNudge(
            this.state,
            this.getActorId(client),
            payload.objectId,
            payload.delta,
          );

          this.applyState(nextState);
          this.broadcast("room-state", this.state);
        } catch (error) {
          if (this.isRecoverableActionError(error)) {
            this.sendActionError(client, "nudge-object", error);
            return;
          }

          throw error;
        }
      },
    );

    this.onMessage(
      "rotate-object",
      (client: Client, payload: { objectId: string; delta: Vector3 }) => {
        try {
          const nextState = applyObjectRotation(
            this.state,
            this.getActorId(client),
            payload.objectId,
            payload.delta,
          );

          this.applyState(nextState);
          this.broadcast("room-state", this.state);
        } catch (error) {
          if (this.isRecoverableActionError(error)) {
            this.sendActionError(client, "rotate-object", error);
            return;
          }

          throw error;
        }
      },
    );

    this.onMessage(
      "scale-object",
      (client: Client, payload: { objectId: string; delta: Vector3 }) => {
        try {
          const nextState = applyObjectScale(
            this.state,
            this.getActorId(client),
            payload.objectId,
            payload.delta,
          );

          this.applyState(nextState);
          this.broadcast("room-state", this.state);
        } catch (error) {
          if (this.isRecoverableActionError(error)) {
            this.sendActionError(client, "scale-object", error);
            return;
          }

          throw error;
        }
      },
    );

    this.onMessage(
      "remove-object",
      (client: Client, payload: { objectId: string }) => {
        try {
          const nextState = applyObjectRemoval(
            this.state,
            this.getActorId(client),
            payload.objectId,
          );

          this.applyState(nextState);
          this.broadcast("room-state", this.state);
        } catch (error) {
          if (this.isRecoverableActionError(error)) {
            this.sendActionError(client, "remove-object", error);
            return;
          }

          throw error;
        }
      },
    );

    this.onMessage("clear-room", (client: Client) => {
      try {
        const nextState = clearRoom(this.state, this.getActorId(client));

        this.applyState(nextState);
        this.broadcast("room-state", this.state);
      } catch (error) {
        if (this.isRecoverableActionError(error)) {
          this.sendActionError(client, "clear-room", error);
          return;
        }

        throw error;
      }
    });
  }

  override onJoin(client: Client, options?: { authToken?: string }): void {
    if (!PlaygroundRoom.authService) {
      if (
        this.pendingWorldId &&
        this.state.objects.length === 0 &&
        Object.keys(this.state.players).length === 0
      ) {
        const world = PlaygroundRoom.worldRepository?.getWorld?.(this.pendingWorldId);

        if (world) {
          this.applyState(
            createServerRoomStateFromTemplate(this.state.id, world.stateJson, client.sessionId),
          );
        }
      }

      if (
        this.pendingTemplateId &&
        this.state.objects.length === 0 &&
        Object.keys(this.state.players).length === 0
      ) {
        const template = PlaygroundRoom.worldRepository?.getTemplate(this.pendingTemplateId);

        if (template) {
          this.applyState(
            createServerRoomStateFromTemplate(this.state.id, template.stateJson, client.sessionId),
          );
        }
      }

      const nextState = addPlayer(this.state, client.sessionId);
      this.applyState(nextState);
      PlaygroundRoom.logger.info("room.client_joined", {
        roomId: this.roomId,
        sessionId: client.sessionId,
        userId: client.sessionId,
        writable: true,
      });
      this.broadcast("room-state", this.state);
      this.sendPlannerStatus(client);
      client.send("room-state", this.state);
      return;
    }

    const user = PlaygroundRoom.authService?.resolveSession(options?.authToken ?? null) ?? null;
    this.clientUsers.set(client.sessionId, user);

    if (
      this.pendingWorldId &&
      this.state.objects.length === 0 &&
      Object.keys(this.state.players).length === 0 &&
      user
    ) {
      const world = PlaygroundRoom.worldRepository?.getWorld?.(this.pendingWorldId);

      if (world) {
        this.applyState(
          createServerRoomStateFromTemplate(this.state.id, world.stateJson, user.userId),
        );
      }
    }

    if (
      this.pendingTemplateId &&
      this.state.objects.length === 0 &&
      Object.keys(this.state.players).length === 0 &&
      user
    ) {
      const template = PlaygroundRoom.worldRepository?.getTemplate(this.pendingTemplateId);

      if (template) {
        this.applyState(
          createServerRoomStateFromTemplate(this.state.id, template.stateJson, user.userId),
        );
      }
    }

    if (user) {
      const nextState = addPlayer(this.state, user.userId, {
        objectLimit: user.access.maxObjectsPerStage,
      });

      this.applyState(nextState);
      PlaygroundRoom.logger.info("room.client_joined", {
        roomId: this.roomId,
        sessionId: client.sessionId,
        userId: user.userId,
        writable: true,
      });
      this.broadcast("room-state", this.state);
    } else if (this.state.id !== DEMO_ROOM_SLUG) {
      PlaygroundRoom.logger.info("room.client_joined", {
        roomId: this.roomId,
        sessionId: client.sessionId,
        userId: null,
        writable: false,
      });
      client.send("action-error", {
        action: "create",
        message: "authentication required",
      });
    }

    this.sendPlannerStatus(client);
    client.send("room-state", this.state);
  }
}
