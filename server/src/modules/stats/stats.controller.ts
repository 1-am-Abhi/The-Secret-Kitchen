import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";

/**
 * Public storefront statistics.
 *
 * Every figure here is derived from the operational tables — there is no
 * configured, seeded or "launch" value anywhere in this file. A brand new
 * kitchen therefore returns zeroes, and the storefront is expected to render
 * them as zeroes (or hide the block) rather than substitute anything.
 *
 * Money is deliberately absent: revenue is a private business metric and lives
 * behind `requireAdmin` on /api/analytics/dashboard.
 */
export const publicStats = asyncHandler(async (_req: Request, res: Response) => {
  const [mealsAgg, ordersDelivered, customersServed, activeSubscribers, reviewAgg] =
    await Promise.all([
      // "Meals served" is the number of dishes that actually reached a door,
      // not the number of orders — a four-item order fed four people.
      prisma.orderItem.aggregate({
        where: { order: { status: "DELIVERED" } },
        _sum: { quantity: true },
      }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      // Distinct customers with at least one delivered order — people we have
      // actually fed, not everyone who ever filled in a checkout form.
      prisma.order
        .findMany({
          where: { status: "DELIVERED" },
          distinct: ["customerId"],
          select: { customerId: true },
        })
        .then((rows) => rows.length),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.review.aggregate({
        where: { published: true },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

  const reviewCount = reviewAgg._count;

  res.json({
    data: {
      mealsServed: mealsAgg._sum.quantity ?? 0,
      ordersDelivered,
      customersServed,
      activeSubscribers,
      reviewCount,
      // `null`, not 0 — an unrated kitchen has no average, and a 0.0 star
      // rating on screen would be a fabrication in the other direction.
      averageRating: reviewCount > 0 ? Math.round((reviewAgg._avg.rating ?? 0) * 10) / 10 : null,
    },
  });
});
