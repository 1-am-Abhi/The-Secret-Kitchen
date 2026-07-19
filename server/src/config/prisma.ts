import { PrismaClient } from "@prisma/client";

import { env } from "./env";

/**
 * Prisma singleton. `tsx watch` re-evaluates modules on every save, so without
 * caching the client on `globalThis` a long dev session would leak a new
 * connection pool per reload and eventually exhaust Postgres connections.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDevelopment ? ["warn", "error"] : ["error"],
  });

if (!env.isProduction) globalForPrisma.prisma = prisma;

/** Lightweight liveness probe used by GET /api/health. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
