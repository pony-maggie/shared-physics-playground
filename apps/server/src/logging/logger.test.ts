import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLogger", () => {
  it("writes JSONL records to the configured file", () => {
    const dir = mkdtempSync(join(tmpdir(), "playground-logger-"));
    const file = join(dir, "events.log");
    const logger = createLogger({
      level: "info",
      path: file,
      stdout: false,
      now: () => "2026-04-16T10:00:00.000Z",
    });

    logger.info("planner.cache_hit", { key: "abc123" });

    const line = readFileSync(file, "utf8").trim();
    expect(JSON.parse(line)).toEqual({
      at: "2026-04-16T10:00:00.000Z",
      event: "planner.cache_hit",
      key: "abc123",
      level: "info",
    });
  });

  it("filters out messages below the configured level", () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const logger = createLogger({
      level: "warn",
      path: null,
      stdout: true,
      now: () => "2026-04-16T10:00:00.000Z",
    });

    logger.info("planner.cache_hit", {});
    logger.error("planner.live_failed", { reason: "timeout" });

    expect(stdout).toHaveBeenCalledTimes(1);
    expect(stdout.mock.calls[0]?.[0]).toBe(
      '{"at":"2026-04-16T10:00:00.000Z","level":"error","event":"planner.live_failed","reason":"timeout"}\n',
    );
  });
});
