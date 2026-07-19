import type { OrderStatus } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { addDays, formatDateOnly, toDateOnly } from "../../utils/dates";
import type { DashboardQuery } from "./analytics.schema";

/**
 * Admin dashboard aggregates.
 *
 * Revenue counts DELIVERED orders only. Pending and cancelled rows are not
 * money in the till, and including them would make the headline number drift
 * every time a customer abandons a checkout.
 */

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

interface DailyBucket {
  date: string;
  revenue: number;
  orders: number;
}

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as DashboardQuery;

  const today = toDateOnly(new Date());
  const windowStart = addDays(today, -(query.days - 1));
  // Compare against the immediately preceding window of equal length so the
  // percentage deltas are like-for-like.
  const previousStart = addDays(windowStart, -query.days);

  const [
    revenueAgg,
    previousRevenueAgg,
    statusCounts,
    windowOrders,
    topDishRows,
    customerTotal,
    newCustomers,
    subscriptionStatusCounts,
    subscriptionRevenue,
    newSubscriptions,
    newsletterTotal,
    newsletterWindow,
    openEnquiries,
    lowStockDishes,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "DELIVERED", createdAt: { gte: windowStart } },
      _sum: { total: true, discount: true, gst: true },
      _count: true,
      _avg: { total: true },
    }),
    prisma.order.aggregate({
      where: { status: "DELIVERED", createdAt: { gte: previousStart, lt: windowStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: windowStart } },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true, total: true, status: true },
    }),
    prisma.orderItem.groupBy({
      by: ["menuItemId", "name"],
      where: { order: { status: { not: "CANCELLED" }, createdAt: { gte: windowStart } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: query.topDishes,
    }),
    prisma.customer.count(),
    prisma.customer.count({ where: { createdAt: { gte: windowStart } } }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.subscription.aggregate({
      where: { status: { in: ["ACTIVE", "PAUSED"] } },
      _sum: { amount: true },
    }),
    prisma.subscription.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.newsletterSubscriber.count({ where: { subscribed: true } }),
    prisma.newsletterSubscriber.findMany({
      where: { subscribed: true, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.contactEnquiry.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.menuItem.count({ where: { available: false } }),
  ]);

  // Pre-seed every day in the window so a zero-order day renders as a gap in
  // the chart rather than silently collapsing the x-axis.
  const buckets = new Map<string, DailyBucket>();
  for (let index = 0; index < query.days; index += 1) {
    const key = formatDateOnly(addDays(windowStart, index));
    buckets.set(key, { date: key, revenue: 0, orders: 0 });
  }

  for (const order of windowOrders) {
    const bucket = buckets.get(formatDateOnly(order.createdAt));
    if (!bucket) continue;
    bucket.orders += 1;
    if (order.status === "DELIVERED") bucket.revenue += order.total;
  }

  const subscriberBuckets = new Map<string, number>();
  for (const key of buckets.keys()) subscriberBuckets.set(key, 0);
  for (const record of [...newSubscriptions, ...newsletterWindow]) {
    const key = formatDateOnly(record.createdAt);
    if (subscriberBuckets.has(key)) {
      subscriberBuckets.set(key, (subscriberBuckets.get(key) ?? 0) + 1);
    }
  }

  const revenue = revenueAgg._sum.total ?? 0;
  const previousRevenue = previousRevenueAgg._sum.total ?? 0;
  const percentChange = (current: number, previous: number): number =>
    previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);

  const statusMap = Object.fromEntries(
    ORDER_STATUSES.map((status) => [
      status,
      statusCounts.find((row) => row.status === status)?._count._all ?? 0,
    ]),
  ) as Record<OrderStatus, number>;

  const subscriptionMap = Object.fromEntries(
    subscriptionStatusCounts.map((row) => [row.status, row._count._all]),
  );

  res.json({
    range: {
      from: formatDateOnly(windowStart),
      to: formatDateOnly(today),
      days: query.days,
    },
    revenue: {
      total: revenue,
      previousTotal: previousRevenue,
      changePercent: percentChange(revenue, previousRevenue),
      averageOrderValue: Math.round(revenueAgg._avg.total ?? 0),
      discountGiven: revenueAgg._sum.discount ?? 0,
      gstCollected: revenueAgg._sum.gst ?? 0,
      /** Committed subscription value currently on the books. */
      subscriptionBook: subscriptionRevenue._sum.amount ?? 0,
    },
    orders: {
      total: windowOrders.length,
      delivered: revenueAgg._count,
      previousDelivered: previousRevenueAgg._count,
      changePercent: percentChange(revenueAgg._count, previousRevenueAgg._count),
      byStatus: statusMap,
      // The kitchen's live queue: everything not yet delivered or cancelled.
      inFlight:
        statusMap.PENDING + statusMap.CONFIRMED + statusMap.PREPARING + statusMap.OUT_FOR_DELIVERY,
    },
    topDishes: topDishRows.map((row) => ({
      menuItemId: row.menuItemId,
      name: row.name,
      quantity: row._sum.quantity ?? 0,
      revenue: row._sum.lineTotal ?? 0,
    })),
    customers: {
      total: customerTotal,
      new: newCustomers,
    },
    subscriptions: {
      active: subscriptionMap.ACTIVE ?? 0,
      paused: subscriptionMap.PAUSED ?? 0,
      pending: subscriptionMap.PENDING ?? 0,
      cancelled: subscriptionMap.CANCELLED ?? 0,
      newInWindow: newSubscriptions.length,
    },
    newsletter: {
      total: newsletterTotal,
      newInWindow: newsletterWindow.length,
    },
    operations: {
      openEnquiries,
      unavailableDishes: lowStockDishes,
    },
    series: {
      daily: [...buckets.values()],
      subscriberGrowth: [...subscriberBuckets.entries()].map(([date, count]) => ({ date, count })),
    },
  });
});
