import { describe, expect, test } from "vitest";

import { createAuthService } from "./auth-service";

type AuthRepository = Parameters<typeof createAuthService>[0]["repository"];

function createAuthTestRepository(): AuthRepository {
  const users = new Map<string, { userId: string; email: string }>();
  const usersById = new Map<string, { userId: string; email: string }>();
  const loginCodes = new Map<
    string,
    {
      email: string;
      codeHash: string;
      expiresAt: string;
      attemptsRemaining: number;
      requestedAt: string;
      consumedAt: string | null;
    }
  >();
  const sessions = new Map<
    string,
    {
      sessionTokenHash: string;
      createdAt: string;
      expiresAt: string;
      user: {
        userId: string;
        email: string;
      };
    }
  >();
  let userCounter = 0;

  return {
    findOrCreateUser(email: string) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = users.get(normalizedEmail);

      if (existing) {
        return existing;
      }

      const created = {
        userId: `user-${++userCounter}`,
        email: normalizedEmail,
      };

      users.set(normalizedEmail, created);
      usersById.set(created.userId, created);
      return created;
    },
    saveLoginCode(record) {
      loginCodes.set(record.email, {
        ...record,
        consumedAt: null,
      });
    },
    getLoginCode(email: string) {
      return loginCodes.get(email.trim().toLowerCase()) ?? null;
    },
    updateLoginCodeAttempts(email: string, attemptsRemaining: number) {
      const record = loginCodes.get(email.trim().toLowerCase());

      if (record) {
        record.attemptsRemaining = attemptsRemaining;
      }
    },
    consumeLoginCode(email: string, consumedAt: string) {
      const record = loginCodes.get(email.trim().toLowerCase());

      if (record) {
        record.consumedAt = consumedAt;
      }
    },
    createSession(record) {
      const user = usersById.get(record.userId);
      if (!user) {
        throw new Error("missing user");
      }

      sessions.set(record.sessionTokenHash, {
        sessionTokenHash: record.sessionTokenHash,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        user,
      });
    },
    getSession(sessionTokenHash: string) {
      return sessions.get(sessionTokenHash) ?? null;
    },
    deleteSession(sessionTokenHash: string) {
      sessions.delete(sessionTokenHash);
    },
  };
}

describe("auth service", () => {
  test("keeps normal local free-user accounts on the configured default authenticated tier", async () => {
    const repo = createAuthTestRepository();
    const auth = createAuthService({
      repository: repo,
      now: () => new Date("2026-04-12T12:00:00.000Z"),
      randomInt: () => 123456,
      randomId: () => "session-token-1",
      isDevelopment: true,
    });

    const challenge = auth.issueChallenge();
    const request = await auth.requestCode({
      email: "playground-free+solo@example.com",
      challengeId: challenge.challengeId,
      challengeAnswer: challenge.answer,
      ipAddress: "127.0.0.1",
    });

    expect(request).toEqual({
      accepted: true,
      devCode: "123456",
    });

    const verified = await auth.verifyCode({
      email: "playground-free+solo@example.com",
      code: "123456",
    });

    expect(verified).toEqual({
      authToken: "session-token-1",
      user: {
        access: {
          canCreateNamedRooms: false,
          canCreateStages: false,
          defaultRoomSlug: "my-stage",
          defaultStageSlug: "my-stage",
          maxObjectsPerStage: 5,
          maxOwnedObjects: 5,
          maxStages: 1,
          tier: "free",
        },
        userId: "user-1",
        email: "playground-free+solo@example.com",
      },
    });
    expect(auth.resolveSession("session-token-1")).toEqual({
      access: {
        canCreateNamedRooms: false,
        canCreateStages: false,
        defaultRoomSlug: "my-stage",
        defaultStageSlug: "my-stage",
        maxObjectsPerStage: 5,
        maxOwnedObjects: 5,
        maxStages: 1,
        tier: "free",
      },
      userId: "user-1",
      email: "playground-free+solo@example.com",
    });
  });

  test("sends login codes through the configured email sender without echoing development codes", async () => {
    const repo = createAuthTestRepository();
    const sentCodes: Array<{ email: string; code: string }> = [];
    const auth = createAuthService({
      repository: repo,
      now: () => new Date("2026-04-12T12:00:00.000Z"),
      randomInt: () => 123456,
      randomId: () => "session-token-email",
      isDevelopment: true,
      sendLoginCodeEmail: async (input) => {
        sentCodes.push(input);
      },
    });

    const challenge = auth.issueChallenge();
    const request = await auth.requestCode({
      email: "real-tester@example.com",
      challengeId: challenge.challengeId,
      challengeAnswer: challenge.answer,
      ipAddress: "127.0.0.1",
    });

    expect(request).toEqual({
      accepted: true,
    });
    expect(sentCodes).toEqual([
      {
        email: "real-tester@example.com",
        code: "123456",
      },
    ]);

    const verified = await auth.verifyCode({
      email: "real-tester@example.com",
      code: "123456",
    });

    expect(verified.user.email).toBe("real-tester@example.com");
  });

  test("rejects production code requests when email delivery is not configured", async () => {
    const repo = createAuthTestRepository();
    const auth = createAuthService({
      repository: repo,
      now: () => new Date("2026-04-12T12:00:00.000Z"),
      randomInt: () => 123456,
      randomId: () => "session-token-no-email",
      isDevelopment: false,
    });

    const challenge = auth.issueChallenge();

    await expect(
      auth.requestCode({
        email: "real-tester@example.com",
        challengeId: challenge.challengeId,
        challengeAnswer: challenge.answer,
        ipAddress: "127.0.0.1",
      }),
    ).rejects.toThrow("email delivery is not configured");
  });

  test("rejects expired codes and invalidates after too many attempts", async () => {
    const repo = createAuthTestRepository();
    let nowValue = new Date("2026-04-12T12:00:00.000Z");
    const auth = createAuthService({
      repository: repo,
      now: () => nowValue,
      randomInt: () => 654321,
      randomId: () => "session-token-2",
      isDevelopment: true,
    });

    const challenge = auth.issueChallenge();
    await auth.requestCode({
      email: "builder@example.com",
      challengeId: challenge.challengeId,
      challengeAnswer: challenge.answer,
      ipAddress: "127.0.0.1",
    });

    await expect(
      auth.verifyCode({
        email: "builder@example.com",
        code: "111111",
      }),
    ).rejects.toThrow("invalid code");
    await expect(
      auth.verifyCode({
        email: "builder@example.com",
        code: "111111",
      }),
    ).rejects.toThrow("invalid code");
    await expect(
      auth.verifyCode({
        email: "builder@example.com",
        code: "111111",
      }),
    ).rejects.toThrow("invalid code");
    await expect(
      auth.verifyCode({
        email: "builder@example.com",
        code: "111111",
      }),
    ).rejects.toThrow("too many attempts");

    nowValue = new Date("2026-04-12T12:10:00.000Z");
    const secondChallenge = auth.issueChallenge();
    await auth.requestCode({
      email: "new@example.com",
      challengeId: secondChallenge.challengeId,
      challengeAnswer: secondChallenge.answer,
      ipAddress: "127.0.0.1",
    });
    nowValue = new Date("2026-04-12T12:21:00.000Z");

    await expect(
      auth.verifyCode({
        email: "new@example.com",
        code: "654321",
      }),
    ).rejects.toThrow("code expired");
  });

  test("throttles repeated code requests per email and still caps total requests per ip", async () => {
    const repo = createAuthTestRepository();
    let nowValue = new Date("2026-04-12T12:00:00.000Z");
    const auth = createAuthService({
      repository: repo,
      now: () => nowValue,
      randomInt: () => 111111,
      randomId: () => "session-token-3",
      isDevelopment: true,
    });

    const challenge = auth.issueChallenge();
    await auth.requestCode({
      email: "builder@example.com",
      challengeId: challenge.challengeId,
      challengeAnswer: challenge.answer,
      ipAddress: "127.0.0.1",
    });

    const secondChallenge = auth.issueChallenge();
    await expect(
      auth.requestCode({
        email: "builder@example.com",
        challengeId: secondChallenge.challengeId,
        challengeAnswer: secondChallenge.answer,
        ipAddress: "127.0.0.1",
      }),
    ).rejects.toThrow("request cooldown");

    const thirdChallenge = auth.issueChallenge();
    await auth.requestCode({
      email: "second@example.com",
      challengeId: thirdChallenge.challengeId,
      challengeAnswer: thirdChallenge.answer,
      ipAddress: "127.0.0.1",
    });

    nowValue = new Date("2026-04-12T12:01:00.000Z");

    for (let index = 0; index < 3; index += 1) {
      const nextChallenge = auth.issueChallenge();
      await auth.requestCode({
        email: `builder-${index + 3}@example.com`,
        challengeId: nextChallenge.challengeId,
        challengeAnswer: nextChallenge.answer,
        ipAddress: "127.0.0.1",
      });
      nowValue = new Date(`2026-04-12T12:0${index + 2}:00.000Z`);
    }

    const blockedChallenge = auth.issueChallenge();
    await expect(
      auth.requestCode({
        email: "blocked@example.com",
        challengeId: blockedChallenge.challengeId,
        challengeAnswer: blockedChallenge.answer,
        ipAddress: "127.0.0.1",
      }),
    ).rejects.toThrow("too many requests");
  });

  test("does not allow the removed local pro-dev account to sign in directly with a fixed code", async () => {
    const repo = createAuthTestRepository();
    const auth = createAuthService({
      repository: repo,
      now: () => new Date("2026-04-12T12:00:00.000Z"),
      randomId: () => "session-token-removed-dev-account",
      isDevelopment: true,
    });

    await expect(
      auth.verifyCode({
        email: "playground-pro-dev@example.com",
        code: "424242",
      }),
    ).rejects.toThrow("invalid code");
  });
});
