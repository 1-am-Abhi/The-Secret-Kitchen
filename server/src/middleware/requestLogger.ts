import morgan from "morgan";
import type { RequestHandler } from "express";

import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * HTTP access logging. Morgan writes through our logger rather than straight to
 * stdout so production access lines are JSON like everything else and can be
 * correlated with application logs by an aggregator.
 */

const format = env.isProduction
  ? ':method :url :status :res[content-length] - :response-time ms'
  : "dev";

const passthrough: RequestHandler = (_req, _res, next) => next();

export const requestLogger: RequestHandler = env.LOG_REQUESTS
  ? morgan(format, {
      stream: { write: (line: string) => logger.info(line.trim(), { channel: "http" }) },
      // Health checks fire every few seconds on Render/Railway; logging them
      // buries the real traffic.
      skip: (req) => req.originalUrl === "/api/health",
    })
  : passthrough;
