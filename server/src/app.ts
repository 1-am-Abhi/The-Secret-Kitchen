import compression from "compression";
import cors, { type CorsOptions } from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { globalLimiter } from "./middleware/rateLimit";
import { requestLogger } from "./middleware/requestLogger";
import { apiRouter } from "./routes";

/**
 * Express wiring. Kept separate from `index.ts` so the app can be imported by
 * tests or a serverless adapter without binding a port.
 */

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Same-origin, curl and server-to-server requests send no Origin header.
    if (!origin) return callback(null, true);
    if (env.corsOrigins.includes("*") || env.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86_400,
};

export function createApp(): Express {
  const app = express();

  // Render and Railway both terminate TLS at a proxy; without this the rate
  // limiter would see the proxy's IP for every request and throttle everyone
  // as if they were one client.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      // The API serves JSON only; CSP belongs on the Next.js app that renders
      // HTML. crossOriginResourcePolicy is relaxed so the storefront on a
      // different origin can read responses.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: env.BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.BODY_LIMIT }));
  app.use(requestLogger);

  app.use("/api", globalLimiter, apiRouter);

  // Root probe, handy when someone opens the service URL in a browser.
  app.get("/", (_req, res) => {
    res.json({ service: "The Secret Kitchen API", docs: "/api/health" });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
