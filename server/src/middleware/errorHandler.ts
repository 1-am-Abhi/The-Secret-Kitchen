import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { MulterError } from "multer";

import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

/**
 * The single place an error becomes an HTTP response. Every failure — thrown
 * AppError, Zod parse failure, Prisma constraint violation, or an unexpected
 * crash — is normalised to the same shape so clients only ever parse one thing:
 *
 *   { message: string, code?: string, details?: unknown }
 */

interface ErrorBody {
  message: string;
  code?: string;
  details?: unknown;
  stack?: string;
}

function normalise(error: unknown): { status: number; body: ErrorBody } {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: { message: error.message, code: error.code, details: error.details },
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 422,
      body: {
        message: "Validation failed.",
        code: "VALIDATION_ERROR",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    };
  }

  if (error instanceof TokenExpiredError) {
    return { status: 401, body: { message: "Session expired. Please sign in again.", code: "TOKEN_EXPIRED" } };
  }

  if (error instanceof JsonWebTokenError) {
    return { status: 401, body: { message: "Invalid authentication token.", code: "INVALID_TOKEN" } };
  }

  if (error instanceof MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE" ? "That image is too large (max 5 MB)." : error.message;
    return { status: 400, body: { message, code: `UPLOAD_${error.code}` } };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return {
          status: 409,
          body: {
            message: "A record with those details already exists.",
            code: "DUPLICATE",
            // `target` names the offending column(s), which the client can highlight.
            details: (error.meta as { target?: string[] } | undefined)?.target,
          },
        };
      case "P2025":
        return { status: 404, body: { message: "Resource not found.", code: "NOT_FOUND" } };
      case "P2003":
        return {
          status: 409,
          body: { message: "That record is still referenced elsewhere.", code: "FK_CONSTRAINT" },
        };
      default:
        return {
          status: 400,
          body: { message: "Database request could not be completed.", code: `PRISMA_${error.code}` },
        };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return { status: 400, body: { message: "Malformed database query.", code: "PRISMA_VALIDATION" } };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { status: 503, body: { message: "Database is unavailable.", code: "DB_UNAVAILABLE" } };
  }

  // Express' body parser surfaces oversized/invalid JSON as a plain Error with
  // a `status` and `type` — worth a precise message rather than a blanket 500.
  const maybeBodyParser = error as { type?: string; status?: number; message?: string };
  if (maybeBodyParser?.type === "entity.too.large") {
    return { status: 413, body: { message: "Request body is too large.", code: "PAYLOAD_TOO_LARGE" } };
  }
  if (maybeBodyParser?.type === "entity.parse.failed") {
    return { status: 400, body: { message: "Request body is not valid JSON.", code: "INVALID_JSON" } };
  }

  return { status: 500, body: { message: "Something went wrong.", code: "INTERNAL_ERROR" } };
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const { status, body } = normalise(error);

  if (status >= 500) {
    logger.error("Unhandled request failure", {
      method: req.method,
      path: req.originalUrl,
      error: error instanceof Error ? error.stack ?? error.message : String(error),
    });
  } else {
    logger.warn("Request rejected", {
      method: req.method,
      path: req.originalUrl,
      status,
      code: body.code,
    });
  }

  // Stack traces leak file paths and dependency versions — dev only.
  if (!env.isProduction && error instanceof Error) body.stack = error.stack;

  res.status(status).json(body);
};
