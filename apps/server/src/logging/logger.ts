import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import type { LogLevel } from "../config/observability-config";

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type Logger = {
  debug: (event: string, fields?: Record<string, unknown>) => void;
  info: (event: string, fields?: Record<string, unknown>) => void;
  warn: (event: string, fields?: Record<string, unknown>) => void;
  error: (event: string, fields?: Record<string, unknown>) => void;
};

export function createLogger(props: {
  level: LogLevel;
  path: string | null;
  stdout: boolean;
  now?: () => string;
}): Logger {
  const now = props.now ?? (() => new Date().toISOString());

  function write(level: LogLevel, event: string, fields?: Record<string, unknown>) {
    if (LOG_LEVEL_WEIGHT[level] < LOG_LEVEL_WEIGHT[props.level]) {
      return;
    }

    const payload = `${JSON.stringify({
      at: now(),
      level,
      event,
      ...(fields ?? {}),
    })}\n`;

    if (props.path) {
      mkdirSync(dirname(props.path), { recursive: true });
      appendFileSync(props.path, payload, "utf8");
    }

    if (props.stdout) {
      process.stdout.write(payload);
    }
  }

  return {
    debug: (event, fields) => write("debug", event, fields),
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields),
    error: (event, fields) => write("error", event, fields),
  };
}
