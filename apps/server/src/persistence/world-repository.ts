import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

export const createWorldRepository = (filename: string) => {
  if (filename !== ":memory:") {
    mkdirSync(dirname(filename), { recursive: true });
  }

  const db = new Database(filename);

  db.exec(`
    create table if not exists worlds (
      world_id text primary key,
      room_id text not null,
      title text not null,
      state_json text not null
    );

    create table if not exists public_snapshots (
      snapshot_id text primary key,
      world_id text not null,
      title text not null,
      image_data_url text not null,
      object_count integer not null,
      created_at text not null,
      foreign key (world_id) references worlds(world_id)
    );

    create table if not exists templates (
      template_id text primary key,
      room_id text not null,
      title text not null,
      state_json text not null
    );

    create table if not exists users (
      user_id text primary key,
      email text not null unique,
      created_at text not null
    );

    create table if not exists login_codes (
      email text primary key,
      code_hash text not null,
      expires_at text not null,
      attempts_remaining integer not null,
      requested_at text not null,
      consumed_at text
    );

    create table if not exists auth_sessions (
      session_token_hash text primary key,
      user_id text not null,
      created_at text not null,
      expires_at text not null,
      foreign key (user_id) references users(user_id)
    );

    create table if not exists usage_events (
      usage_id text primary key,
      user_id text not null,
      feature_key text not null,
      usage_day text,
      created_at text not null
    );

    create table if not exists saved_simulations (
      simulation_id text primary key,
      user_id text not null,
      title text not null,
      simulation_json text not null,
      created_at text not null
    );
  `);

  return {
    async saveWorld(input: {
      roomId: string;
      title: string;
      stateJson: string;
      snapshotImage?: string;
      isPublic?: boolean;
    }) {
      const row = db
        .prepare("select count(*) as count from worlds")
        .get() as { count: number };
      const worldId = `world-${row.count + 1}`;

      db.prepare(
        "insert into worlds (world_id, room_id, title, state_json) values (?, ?, ?, ?)",
      ).run(worldId, input.roomId, input.title, input.stateJson);
      const parsedState = JSON.parse(input.stateJson) as { objects?: unknown[] };
      const objectCount = Array.isArray(parsedState.objects) ? parsedState.objects.length : 0;
      const snapshotId = `snapshot-${row.count + 1}`;

      if (input.isPublic && input.snapshotImage) {
        db.prepare(
          `insert into public_snapshots
             (snapshot_id, world_id, title, image_data_url, object_count, created_at)
           values (?, ?, ?, ?, ?, ?)`,
        ).run(
          snapshotId,
          worldId,
          input.title,
          input.snapshotImage,
          objectCount,
          new Date().toISOString(),
        );
      }

      return {
        worldId,
        roomId: input.roomId,
        title: input.title,
        stateJson: input.stateJson,
        ...(input.isPublic && input.snapshotImage ? { snapshotId } : {}),
      };
    },
    getPublicSnapshot(snapshotId: string) {
      const row = db
        .prepare(
          `select snapshot_id, world_id, title, image_data_url, object_count, created_at
           from public_snapshots
           where snapshot_id = ?`,
        )
        .get(snapshotId) as
        | {
            snapshot_id: string;
            world_id: string;
            title: string;
            image_data_url: string;
            object_count: number;
            created_at: string;
          }
        | undefined;

      if (!row) {
        return null;
      }

      return {
        snapshotId: row.snapshot_id,
        worldId: row.world_id,
        title: row.title,
        imageDataUrl: row.image_data_url,
        objectCount: row.object_count,
        createdAt: row.created_at,
      };
    },
    getWorld(worldId: string) {
      const row = db
        .prepare(
          "select world_id, room_id, title, state_json from worlds where world_id = ?",
        )
        .get(worldId) as
        | {
            world_id: string;
            room_id: string;
            title: string;
            state_json: string;
          }
        | undefined;

      if (!row) {
        return null;
      }

      return {
        worldId: row.world_id,
        roomId: row.room_id,
        title: row.title,
        stateJson: row.state_json,
      };
    },
    async saveTemplate(input: {
      roomId: string;
      title: string;
      stateJson: string;
    }) {
      const row = db
        .prepare("select count(*) as count from templates")
        .get() as { count: number };
      const templateId = `template-${row.count + 1}`;

      db.prepare(
        "insert into templates (template_id, room_id, title, state_json) values (?, ?, ?, ?)",
      ).run(templateId, input.roomId, input.title, input.stateJson);

      return {
        templateId,
        roomId: input.roomId,
        title: input.title,
        stateJson: input.stateJson,
      };
    },
    getTemplate(templateId: string) {
      const row = db
        .prepare(
          "select template_id, room_id, title, state_json from templates where template_id = ?",
        )
        .get(templateId) as
        | {
            template_id: string;
            room_id: string;
            title: string;
            state_json: string;
          }
        | undefined;

      if (!row) {
        return null;
      }

      return {
        templateId: row.template_id,
        roomId: row.room_id,
        title: row.title,
        stateJson: row.state_json,
      };
    },
    findOrCreateUser(email: string) {
      const existing = db
        .prepare("select user_id, email from users where email = ?")
        .get(email) as
        | {
            user_id: string;
            email: string;
          }
        | undefined;

      if (existing) {
        return {
          userId: existing.user_id,
          email: existing.email,
        };
      }

      const row = db.prepare("select count(*) as count from users").get() as { count: number };
      const userId = `user-${row.count + 1}`;
      const createdAt = new Date().toISOString();

      db.prepare("insert into users (user_id, email, created_at) values (?, ?, ?)").run(
        userId,
        email,
        createdAt,
      );

      return {
        userId,
        email,
      };
    },
    saveLoginCode(input: {
      email: string;
      codeHash: string;
      expiresAt: string;
      attemptsRemaining: number;
      requestedAt: string;
    }) {
      db.prepare(
        `insert into login_codes (email, code_hash, expires_at, attempts_remaining, requested_at, consumed_at)
         values (?, ?, ?, ?, ?, null)
         on conflict(email) do update set
           code_hash = excluded.code_hash,
           expires_at = excluded.expires_at,
           attempts_remaining = excluded.attempts_remaining,
           requested_at = excluded.requested_at,
           consumed_at = null`,
      ).run(
        input.email,
        input.codeHash,
        input.expiresAt,
        input.attemptsRemaining,
        input.requestedAt,
      );
    },
    getLoginCode(email: string) {
      const row = db
        .prepare(
          `select email, code_hash, expires_at, attempts_remaining, requested_at, consumed_at
           from login_codes
           where email = ?`,
        )
        .get(email) as
        | {
            email: string;
            code_hash: string;
            expires_at: string;
            attempts_remaining: number;
            requested_at: string;
            consumed_at: string | null;
          }
        | undefined;

      if (!row) {
        return null;
      }

      return {
        email: row.email,
        codeHash: row.code_hash,
        expiresAt: row.expires_at,
        attemptsRemaining: row.attempts_remaining,
        requestedAt: row.requested_at,
        consumedAt: row.consumed_at,
      };
    },
    updateLoginCodeAttempts(email: string, attemptsRemaining: number) {
      db.prepare(
        "update login_codes set attempts_remaining = ? where email = ?",
      ).run(attemptsRemaining, email);
    },
    consumeLoginCode(email: string, consumedAt: string) {
      db.prepare(
        "update login_codes set consumed_at = ? where email = ?",
      ).run(consumedAt, email);
    },
    createSession(input: {
      sessionTokenHash: string;
      userId: string;
      createdAt: string;
      expiresAt: string;
    }) {
      db.prepare(
        `insert into auth_sessions (session_token_hash, user_id, created_at, expires_at)
         values (?, ?, ?, ?)`,
      ).run(input.sessionTokenHash, input.userId, input.createdAt, input.expiresAt);
    },
    getSession(sessionTokenHash: string) {
      const row = db
        .prepare(
          `select
             auth_sessions.session_token_hash,
             auth_sessions.created_at,
             auth_sessions.expires_at,
             users.user_id,
             users.email
           from auth_sessions
           inner join users on users.user_id = auth_sessions.user_id
           where auth_sessions.session_token_hash = ?`,
        )
        .get(sessionTokenHash) as
        | {
            session_token_hash: string;
            created_at: string;
            expires_at: string;
            user_id: string;
            email: string;
          }
        | undefined;

      if (!row) {
        return null;
      }

      return {
        sessionTokenHash: row.session_token_hash,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        user: {
          userId: row.user_id,
          email: row.email,
        },
      };
    },
    deleteSession(sessionTokenHash: string) {
      db.prepare("delete from auth_sessions where session_token_hash = ?").run(sessionTokenHash);
    },
    recordUsage(input: {
      userId: string;
      featureKey: string;
      usageDay?: string | null;
      createdAt: string;
    }) {
      const row = db
        .prepare("select count(*) as count from usage_events")
        .get() as { count: number };
      const usageId = `usage-${row.count + 1}`;

      db.prepare(
        `insert into usage_events (usage_id, user_id, feature_key, usage_day, created_at)
         values (?, ?, ?, ?, ?)`,
      ).run(
        usageId,
        input.userId,
        input.featureKey,
        input.usageDay ?? null,
        input.createdAt,
      );

      return {
        usageId,
        userId: input.userId,
        featureKey: input.featureKey,
        usageDay: input.usageDay ?? null,
        createdAt: input.createdAt,
      };
    },
    countUsage(input: {
      userId: string;
      featureKey: string;
      usageDay?: string | null;
    }) {
      if (typeof input.usageDay === "string") {
        const row = db
          .prepare(
            `select count(*) as count
             from usage_events
             where user_id = ? and feature_key = ? and usage_day = ?`,
          )
          .get(input.userId, input.featureKey, input.usageDay) as { count: number };

        return row.count;
      }

      const row = db
        .prepare(
          `select count(*) as count
           from usage_events
           where user_id = ? and feature_key = ?`,
        )
        .get(input.userId, input.featureKey) as { count: number };

      return row.count;
    },
    saveSimulation(input: {
      userId: string;
      title: string;
      simulationJson: string;
      createdAt: string;
    }) {
      const row = db
        .prepare("select count(*) as count from saved_simulations")
        .get() as { count: number };
      const simulationId = `simulation-${row.count + 1}`;

      db.prepare(
        `insert into saved_simulations (simulation_id, user_id, title, simulation_json, created_at)
         values (?, ?, ?, ?, ?)`,
      ).run(
        simulationId,
        input.userId,
        input.title,
        input.simulationJson,
        input.createdAt,
      );

      return {
        simulationId,
        userId: input.userId,
        title: input.title,
        simulationJson: input.simulationJson,
        createdAt: input.createdAt,
      };
    },
  };
};
