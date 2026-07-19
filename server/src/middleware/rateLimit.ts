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
export const globalLimiter = makeLimiter({
  /*
   * Authenticated admin traffic is exempt from the public budget.
   *
   * The panel is request-heavy by nature — a dashboard alone fans out to
   * analytics, orders and menu, and every page change repeats that. Walking
   * nine admin pages exhausted the 100-request public allowance and the UI
   * started rendering 429s, which looks to the operator like the app is broken.
   *
   * This is not a hole: the routes behind it still require a valid admin JWT,
   * and the public surface (orders, coupons, reviews, tracking) keeps its own
   * tighter per-route limiters below.
   */
  skip: (req) => env.isTest || Boolean(req.headers.authorization?.startsWith("Bearer ")),
});

/** Order creation: generous enough for a family retrying a failed payment. */
export const orderLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  max: 12,
  message: { message: "Too many order attempts. Please try again shortly.", code: "RATE_LIMITED" },
});

/**
 * Order tracking. The order number is the only credential and the sequence is
 * deliberately guessable (the kitchen reads it aloud), so this limiter is what
 * stops that predictability becoming an enumeration vector.
 *
 * The budget still has to cover legitimate use: the tracking page polls every
 * 20s while an order is live, so a customer watching one order through a
 * 45-minute delivery makes ~135 requests. 240 per 15 minutes leaves ample room
 * for that plus a couple of family members watching the same order, while
 * making a scrape of the sequence impractical.
 */
export const trackingLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 240,
  message: {
    message: "Too many tracking requests. Please try again shortly.",
    code: "RATE_LIMITED",
  },
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
