import http from "node:http";

import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server } from "colyseus";
import express from "express";

import { DEFAULT_RUNTIME_ACCESS_CONFIG } from "../../../packages/shared/src/access-policy";
import { createAuthService, type AuthUser } from "./auth/auth-service";
import { parseObservabilityConfig } from "./config/observability-config";
import { createMailer, type ProInterestEmailInput } from "./email/mailer";
import { isSmtpConfigured } from "./email/smtp-config";
import {
  createEducationModelPlanner,
  type EducationModelPlanner,
} from "./education/model-planner";
import { planSimulation as planEducationalSimulation } from "./education/simulation-planner";
import { createLogger, type Logger } from "./logging/logger";
import { createPlaygroundService } from "./playground-service";
import { createWorldRepository } from "./persistence/world-repository";
import { PlaygroundRoom } from "./rooms/PlaygroundRoom";
import { DEMO_ROOM_SLUG } from "./playground-service";

const DEFAULT_PORT = 2567;
const DEFAULT_STAGE_SLUG = "my-stage";
const DEFAULT_PRO_INTEREST_OPERATOR_EMAIL = "machengyu519@gmail.com";

type JsonRequest = {
  body?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
};

type JsonResponse = {
  status: (code: number) => JsonResponse;
  json: (body: unknown) => void;
};

const NOOP_LOGGER: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

const FREE_LIFETIME_TEXT_GENERATION_LIMIT = 1;
const PRO_DAILY_TEXT_GENERATION_LIMIT = 30;
const PRO_DAILY_IMAGE_GENERATION_LIMIT = 10;
const EDUCATION_FREE_TEXT_FEATURE = "education.text.free.lifetime";
const EDUCATION_PRO_TEXT_FEATURE = "education.text.pro.daily";
const EDUCATION_PRO_IMAGE_FEATURE = "education.image.pro.daily";
const BILLING_PRO_INTEREST_FEATURE = "billing.pro_interest";

type EducationGenerationSource = "text" | "image" | "sketch";

type UsageRepository = Pick<
  ReturnType<typeof createWorldRepository>,
  "countUsage" | "recordUsage" | "saveSimulation"
>;

type ProInterestEmailSender = (input: ProInterestEmailInput & { operatorEmail: string }) => Promise<void>;

function getAuthToken(request: JsonRequest): string | null {
  const authorization = request.headers?.authorization;
  const value = Array.isArray(authorization) ? authorization[0] : authorization;

  if (!value || !value.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function getIpAddress(request: JsonRequest): string {
  const forwardedFor = request.headers?.["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

  if (forwardedValue && forwardedValue.trim().length > 0) {
    const firstForwardedIp = forwardedValue.split(",")[0]?.trim();

    if (firstForwardedIp) {
      return firstForwardedIp;
    }
  }

  return request.ip ?? "127.0.0.1";
}

function getRequestedRoomName(request: JsonRequest): string | null {
  return typeof request.body?.roomName === "string" && request.body.roomName.trim().length > 0
    ? request.body.roomName.trim()
    : null;
}

export function createAuthHttpHandlers(
  authService: ReturnType<typeof createAuthService>,
  logger: Logger = NOOP_LOGGER,
) {
  return {
    issueChallenge(_request: JsonRequest, response: JsonResponse) {
      const challenge = authService.issueChallenge();
      logger.info("auth.challenge_issued", {
        challengeId: challenge.challengeId,
      });
      response.status(200).json({
        challengeId: challenge.challengeId,
        prompt: challenge.prompt,
      });
    },
    async requestCode(request: JsonRequest, response: JsonResponse) {
      try {
        const result = await authService.requestCode({
          email: String(request.body?.email ?? ""),
          challengeId: String(request.body?.challengeId ?? ""),
          challengeAnswer: String(request.body?.challengeAnswer ?? ""),
          ipAddress: getIpAddress(request),
        });
        logger.info("auth.code_requested", {
          email: String(request.body?.email ?? ""),
          ipAddress: getIpAddress(request),
          status: "accepted",
        });
        response.status(202).json(result);
      } catch (error) {
        logger.warn("auth.code_request_failed", {
          email: String(request.body?.email ?? ""),
          error: error instanceof Error ? error.message : "request code failed",
          ipAddress: getIpAddress(request),
        });
        response.status(400).json({
          error: error instanceof Error ? error.message : "request code failed",
        });
      }
    },
    async verifyCode(request: JsonRequest, response: JsonResponse) {
      try {
        const verified = await authService.verifyCode({
          email: String(request.body?.email ?? ""),
          code: String(request.body?.code ?? ""),
        });
        logger.info("auth.code_verified", {
          email: String(request.body?.email ?? ""),
          userId: verified.user.userId,
        });
        response.status(200).json(verified);
      } catch (error) {
        logger.warn("auth.verify_failed", {
          email: String(request.body?.email ?? ""),
          error: error instanceof Error ? error.message : "verify code failed",
        });
        response.status(400).json({
          error: error instanceof Error ? error.message : "verify code failed",
        });
      }
    },
    session(request: JsonRequest, response: JsonResponse) {
      const user = authService.resolveSession(getAuthToken(request));

      if (!user) {
        logger.warn("auth.session_rejected", {
          reason: "unauthenticated",
        });
        response.status(401).json({ error: "unauthenticated" });
        return;
      }

      logger.info("auth.session_resolved", {
        userId: user.userId,
      });
      response.status(200).json({ user });
    },
    logout(request: JsonRequest, response: JsonResponse) {
      const user = authService.resolveSession(getAuthToken(request));
      authService.logout(getAuthToken(request));
      logger.info("auth.logout", {
        userId: user?.userId ?? null,
      });
      response.status(200).json({ ok: true });
    },
  };
}

export function createPlaygroundHttpHandlers(
  playgroundService: ReturnType<typeof createPlaygroundService>,
  authService?: Pick<ReturnType<typeof createAuthService>, "resolveSession">,
  logger: Logger = NOOP_LOGGER,
  options: {
    educationModelPlanner?: EducationModelPlanner;
    proInterestEmail?: ProInterestEmailSender;
    proInterestOperatorEmail?: string;
    usageRepository?: UsageRepository;
    now?: () => Date;
  } = {},
) {
  const educationModelPlanner = options.educationModelPlanner;
  const proInterestEmail = options.proInterestEmail;
  const proInterestOperatorEmail = options.proInterestOperatorEmail ?? DEFAULT_PRO_INTEREST_OPERATOR_EMAIL;
  const usageRepository = options.usageRepository;
  const now = options.now ?? (() => new Date());

  function getRoomSlug(request: JsonRequest): string {
    return typeof request.body?.roomSlug === "string" && request.body.roomSlug.length > 0
      ? request.body.roomSlug
      : DEFAULT_STAGE_SLUG;
  }

  function getRequestedSeedId(request: JsonRequest, key: "templateId" | "worldId"): string | null {
    return typeof request.body?.[key] === "string" && request.body[key].length > 0
      ? request.body[key]
      : null;
  }

  function getEffectiveRoomSlug(request: JsonRequest, user: AuthUser | null): string {
    const requestedRoomSlug = getRoomSlug(request);

    if (!authService) {
      return requestedRoomSlug;
    }

    if (!user) {
      return DEMO_ROOM_SLUG;
    }

    const stageSlug = user.access.canCreateStages
      ? requestedRoomSlug
      : user.access.defaultStageSlug;

    return `${user.userId}-${stageSlug}`;
  }

  function getAuthenticatedUser(request: JsonRequest): AuthUser | null {
    if (!authService) {
      const legacyPlayerId =
        typeof request.body?.playerId === "string" && request.body.playerId.length > 0
          ? request.body.playerId
          : "legacy-user";

      return {
        access: DEFAULT_RUNTIME_ACCESS_CONFIG.tiers.pro,
        userId: legacyPlayerId,
        email: `${legacyPlayerId}@local.dev`,
      };
    }

    return authService.resolveSession(getAuthToken(request));
  }

  function requireAuthenticatedUser(request: JsonRequest, response: JsonResponse): AuthUser | null {
    const user = getAuthenticatedUser(request);

    if (!user) {
      response.status(401).json({
        error: "authentication required",
      });
      return null;
    }

    return user;
  }

  function getEducationSource(request: JsonRequest): EducationGenerationSource {
    const source = request.body?.source;

    return source === "image" || source === "sketch" ? source : "text";
  }

  function getUsageDay(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  function getProInterestSource(request: JsonRequest): string {
    const source = request.body?.source;

    return typeof source === "string" && source.trim().length > 0
      ? source.trim().slice(0, 80)
      : "unknown";
  }

  function getEducationEntitlement(user: AuthUser | null, source: EducationGenerationSource) {
    if (!user) {
      return {
        canGenerate: false,
        canSave: false,
        dailyImageGenerationLimit: 0,
        dailyTextGenerationLimit: 0,
        remainingImageGenerations: 0,
        remainingTextGenerations: 0,
        tier: "guest",
      };
    }

    if (user.access.tier === "free") {
      const used = usageRepository?.countUsage({
        userId: user.userId,
        featureKey: EDUCATION_FREE_TEXT_FEATURE,
      }) ?? 0;
      const remaining = Math.max(0, FREE_LIFETIME_TEXT_GENERATION_LIMIT - used);

      return {
        canGenerate: source === "text" && remaining > 0,
        canSave: false,
        dailyImageGenerationLimit: 0,
        dailyTextGenerationLimit: 0,
        remainingImageGenerations: 0,
        remainingTextGenerations: remaining,
        tier: "free",
      };
    }

    const usageDay = getUsageDay(now());
    const textUsed = usageRepository?.countUsage({
      userId: user.userId,
      featureKey: EDUCATION_PRO_TEXT_FEATURE,
      usageDay,
    }) ?? 0;
    const imageUsed = usageRepository?.countUsage({
      userId: user.userId,
      featureKey: EDUCATION_PRO_IMAGE_FEATURE,
      usageDay,
    }) ?? 0;
    const remainingText = Math.max(0, PRO_DAILY_TEXT_GENERATION_LIMIT - textUsed);
    const remainingImage = Math.max(0, PRO_DAILY_IMAGE_GENERATION_LIMIT - imageUsed);

    return {
      canGenerate: source === "text" ? remainingText > 0 : remainingImage > 0,
      canSave: true,
      dailyImageGenerationLimit: PRO_DAILY_IMAGE_GENERATION_LIMIT,
      dailyTextGenerationLimit: PRO_DAILY_TEXT_GENERATION_LIMIT,
      remainingImageGenerations: remainingImage,
      remainingTextGenerations: remainingText,
      tier: "pro",
    };
  }

  function recordEducationUsage(user: AuthUser, source: EducationGenerationSource) {
    if (!usageRepository) {
      return;
    }

    const createdAt = now();

    if (user.access.tier === "free") {
      usageRepository.recordUsage({
        userId: user.userId,
        featureKey: EDUCATION_FREE_TEXT_FEATURE,
        createdAt: createdAt.toISOString(),
      });
      return;
    }

    usageRepository.recordUsage({
      userId: user.userId,
      featureKey: source === "text" ? EDUCATION_PRO_TEXT_FEATURE : EDUCATION_PRO_IMAGE_FEATURE,
      usageDay: getUsageDay(createdAt),
      createdAt: createdAt.toISOString(),
    });
  }

  function getEducationQuotaError(user: AuthUser | null, source: EducationGenerationSource): string {
    if (!user) {
      return "sign in to generate AI experiments";
    }

    if (user.access.tier === "free") {
      return source === "text"
        ? "free plan includes one AI experiment generation"
        : "image and sketch experiment generation requires Pro";
    }

    return source === "text"
      ? "daily Pro text generation quota reached"
      : "daily Pro image generation quota reached";
  }

  return {
    async planSimulation(request: JsonRequest, response: JsonResponse) {
      const question =
        typeof request.body?.question === "string" ? request.body.question.trim() : "";

      if (!question) {
        response.status(400).json({ error: "question must be a non-empty string" });
        return;
      }

      const user = getAuthenticatedUser(request);
      const source = getEducationSource(request);
      const selectedConcept = request.body?.selectedConcept;

      if (!user) {
        response.status(200).json({
          ...planEducationalSimulation(question),
          entitlement: getEducationEntitlement(null, source),
          source: "demo",
        });
        return;
      }

      const entitlement = getEducationEntitlement(user, source);

      if (!entitlement.canGenerate) {
        response.status(403).json({
          entitlement,
          error: getEducationQuotaError(user, source),
        });
        return;
      }

      let modelPlan: unknown = null;

      if (educationModelPlanner && source === "text" && !selectedConcept) {
        try {
          modelPlan = await educationModelPlanner.plan(question);
        } catch (error) {
          logger.warn("education.model_plan_failed", {
            error: error instanceof Error ? error.message : "education model planning failed",
            userId: user.userId,
          });
        }
      }

      const planned = planEducationalSimulation(question, {
        modelPlan,
        selectedConcept,
        suggestWhenUnsupported: true,
      });

      if ("suggestions" in planned) {
        response.status(200).json({
          ...planned,
          entitlement,
          source: "ai",
        });
        return;
      }

      recordEducationUsage(user, source);

      response.status(200).json({
        ...planned,
        entitlement: getEducationEntitlement(user, source),
        source: "ai",
      });
    },
    async saveSimulation(request: JsonRequest, response: JsonResponse) {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      if (user.access.tier !== "pro") {
        response.status(403).json({
          error: "saving experiments requires Pro",
        });
        return;
      }

      if (!usageRepository) {
        response.status(503).json({
          error: "saving experiments is unavailable",
        });
        return;
      }

      const title =
        typeof request.body?.title === "string" && request.body.title.trim().length > 0
          ? request.body.title.trim()
          : "Saved Experiment";
      const simulationJson =
        typeof request.body?.simulationJson === "string"
          ? request.body.simulationJson
          : JSON.stringify(request.body?.simulation ?? {});

      try {
        JSON.parse(simulationJson);
      } catch {
        response.status(400).json({
          error: "simulationJson must be valid JSON",
        });
        return;
      }

      const saved = usageRepository.saveSimulation({
        userId: user.userId,
        title,
        simulationJson,
        createdAt: now().toISOString(),
      });

      response.status(201).json(saved);
    },
    async proInterest(request: JsonRequest, response: JsonResponse) {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      const occurredAt = now().toISOString();

      if (usageRepository?.countUsage({
        userId: user.userId,
        featureKey: BILLING_PRO_INTEREST_FEATURE,
      })) {
        response.status(202).json({ ok: true });
        return;
      }

      usageRepository?.recordUsage({
        userId: user.userId,
        featureKey: BILLING_PRO_INTEREST_FEATURE,
        createdAt: occurredAt,
      });

      const interest = {
        currentTier: user.access.tier,
        ipAddress: getIpAddress(request),
        occurredAt,
        operatorEmail: proInterestOperatorEmail,
        source: getProInterestSource(request),
        userEmail: user.email,
        userId: user.userId,
      };

      if (!proInterestEmail) {
        logger.warn("billing.pro_interest_email_unconfigured", interest);
        response.status(202).json({ ok: true });
        return;
      }

      try {
        await proInterestEmail(interest);
      } catch (error) {
        logger.warn("billing.pro_interest_email_failed", {
          ...interest,
          error: error instanceof Error ? error.message : "send pro interest email failed",
        });
      }

      response.status(202).json({ ok: true });
    },
    join(request: JsonRequest, response: JsonResponse) {
      if (!authService) {
        const roomSlug = getRoomSlug(request);
        const templateId = getRequestedSeedId(request, "templateId");
        const worldId = getRequestedSeedId(request, "worldId");
        const playerId =
          typeof request.body?.playerId === "string" && request.body.playerId.length > 0
            ? request.body.playerId
            : crypto.randomUUID();
        const roomState = playgroundService.join(roomSlug, playerId, templateId, null, worldId);

        response.status(200).json({
          playerId,
          plannerStatus: playgroundService.getPlannerStatus(),
          roomName: getRequestedRoomName(request),
          roomSlug,
          roomState,
          writable: true,
        });
        logger.info("playground.join", {
          playerId,
          roomSlug,
          templateId,
          worldId,
          writable: true,
        });
        return;
      }

      const user = getAuthenticatedUser(request);
      const roomSlug = getEffectiveRoomSlug(request, user);
      const requestedRoomName = getRequestedRoomName(request);
      const effectiveRoomName = requestedRoomName;
      const templateId = user ? getRequestedSeedId(request, "templateId") : null;
      const worldId = user ? getRequestedSeedId(request, "worldId") : null;
      const playerId = user?.userId ?? null;
      const roomState = playgroundService.join(roomSlug, playerId, templateId, user?.access, worldId);
      response.status(200).json({
        playerId,
        plannerStatus: playgroundService.getPlannerStatus(),
        roomName: effectiveRoomName,
        roomSlug,
        roomState,
        writable: Boolean(user),
      });
      logger.info("playground.join", {
        playerId,
        roomSlug,
        templateId,
        worldId,
        writable: Boolean(user),
      });
    },
    async create(request: JsonRequest, response: JsonResponse) {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      try {
        const roomSlug = getEffectiveRoomSlug(request, user);
        const roomState = await playgroundService.create(
          roomSlug,
          user.userId,
          request.body?.payload as Parameters<typeof playgroundService.create>[2],
        );
        logger.info("playground.create", {
          playerId: user.userId,
          prompt:
            typeof request.body?.payload === "object" && request.body?.payload
              ? String((request.body.payload as { prompt?: unknown }).prompt ?? "")
              : "",
          roomSlug,
          status: "ok",
        });
        response.status(200).json({
          plannerStatus: playgroundService.getPlannerStatus(),
          roomState,
        });
      } catch (error) {
        logger.warn("playground.create_failed", {
          error: error instanceof Error ? error.message : "create failed",
          playerId: user.userId,
          roomSlug: getEffectiveRoomSlug(request, user),
        });
        response.status(400).json({
          plannerStatus: playgroundService.getPlannerStatus(),
          error: error instanceof Error ? error.message : "create failed",
        });
      }
    },
    async saveTemplate(request: JsonRequest, response: JsonResponse) {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      try {
        const saved = await playgroundService.saveTemplate({
          roomId: request.body?.roomId as string,
          title: request.body?.title as string,
          stateJson: request.body?.stateJson as string,
        });
        logger.info("playground.template_saved", {
          playerId: user.userId,
          roomId: saved.roomId,
          templateId: saved.templateId,
        });
        response.status(201).json(saved);
      } catch (error) {
        logger.warn("playground.template_save_failed", {
          error: error instanceof Error ? error.message : "save template failed",
          playerId: user.userId,
        });
        response.status(400).json({
          error: error instanceof Error ? error.message : "save template failed",
        });
      }
    },
    impulse(request: JsonRequest, response: JsonResponse) {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      try {
        const roomSlug = getEffectiveRoomSlug(request, user);
        const objectId = String(request.body?.objectId ?? "");
        const roomState = playgroundService.queueImpulse(
          roomSlug,
          user.userId,
          objectId,
          request.body?.impulse as [number, number, number],
        );
        logger.info("playground.impulse", {
          objectId: request.body?.objectId as string | undefined,
          playerId: user.userId,
          roomSlug,
          status: "ok",
        });
        response.status(200).json({ roomState });
      } catch (error) {
        logger.warn("playground.impulse_failed", {
          error: error instanceof Error ? error.message : "queue impulse failed",
          objectId: request.body?.objectId as string | undefined,
          playerId: user.userId,
        });
        response.status(400).json({
          error: error instanceof Error ? error.message : "queue impulse failed",
        });
      }
    },
    nudge(request: JsonRequest, response: JsonResponse) {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      try {
        const roomSlug = getEffectiveRoomSlug(request, user);
        const objectId = String(request.body?.objectId ?? "");
        const roomState = playgroundService.nudgeObject(
          roomSlug,
          user.userId,
          objectId,
          request.body?.delta as [number, number, number],
        );
        logger.info("playground.nudge", {
          objectId: request.body?.objectId as string | undefined,
          playerId: user.userId,
          roomSlug,
          status: "ok",
        });
        response.status(200).json({ roomState });
      } catch (error) {
        logger.warn("playground.nudge_failed", {
          error: error instanceof Error ? error.message : "nudge object failed",
          objectId: request.body?.objectId as string | undefined,
          playerId: user.userId,
        });
        response.status(400).json({
          error: error instanceof Error ? error.message : "nudge object failed",
        });
      }
    },
    rotate(request: JsonRequest, response: JsonResponse) {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      try {
        const roomSlug = getEffectiveRoomSlug(request, user);
        const objectId = String(request.body?.objectId ?? "");
        const roomState = playgroundService.rotateObject(
          roomSlug,
          user.userId,
          objectId,
          request.body?.delta as [number, number, number],
        );
        logger.info("playground.rotate", {
          objectId: request.body?.objectId as string | undefined,
          playerId: user.userId,
          roomSlug,
          status: "ok",
        });
        response.status(200).json({ roomState });
      } catch (error) {
        logger.warn("playground.rotate_failed", {
          error: error instanceof Error ? error.message : "rotate object failed",
          objectId: request.body?.objectId as string | undefined,
          playerId: user.userId,
        });
        response.status(400).json({
          error: error instanceof Error ? error.message : "rotate object failed",
        });
      }
    },
    scale(request: JsonRequest, response: JsonResponse) {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      try {
        const roomSlug = getEffectiveRoomSlug(request, user);
        const objectId = String(request.body?.objectId ?? "");
        const roomState = playgroundService.scaleObject(
          roomSlug,
          user.userId,
          objectId,
          request.body?.delta as [number, number, number],
        );
        logger.info("playground.scale", {
          objectId: request.body?.objectId as string | undefined,
          playerId: user.userId,
          roomSlug,
          status: "ok",
        });
        response.status(200).json({ roomState });
      } catch (error) {
        logger.warn("playground.scale_failed", {
          error: error instanceof Error ? error.message : "scale object failed",
          objectId: request.body?.objectId as string | undefined,
          playerId: user.userId,
        });
        response.status(400).json({
          error: error instanceof Error ? error.message : "scale object failed",
        });
      }
    },
    delete(request: JsonRequest, response: JsonResponse) {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      try {
        const roomSlug = getEffectiveRoomSlug(request, user);
        const objectId = String(request.body?.objectId ?? "");
        const roomState = playgroundService.removeObject(
          roomSlug,
          user.userId,
          objectId,
        );
        logger.info("playground.delete", {
          objectId: request.body?.objectId as string | undefined,
          playerId: user.userId,
          roomSlug,
          status: "ok",
        });
        response.status(200).json({ roomState });
      } catch (error) {
        logger.warn("playground.delete_failed", {
          error: error instanceof Error ? error.message : "remove object failed",
          objectId: request.body?.objectId as string | undefined,
          playerId: user.userId,
        });
        response.status(400).json({
          error: error instanceof Error ? error.message : "remove object failed",
        });
      }
    },
    clear(request: JsonRequest, response: JsonResponse) {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      try {
        const roomSlug = getEffectiveRoomSlug(request, user);
        const roomState = playgroundService.clearRoom(
          roomSlug,
          user.userId,
        );
        logger.info("playground.clear", {
          playerId: user.userId,
          roomSlug,
          status: "ok",
        });
        response.status(200).json({ roomState });
      } catch (error) {
        logger.warn("playground.clear_failed", {
          error: error instanceof Error ? error.message : "clear room failed",
          playerId: user.userId,
        });
        response.status(400).json({
          error: error instanceof Error ? error.message : "clear room failed",
        });
      }
    },
  };
}

export function createRealtimeServer(port = DEFAULT_PORT) {
  const observability = parseObservabilityConfig(process.env);
  const logger = createLogger({
    level: observability.logLevel,
    path: observability.logPath,
    stdout: observability.logToStdout,
  });
  const app = express();
  const server = http.createServer(app);
  const worldRepository = createWorldRepository("data/worlds.sqlite");
  const mailer = isSmtpConfigured() ? createMailer() : null;
  const authService = createAuthService({
    repository: worldRepository,
    sendLoginCodeEmail: mailer ? (input) => mailer.sendLoginCode(input) : undefined,
  });
  const playgroundService = createPlaygroundService({ worldRepository, logger });
  const educationModelPlanner = process.env.GOOGLE_API_KEY
    ? createEducationModelPlanner({
        apiKey: process.env.GOOGLE_API_KEY,
        model: process.env.PLAYGROUND_EDUCATION_AI_MODEL?.trim() || process.env.PLAYGROUND_AI_MODEL?.trim() || "gemini-2.5-flash",
        timeoutMs: observability.providerTimeoutMs,
      })
    : undefined;
  const gameServer = new Server({
    transport: new WebSocketTransport({
      server,
    }),
  });

  PlaygroundRoom.configurePersistence(worldRepository);
  PlaygroundRoom.configureAuth(authService);
  PlaygroundRoom.configureLogger(logger);
  gameServer.define("playground", PlaygroundRoom).filterBy(["slug"]);
  const playgroundHttpHandlers = createPlaygroundHttpHandlers(playgroundService, authService, logger, {
    educationModelPlanner,
    proInterestEmail: mailer ? (input) => mailer.sendProInterest(input) : undefined,
    proInterestOperatorEmail:
      process.env.PLAYGROUND_PRO_INTEREST_EMAIL?.trim() || DEFAULT_PRO_INTEREST_OPERATOR_EMAIL,
    usageRepository: worldRepository,
  });
  const authHttpHandlers = createAuthHttpHandlers(authService, logger);

  app.get("/healthz", (_request, response) => {
    response.status(200).json({ ok: true });
  });

  app.get("/api/auth/challenge", (request, response) => {
    authHttpHandlers.issueChallenge(request, response);
  });

  app.post("/api/auth/request-code", express.json(), (request, response) => {
    void authHttpHandlers.requestCode(request, response);
  });

  app.post("/api/auth/verify-code", express.json(), (request, response) => {
    void authHttpHandlers.verifyCode(request, response);
  });

  app.get("/api/auth/session", (request, response) => {
    authHttpHandlers.session(request, response);
  });

  app.post("/api/auth/logout", (request, response) => {
    authHttpHandlers.logout(request, response);
  });

  app.post("/api/playground/join", express.json(), (request, response) => {
    playgroundHttpHandlers.join(request, response);
  });

  app.post("/api/education/simulations/plan", express.json(), (request, response) => {
    void playgroundHttpHandlers.planSimulation(request, response);
  });

  app.post("/api/education/simulations/save", express.json(), (request, response) => {
    void playgroundHttpHandlers.saveSimulation(request, response);
  });

  app.post("/api/billing/pro-interest", express.json(), (request, response) => {
    void playgroundHttpHandlers.proInterest(request, response);
  });

  app.post("/api/playground/create", express.json(), (request, response) => {
    void playgroundHttpHandlers.create(request, response);
  });

  app.post("/api/playground/impulse", express.json(), (request, response) => {
    playgroundHttpHandlers.impulse(request, response);
  });

  app.post("/api/playground/nudge", express.json(), (request, response) => {
    playgroundHttpHandlers.nudge(request, response);
  });

  app.post("/api/playground/rotate", express.json(), (request, response) => {
    playgroundHttpHandlers.rotate(request, response);
  });

  app.post("/api/playground/scale", express.json(), (request, response) => {
    playgroundHttpHandlers.scale(request, response);
  });

  app.post("/api/playground/delete", express.json(), (request, response) => {
    playgroundHttpHandlers.delete(request, response);
  });

  app.post("/api/playground/clear", express.json(), (request, response) => {
    playgroundHttpHandlers.clear(request, response);
  });

  app.post("/api/worlds", express.json(), async (request, response) => {
    const user = authService.resolveSession(getAuthToken(request));

    if (!user) {
      response.status(401).json({
        error: "authentication required",
      });
      return;
    }

    const saved = await worldRepository.saveWorld(request.body);
    response.status(201).json(saved);
  });

  app.get("/api/snapshots/:snapshotId", (request, response) => {
    const snapshot = worldRepository.getPublicSnapshot(request.params.snapshotId);

    if (!snapshot) {
      response.status(404).json({ error: "snapshot not found" });
      return;
    }

    response.status(200).json(snapshot);
  });

  app.post("/api/templates", express.json(), (request, response) => {
    void playgroundHttpHandlers.saveTemplate(request, response);
  });

  return {
    app,
    gameServer,
    logger,
    server,
    listen() {
      return new Promise<void>((resolve, reject) => {
        const handleError = (error: Error) => {
          server.off("error", handleError);
          reject(error);
        };

        server.once("error", handleError);
        server.listen(port, () => {
          server.off("error", handleError);
          resolve();
        });
      });
    },
  };
}

function isMainModule(): boolean {
  return import.meta.url === new URL(process.argv[1], "file:").href;
}

if (isMainModule()) {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const realtimeServer = createRealtimeServer(port);

  void realtimeServer.listen().catch((error) => {
    realtimeServer.logger.error("server.start_failed", {
      error: error instanceof Error ? error.message : "Failed to start realtime server",
      port,
    });
    process.exitCode = 1;
  });
}
