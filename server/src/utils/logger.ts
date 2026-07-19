import { env } from "../config/env";

/**
 * Structured logging. Production emits one JSON object per line so Railway /
 * Render log drains and any downstream aggregator can index the fields;
 * development prints a short human-readable line instead.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: number = env.isTest ? LEVEL_ORDER.error : LEVEL_ORDER.debug;

function emit(level: Level, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < MIN_LEVEL) return;

  // eslint-disable-next-line no-console -- this module IS the logging boundary
  const target = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  if (env.isProduction) {
    target(JSON.stringify({ level, time: new Date().toISOString(), message, ...context }));
    return;
  }

  const suffix = context && Object.keys(context).length ? ` ${JSON.stringify(context)}` : "";
  target(`[${level.toUpperCase()}] ${message}${suffix}`);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
};
