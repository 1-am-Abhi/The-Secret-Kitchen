import type { AdminRole } from "@prisma/client";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

/** Claims we mint; kept minimal so a stolen token reveals nothing useful. */
export interface AdminTokenPayload {
  sub: string;
  email: string;
  role: AdminRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: "the-secret-kitchen",
  } as jwt.SignOptions);
}

function readBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!token || scheme?.toLowerCase() !== "bearer") return null;
  return token.trim();
}

/**
 * Falls back to `?access_token=` for EventSource connections.
 *
 * The browser's EventSource API cannot set request headers, so an SSE stream
 * has no way to send an Authorization header. The trade-off is that query
 * strings can be captured in access logs and proxy traces — so this fallback is
 * accepted ONLY for GET requests (the SSE stream is the only such route), never
 * for a mutation. If tokens ever become long-lived, replace this with a
 * single-use stream ticket.
 */
function readQueryToken(req: { method: string; query: Record<string, unknown> }): string | null {
  if (req.method !== "GET") return null;
  const raw = req.query.access_token ?? req.query.token;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

/**
 * Verifies the JWT and re-checks the admin against the database on every
 * request. Re-reading costs one indexed lookup but means deactivating an admin
 * takes effect immediately instead of whenever their token happens to expire.
 */
export const requireAdmin: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = readBearer(req.headers.authorization) ?? readQueryToken(req);
  if (!token) throw AppError.unauthorized("Missing bearer token.");

  const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: "the-secret-kitchen" });
  if (typeof decoded === "string" || !decoded.sub) {
    throw AppError.unauthorized("Malformed authentication token.");
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: decoded.sub },
    select: { id: true, email: true, role: true, active: true },
  });

  if (!admin || !admin.active) throw AppError.unauthorized("This account is no longer active.");

  req.admin = { sub: admin.id, email: admin.email, role: admin.role };
  next();
});

/** Route-level role gate, layered on top of `requireAdmin`. */
export function requireRole(...roles: AdminRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.admin) return next(AppError.unauthorized());
    if (!roles.includes(req.admin.role)) {
      return next(AppError.forbidden("Your role cannot perform this action."));
    }
    return next();
  };
}
