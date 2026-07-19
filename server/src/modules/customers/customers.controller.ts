import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginated, toSkipTake } from "../../utils/pagination";
import type { ListCustomersQuery, LookupCustomerInput } from "./customers.schema";

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListCustomersQuery;

  const where: Prisma.CustomerWhereInput = {};
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.hasOrders === "true") where.orders = { some: {} };

  const { skip, take } = toSkipTake(query);
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { _count: { select: { orders: true, subscriptions: true } } },
      orderBy:
        query.sort === "orders" ? { orders: { _count: "desc" } } : { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.customer.count({ where }),
  ]);

  // Lifetime value is an aggregate over delivered orders only — pending and
  // cancelled rows are not revenue and would inflate the number.
  const spendRows = await prisma.order.groupBy({
    by: ["customerId"],
    where: { customerId: { in: customers.map((customer) => customer.id) }, status: "DELIVERED" },
    _sum: { total: true },
    _max: { createdAt: true },
  });
  const spendByCustomer = new Map(spendRows.map((row) => [row.customerId, row]));

  const data = customers.map((customer) => {
    const spend = spendByCustomer.get(customer.id);
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? undefined,
      orderCount: customer._count.orders,
      subscriptionCount: customer._count.subscriptions,
      lifetimeValue: spend?._sum.total ?? 0,
      lastOrderAt: spend?._max.createdAt ?? undefined,
      joinedAt: customer.createdAt,
    };
  });

  // Sorting by spend needs the aggregate, so it is applied after the join.
  if (query.sort === "spend") data.sort((a, b) => b.lifetimeValue - a.lifetimeValue);

  res.json(paginated(data, total, query));
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: String(req.params.id) },
    include: {
      addresses: true,
      orders: { orderBy: { createdAt: "desc" }, take: 25, include: { items: true } },
      subscriptions: { orderBy: { createdAt: "desc" }, include: { plan: true } },
    },
  });
  if (!customer) throw AppError.notFound("That customer does not exist.");

  res.json({
    data: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? undefined,
      joinedAt: customer.createdAt,
      addresses: customer.addresses,
      orders: customer.orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        placedAt: order.createdAt,
        itemCount: order.items.length,
      })),
      subscriptions: customer.subscriptions.map((subscription) => ({
        id: subscription.id,
        code: subscription.code,
        plan: subscription.plan.name,
        status: subscription.status,
        mealsRemaining: subscription.mealsRemaining,
      })),
    },
  });
});

/**
 * Guest self-service lookup. Returns only the order references and totals —
 * enough to track an order without exposing anything a phone number alone
 * should not unlock.
 */
export const lookupByPhone = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body as LookupCustomerInput;

  const customer = await prisma.customer.findUnique({
    where: { phone },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
      subscriptions: { include: { plan: true } },
    },
  });

  if (!customer) {
    res.json({ data: { orders: [], subscriptions: [] } });
    return;
  }

  res.json({
    data: {
      name: customer.name,
      orders: customer.orders.map((order) => ({
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        placedAt: order.createdAt,
      })),
      subscriptions: customer.subscriptions.map((subscription) => ({
        id: subscription.id,
        code: subscription.code,
        plan: subscription.plan.name,
        status: subscription.status.toLowerCase(),
        mealsRemaining: subscription.mealsRemaining,
      })),
    },
  });
});
