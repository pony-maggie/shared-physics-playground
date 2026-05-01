import crypto from "node:crypto";

import { getUserAccessPolicy, type RuntimeAccessConfig, type UserAccessPolicy } from "../../../../packages/shared/src/access-policy";
import { loadRuntimeAccessConfig } from "../config/access-config";
import type { createWorldRepository } from "../persistence/world-repository";

type WorldRepository = ReturnType<typeof createWorldRepository>;

type AuthRepository = Pick<
  WorldRepository,
  | "findOrCreateUser"
  | "saveLoginCode"
  | "getLoginCode"
  | "updateLoginCodeAttempts"
  | "consumeLoginCode"
  | "createSession"
  | "getSession"
  | "deleteSession"
>;

export type AuthUser = {
  userId: string;
  email: string;
  access: UserAccessPolicy;
};

type ChallengeRecord = {
  answer: string;
  expiresAt: number;
};

type RequestWindowRecord = {
  timestamps: number[];
  lastRequestAt: number | null;
};

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 30 * 1000;
const MAX_REQUESTS_PER_EMAIL = 3;
const MAX_REQUESTS_PER_IP = 5;
const MAX_CODE_ATTEMPTS = 3;

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function pruneWindow(record: RequestWindowRecord, nowMs: number): RequestWindowRecord {
  return {
    timestamps: record.timestamps.filter((timestamp) => nowMs - timestamp < REQUEST_WINDOW_MS),
    lastRequestAt: record.lastRequestAt,
  };
}

export function createAuthService(props: {
  repository: AuthRepository;
  now?: () => Date;
  randomInt?: () => number;
  randomId?: () => string;
  isDevelopment?: boolean;
  accessConfig?: RuntimeAccessConfig;
  exposeDevelopmentCode?: boolean;
  sendLoginCodeEmail?: (input: { email: string; code: string }) => Promise<void>;
}) {
  const repository = props.repository;
  const now = props.now ?? (() => new Date());
  const randomInt = props.randomInt ?? (() => crypto.randomInt(100000, 999999));
  const randomId = props.randomId ?? (() => crypto.randomUUID());
  const isDevelopment = props.isDevelopment ?? process.env.NODE_ENV !== "production";
  const accessConfig = props.accessConfig ?? loadRuntimeAccessConfig();
  const sendLoginCodeEmail = props.sendLoginCodeEmail ?? null;
  const exposeDevelopmentCode = props.exposeDevelopmentCode ?? (isDevelopment && !sendLoginCodeEmail);
  const requireEmailDelivery = !exposeDevelopmentCode && !sendLoginCodeEmail;
  const challenges = new Map<string, ChallengeRecord>();
  const requestsByEmail = new Map<string, RequestWindowRecord>();
  const requestsByIp = new Map<string, RequestWindowRecord>();

  function createSessionForEmail(email: string) {
    const userRecord = repository.findOrCreateUser(email);
    const user: AuthUser = {
      ...userRecord,
      access: getUserAccessPolicy(accessConfig, email),
    };
    const authToken = randomId();

    repository.createSession({
      sessionTokenHash: hashValue(authToken),
      userId: userRecord.userId,
      createdAt: now().toISOString(),
      expiresAt: new Date(now().getTime() + SESSION_TTL_MS).toISOString(),
    });

    return {
      authToken,
      user,
    };
  }

  function issueChallenge() {
    const left = (randomInt() % 9) + 1;
    const right = ((Math.floor(randomInt() / 10) || 1) % 9) + 1;
    const challengeId = `challenge-${randomId()}`;
    const answer = String(left + right);

    challenges.set(challengeId, {
      answer,
      expiresAt: now().getTime() + CHALLENGE_TTL_MS,
    });

    return {
      challengeId,
      prompt: `${left} + ${right} = ?`,
      answer,
    };
  }

  function validateChallenge(challengeId: string, answer: string) {
    const record = challenges.get(challengeId);

    if (!record || record.expiresAt < now().getTime()) {
      challenges.delete(challengeId);
      throw new Error("invalid challenge");
    }

    challenges.delete(challengeId);

    if (record.answer !== answer.trim()) {
      throw new Error("invalid challenge");
    }
  }

  function checkRateLimit(
    store: Map<string, RequestWindowRecord>,
    key: string,
    maxRequests: number,
    enforceCooldown: boolean,
  ) {
    const currentTime = now().getTime();
    const current = pruneWindow(store.get(key) ?? { timestamps: [], lastRequestAt: null }, currentTime);

    if (
      enforceCooldown &&
      current.lastRequestAt &&
      currentTime - current.lastRequestAt < REQUEST_COOLDOWN_MS
    ) {
      store.set(key, current);
      throw new Error("request cooldown");
    }

    if (current.timestamps.length >= maxRequests) {
      store.set(key, current);
      throw new Error("too many requests");
    }

    current.timestamps.push(currentTime);
    current.lastRequestAt = currentTime;
    store.set(key, current);
  }

  return {
    issueChallenge,
    async requestCode(input: {
      email: string;
      challengeId: string;
      challengeAnswer: string;
      ipAddress: string;
    }) {
      const email = normalizeEmail(input.email);

      if (!isValidEmail(email)) {
        throw new Error("invalid email");
      }

      validateChallenge(input.challengeId, input.challengeAnswer);
      checkRateLimit(requestsByEmail, email, MAX_REQUESTS_PER_EMAIL, true);
      checkRateLimit(requestsByIp, input.ipAddress, MAX_REQUESTS_PER_IP, false);

      if (requireEmailDelivery) {
        throw new Error("email delivery is not configured");
      }

      const code = String(randomInt()).padStart(6, "0").slice(0, 6);
      const issuedAt = now();

      repository.saveLoginCode({
        email,
        codeHash: hashValue(code),
        expiresAt: new Date(issuedAt.getTime() + LOGIN_CODE_TTL_MS).toISOString(),
        attemptsRemaining: MAX_CODE_ATTEMPTS,
        requestedAt: issuedAt.toISOString(),
      });
      if (sendLoginCodeEmail) {
        await sendLoginCodeEmail({ email, code });
      }

      return {
        accepted: true as const,
        ...(exposeDevelopmentCode ? { devCode: code } : {}),
      };
    },
    async verifyCode(input: { email: string; code: string }) {
      const email = normalizeEmail(input.email);
      const record = repository.getLoginCode(email);

      if (!record || record.consumedAt) {
        throw new Error("invalid code");
      }

      if (new Date(record.expiresAt).getTime() < now().getTime()) {
        throw new Error("code expired");
      }

      if (record.attemptsRemaining <= 0) {
        throw new Error("too many attempts");
      }

      if (record.codeHash !== hashValue(input.code.trim())) {
        const nextAttempts = record.attemptsRemaining - 1;
        repository.updateLoginCodeAttempts(email, Math.max(0, nextAttempts));

        throw new Error("invalid code");
      }

      repository.consumeLoginCode(email, now().toISOString());
      return createSessionForEmail(email);
    },
    resolveSession(authToken: string | null | undefined) {
      if (!authToken) {
        return null;
      }

      const session = repository.getSession(hashValue(authToken));

      if (!session) {
        return null;
      }

      if (new Date(session.expiresAt).getTime() < now().getTime()) {
        repository.deleteSession(session.sessionTokenHash);
        return null;
      }

      return {
        ...session.user,
        access: getUserAccessPolicy(accessConfig, session.user.email),
      };
    },
    logout(authToken: string | null | undefined) {
      if (!authToken) {
        return;
      }

      repository.deleteSession(hashValue(authToken));
    },
  };
}
