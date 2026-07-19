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

/**
 * Does `origin` match one allow-list entry?
 *
 * Entries are exact origins ("https://example.com") except for a leading `*.`
 * wildcard in the host ("https://*.vercel.app"), which matches any single-level
 * subdomain. That wildcard exists for Vercel preview deployments, whose
 * hostname changes on every push and so cannot be enumerated ahead of time.
 *
 * The scheme is always compared exactly, and `*.` never matches a bare apex or
 * a dot inside the label, so "https://*.vercel.app" allows
 * "https://tsk-git-main-abhi.vercel.app" but not "https://vercel.app.evil.com".
 */
function originMatches(entry: string, origin: string): boolean {
  if (entry === origin) return true;
  if (!entry.includes("*")) return false;

  const [scheme, host] = entry.split("://");
  if (!scheme || !host?.startsWith("*.")) return false;

  const suffix = host.slice(1); // ".vercel.app"
  const candidate = origin.startsWith(`${scheme}://`) ? origin.slice(scheme.length + 3) : null;
  if (!candidate?.endsWith(suffix)) return false;

  // Exactly one label may stand in for the wildcard.
  const label = candidate.slice(0, -suffix.length);
  return label.length > 0 && !label.includes(".");
}

export function isOriginAllowed(origin: string): boolean {
  return env.corsOrigins.some(
    (entry) => entry === "*" || originMatches(entry, origin),
  );
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Same-origin, curl and server-to-server requests send no Origin header.
    if (!origin) return callback(null, true);

    /*
     * A disallowed origin is answered WITHOUT the allow-origin header, which is
     * what actually blocks the browser. It is not an error.
     *
     * This used to `callback(new Error(...))`, which threw into the error
     * handler and produced a 500 — including on preflight. That was misleading
     * in two directions: the logs filled with 500s that were really just an
     * origin typo, and the browser reported the generic "No
     * 'Access-Control-Allow-Origin' header" for what was a server crash. The
     * security outcome is identical either way; only the diagnosis changes.
     */
    return callback(null, isOriginAllowed(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86_400,
  // 204 with no body. Some older XHR stacks choke on 200-with-body preflights.
  optionsSuccessStatus: 204,
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
