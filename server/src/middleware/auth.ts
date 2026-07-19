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
 * Verifies the JWT and re-checks the admin against the database on every
 * request. Re-reading costs one indexed lookup but means deactivating an admin
 * takes effect immediately instead of whenever their token happens to expire.
 */
export const requireAdmin: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = readBearer(req.headers.authorization);
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
