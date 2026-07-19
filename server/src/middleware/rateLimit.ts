import rateLimit, { type Options } from "express-rate-limit";

import { env } from "../config/env";

/**
 * Rate limiting. Public write endpoints are the abuse surface — order spam,
 * coupon brute-forcing, newsletter bombing — so they get tight per-IP budgets
 * while reads stay on a generous global limit.
 *
 * Responses reuse the standard error envelope so clients parse one shape.
 */

function makeLimiter(overrides: Partial<Options>) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    // Tests and local development would otherwise trip limits during seeding.
    skip: () => env.isTest,
    message: { message: "Too many requests. Please slow down.", code: "RATE_LIMITED" },
    ...overrides,
  });
}

/** Baseline for the whole /api surface. */
export const globalLimiter = makeLimiter({});

/** Order creation: generous enough for a family retrying a failed payment. */
export const orderLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  max: 12,
  message: { message: "Too many order attempts. Please try again shortly.", code: "RATE_LIMITED" },
});

/** Coupon validation is the classic enumeration target — keep it tight. */
export const couponLimiter = makeLimiter({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { message: "Too many coupon attempts. Please try again shortly.", code: "RATE_LIMITED" },
});

/** Login: slow enough that credential stuffing is impractical. */
export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true,
  message: { message: "Too many sign-in attempts. Try again in 15 minutes.", code: "RATE_LIMITED" },
});

/** Newsletter / enquiries / reviews — low-value, high-spam endpoints. */
export const publicWriteLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: "Too many submissions from this address.", code: "RATE_LIMITED" },
});

/** Cloudinary uploads are billable, so cap them even for authenticated admins. */
export const uploadLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: { message: "Upload limit reached for this hour.", code: "RATE_LIMITED" },
});
