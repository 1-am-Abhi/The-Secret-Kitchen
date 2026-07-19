import type { Server } from "node:http";

import { createApp } from "./app";
import { env } from "./config/env";
import { disconnectPrisma, pingDatabase } from "./config/prisma";
import { logger } from "./utils/logger";

/**
 * Process bootstrap: start the HTTP listener, then shut it down cleanly when
 * the platform sends SIGTERM (Render/Railway do this on every redeploy). A
 * graceful drain means in-flight orders finish committing instead of being
 * killed mid-transaction.
 */

async function main(): Promise<void> {
  const app = createApp();

  const server: Server = app.listen(env.PORT, () => {
    logger.info("API listening", {
      port: env.PORT,
      environment: env.NODE_ENV,
      cors: env.corsOrigins.join(", "),
      cloudinary: env.cloudinaryEnabled ? "configured" : "disabled",
    });
  });

  // Non-fatal: a cold database should not stop the process from serving
  // /api/health, which is exactly how an operator finds out about it.
  void pingDatabase().then((up) => {
    if (!up) logger.warn("Database is not reachable yet — check DATABASE_URL.");
  });

  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    // A second SIGTERM during a slow drain must not re-enter this.
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("Shutting down", { signal });

    // Force-exit guard: if a hung keep-alive socket blocks close(), the
    // platform would SIGKILL us anyway — exiting first keeps the logs clean.
    const forceExit = setTimeout(() => {
      logger.error("Graceful shutdown timed out; forcing exit.");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async (error) => {
      if (error) logger.error("Error while closing the HTTP server", { error: error.message });
      await disconnectPrisma();
      clearTimeout(forceExit);
      process.exit(error ? 1 : 0);
    });
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { reason: String(reason) });
  });

  process.on("uncaughtException", (error: Error) => {
    // The process state is undefined after an uncaught exception; log and let
    // the platform restart us rather than limping on.
    logger.error("Uncaught exception — exiting", { error: error.stack ?? error.message });
    void shutdown("uncaughtException");
  });
}

void main();
