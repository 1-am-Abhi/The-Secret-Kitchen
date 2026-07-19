import type { Order, OrderItem, Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { commerce } from "../../config/commerce";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { generateOrderNumber, withUniqueReference } from "../../utils/orderNumber";
import { paginated, toSkipTake } from "../../utils/pagination";
import { calculateBill, evaluateCoupon } from "../../utils/pricing";
import type {
  CancelOrderInput,
  CreateOrderInput,
  ListOrdersQuery,
  UpdateOrderInput,
} from "./orders.schema";
import { assertTransition, resolveAddress, resolveOrderLines, upsertCustomer } from "./orders.service";

type OrderWithItems = Order & { items: OrderItem[] };

function mapOrder(order: OrderWithItems): Record<string, unknown> {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    couponCode: order.couponCode ?? undefined,
    bill: {
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryFee: order.deliveryFee,
      packagingFee: order.packagingFee,
      gst: order.gst,
      total: order.total,
      currency: commerce.currency,
    },
    delivery: {
      name: order.deliveryName,
      phone: order.deliveryPhone,
      line1: order.deliveryLine1,
      line2: order.deliveryLine2 ?? undefined,
      landmark: order.deliveryLandmark ?? undefined,
      city: order.deliveryCity,
      pincode: order.deliveryPincode,
    },
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      addOnTotal: item.addOnTotal,
      addOns: item.addOnLabels,
      components: item.componentLabels,
      isCustomTiffin: item.isCustomTiffin,
      note: item.note ?? undefined,
      lineTotal: item.lineTotal,
    })),
    note: order.note ?? undefined,
    scheduledFor: order.scheduledFor ?? undefined,
    placedAt: order.createdAt,
    confirmedAt: order.confirmedAt ?? undefined,
    deliveredAt: order.deliveredAt ?? undefined,
    cancelledAt: order.cancelledAt ?? undefined,
    cancelReason: order.cancelReason ?? undefined,
    estimatedMinutes: commerce.averagePrepMinutes,
  };
}

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateOrderInput;

  // 1. Price every line from the catalogue, not from the request body.
  const lines = await resolveOrderLines(body.items);

  // 2. Re-evaluate the coupon server-side against the recomputed subtotal.
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const offer = body.couponCode
    ? await prisma.offer.findUnique({ where: { code: body.couponCode.trim().toUpperCase() } })
    : null;
  const coupon = body.couponCode ? evaluateCoupon(offer, subtotal, "ORDER") : null;

  // A coupon that no longer applies (expired between page load and checkout,
  // or minimum no longer met) is rejected rather than silently dropped —
  // otherwise the customer pays more than the total they just agreed to.
  if (body.couponCode && coupon && !coupon.ok) {
    throw AppError.unprocessable(coupon.message, { code: "COUPON_REJECTED" });
  }

  const bill = calculateBill(lines, coupon);

  if (bill.subtotal < commerce.minimumOrder) {
    throw AppError.unprocessable(
      `Minimum order value is ₹${commerce.minimumOrder}. Add ₹${commerce.minimumOrder - bill.subtotal} more.`,
      { code: "BELOW_MINIMUM_ORDER" },
    );
  }

  const order = await prisma.$transaction(async (tx) => {
    const customer = await upsertCustomer(tx, body.customer);
    const addressId = await resolveAddress(tx, customer.id, body.address);

    const created = await withUniqueReference(generateOrderNumber, (orderNumber) =>
      tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          addressId,
          deliveryName: body.customer.name,
          deliveryPhone: body.customer.phone,
          deliveryLine1: body.address.line1,
          deliveryLine2: body.address.line2 ?? null,
          deliveryLandmark: body.address.landmark ?? null,
          deliveryCity: body.address.city,
          deliveryPincode: body.address.pincode,
          paymentMethod: body.paymentMethod,
          // COD is settled at the door; anything else is assumed captured by the
          // payment gateway before this endpoint is called.
          paymentStatus: body.paymentMethod === "COD" ? "PENDING" : "PAID",
          paymentRef: body.paymentRef ?? null,
          couponCode: coupon?.ok ? coupon.offer?.code ?? null : null,
          offerId: coupon?.ok ? coupon.offer?.id ?? null : null,
          subtotal: bill.subtotal,
          discount: bill.discount,
          deliveryFee: bill.deliveryFee,
          packagingFee: bill.packagingFee,
          gst: bill.gst,
          total: bill.total,
          note: body.note ?? null,
          scheduledFor: body.scheduledFor ?? null,
          items: {
            create: lines.map((line) => ({
              menuItemId: line.menuItemId,
              name: line.name,
              slug: line.slug,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              addOnTotal: line.addOnTotal,
              addOnLabels: line.addOnLabels,
              componentLabels: line.componentLabels,
              isCustomTiffin: line.isCustomTiffin,
              note: line.note,
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: { items: true },
      }),
    );

    if (coupon?.ok && coupon.offer) {
      await tx.offer.update({
        where: { id: coupon.offer.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    return created;
  });

  res.status(201).json({ data: mapOrder(order), message: "Order placed." });
});

/** Public order tracking — the order number is the only credential required. */
export const getOrderByNumber = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = String(req.params.orderNumber).toUpperCase();

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order) throw AppError.notFound(`No order found with reference ${orderNumber}.`);

  res.json({ data: mapOrder(order) });
});

export const cancelOrderByNumber = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = String(req.params.orderNumber).toUpperCase();
  const body = req.body as CancelOrderInput;

  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true } });
  if (!order) throw AppError.notFound(`No order found with reference ${orderNumber}.`);

  // The phone on the order acts as the shared secret for guest cancellation.
  if (order.deliveryPhone !== body.phone) {
    throw AppError.forbidden("That phone number does not match this order.");
  }

  // Once the food is on a bike the kitchen has already borne the cost.
  if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
    throw AppError.conflict("This order is already being prepared and can no longer be cancelled.");
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: body.reason ?? "Cancelled by customer",
      paymentStatus: order.paymentStatus === "PAID" ? "REFUNDED" : order.paymentStatus,
    },
    include: { items: true },
  });

  res.json({ data: mapOrder(updated), message: "Order cancelled." });
});

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListOrdersQuery;

  const where: Prisma.OrderWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }
  if (query.search) {
    where.OR = [
      { orderNumber: { contains: query.search, mode: "insensitive" } },
      { deliveryPhone: { contains: query.search } },
      { deliveryName: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.OrderOrderByWithRelationInput =
    query.sort === "oldest"
      ? { createdAt: "asc" }
      : query.sort === "total-desc"
        ? { total: "desc" }
        : { createdAt: "desc" };

  const { skip, take } = toSkipTake(query);
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, include: { items: true }, orderBy, skip, take }),
    prisma.order.count({ where }),
  ]);

  res.json(paginated(orders.map(mapOrder), total, query));
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: String(req.params.id) },
    include: { items: true, customer: true, address: true },
  });
  if (!order) throw AppError.notFound("That order does not exist.");

  res.json({
    data: {
      ...mapOrder(order),
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email ?? undefined,
      },
    },
  });
});

export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const body = req.body as UpdateOrderInput;

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("That order does not exist.");

  const data: Prisma.OrderUpdateInput = {};

  if (body.status) {
    assertTransition(existing.status, body.status);
    data.status = body.status;

    // Status timestamps are derived, never client-supplied, so the analytics
    // endpoint can trust them as the source of truth for fulfilment timing.
    const now = new Date();
    if (body.status === "CONFIRMED" && !existing.confirmedAt) data.confirmedAt = now;
    if (body.status === "DELIVERED") {
      data.deliveredAt = now;
      // A delivered COD order has, by definition, been paid at the door.
      if (existing.paymentMethod === "COD" && existing.paymentStatus === "PENDING") {
        data.paymentStatus = "PAID";
      }
    }
    if (body.status === "CANCELLED") {
      data.cancelledAt = now;
      if (existing.paymentStatus === "PAID") data.paymentStatus = "REFUNDED";
    }
  }

  if (body.paymentStatus) data.paymentStatus = body.paymentStatus;
  if (body.paymentRef !== undefined) data.paymentRef = body.paymentRef;
  if (body.cancelReason !== undefined) data.cancelReason = body.cancelReason;
  if (body.note !== undefined) data.note = body.note;

  const order = await prisma.order.update({ where: { id }, data, include: { items: true } });
  res.json({ data: mapOrder(order) });
});
