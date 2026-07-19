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

    /**
     * Prisma's default interactive-transaction budget is 5s, which assumes a
     * database on the same machine or LAN. Against a hosted Postgres (Neon)
     * every statement inside a transaction is a separate network round trip,
     * and a serverless instance may additionally be waking from suspend.
     *
     * Order creation legitimately needs several sequential statements —
     * upsert the customer, resolve the address, reserve the order number,
     * insert the order with its lines and opening timeline entry — and on a
     * cold or distant database that comfortably exceeds 5s. It was observed
     * failing at 5464ms against Neon, which surfaces to the customer as a
     * rejected order even though nothing was wrong.
     *
     * These limits are generous enough for a cold start yet still bounded, so
     * a genuinely stuck transaction cannot pin a connection indefinitely.
     */
    transactionOptions: {
      maxWait: 10_000, // queueing for a connection from the pool
      timeout: 20_000, // total time the transaction may hold open
    },
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
