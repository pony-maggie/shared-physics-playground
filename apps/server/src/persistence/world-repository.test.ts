import { describe, expect, test } from "vitest";

import { createWorldRepository } from "./world-repository";

describe("world repository", () => {
  test("stores a shareable world and returns a stable id", async () => {
    const repo = createWorldRepository(":memory:");
    const saved = await repo.saveWorld({
      roomId: "room-1",
      title: "Test World",
      stateJson: "{\"objects\":[]}",
    });

    expect(saved.worldId).toBe("world-1");
    expect(repo.getWorld("world-1")).toEqual({
      worldId: "world-1",
      roomId: "room-1",
      title: "Test World",
      stateJson: "{\"objects\":[]}",
    });
    expect(repo.getWorld("world-404")).toBeNull();
  });

  test("stores a public snapshot when a world is saved publicly", async () => {
    const repo = createWorldRepository(":memory:");
    const saved = await repo.saveWorld({
      roomId: "stage-1",
      title: "Public Stage",
      stateJson: "{\"objects\":[{\"id\":\"object-1\"},{\"id\":\"object-2\"}]}",
      isPublic: true,
      snapshotImage: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
    });

    expect(saved).toEqual(
      expect.objectContaining({
        worldId: "world-1",
        snapshotId: "snapshot-1",
      }),
    );
    expect(repo.getPublicSnapshot("snapshot-1")).toEqual(
      expect.objectContaining({
        snapshotId: "snapshot-1",
        worldId: "world-1",
        title: "Public Stage",
        imageDataUrl: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
        objectCount: 2,
      }),
    );
    expect(repo.getPublicSnapshot("snapshot-404")).toBeNull();
  });

  test("stores and loads a reusable template", async () => {
    const repo = createWorldRepository(":memory:");
    const saved = await repo.saveTemplate({
      roomId: "room-1",
      title: "Template World",
      stateJson: "{\"objects\":[{\"id\":\"object-1\",\"kind\":\"spring\"}]}",
    });

    expect(saved.templateId).toBe("template-1");
    expect(repo.getTemplate("template-1")).toEqual({
      templateId: "template-1",
      roomId: "room-1",
      title: "Template World",
      stateJson: "{\"objects\":[{\"id\":\"object-1\",\"kind\":\"spring\"}]}",
    });
    expect(repo.getTemplate("template-404")).toBeNull();
  });

  test("creates users, stores login codes, and manages auth sessions", async () => {
    const repo = createWorldRepository(":memory:");

    const user = repo.findOrCreateUser("builder@example.com");
    const sameUser = repo.findOrCreateUser("builder@example.com");

    expect(user).toEqual({
      userId: "user-1",
      email: "builder@example.com",
    });
    expect(sameUser).toEqual(user);

    repo.saveLoginCode({
      email: "builder@example.com",
      codeHash: "hashed-code",
      expiresAt: "2026-04-12T12:10:00.000Z",
      attemptsRemaining: 5,
      requestedAt: "2026-04-12T12:00:00.000Z",
    });

    expect(repo.getLoginCode("builder@example.com")).toEqual({
      email: "builder@example.com",
      codeHash: "hashed-code",
      expiresAt: "2026-04-12T12:10:00.000Z",
      attemptsRemaining: 5,
      requestedAt: "2026-04-12T12:00:00.000Z",
      consumedAt: null,
    });

    repo.updateLoginCodeAttempts("builder@example.com", 3);
    expect(repo.getLoginCode("builder@example.com")?.attemptsRemaining).toBe(3);

    repo.consumeLoginCode("builder@example.com", "2026-04-12T12:01:00.000Z");
    expect(repo.getLoginCode("builder@example.com")?.consumedAt).toBe(
      "2026-04-12T12:01:00.000Z",
    );

    repo.createSession({
      userId: user.userId,
      sessionTokenHash: "session-hash",
      createdAt: "2026-04-12T12:02:00.000Z",
      expiresAt: "2026-05-12T12:02:00.000Z",
    });

    expect(repo.getSession("session-hash")).toEqual({
      sessionTokenHash: "session-hash",
      createdAt: "2026-04-12T12:02:00.000Z",
      expiresAt: "2026-05-12T12:02:00.000Z",
      user: user,
    });

    repo.deleteSession("session-hash");
    expect(repo.getSession("session-hash")).toBeNull();
  });
});
