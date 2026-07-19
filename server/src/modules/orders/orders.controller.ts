import type { OrderItem, OrderStatusEvent, Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { commerce } from "../../config/commerce";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { nextOrderNumber } from "../../utils/orderNumber";
import { paginated, toSkipTake } from "../../utils/pagination";
import { calculateBill, evaluateCoupon } from "../../utils/pricing";
import { getChannelHandler, type ChannelHandoff } from "./channels";
import { orderEvents } from "./orders.events";
import type {
  CancelOrderInput,
  CreateOrderInput,
  ListOrdersQuery,
  UpdateOrderInput,
} from "./orders.schema";
import { resolveAddress, resolveOrderLines, upsertCustomer } from "./orders.service";
import {
  allowedNextStatuses,
  applyStatusChange,
  isTerminal,
  ORDER_PIPELINE,
} from "./orders.status";
import type { OrderWithItems, OrderWithTimeline } from "./orders.types";

function mapItems(items: OrderItem[]): Record<string, unknown>[] {
  return items.map((item) => ({
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
  }));
}

function mapOrder(order: OrderWithItems): Record<string, unknown> {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    channel: order.channel,
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
      whatsapp: order.deliveryWhatsapp ?? undefined,
      line1: order.deliveryLine1,
      line2: order.deliveryLine2 ?? undefined,
      landmark: order.deliveryLandmark ?? undefined,
      city: order.deliveryCity,
      pincode: order.deliveryPincode,
    },
    items: mapItems(order.items),
    note: order.note ?? undefined,
    scheduledFor: order.scheduledFor ?? undefined,
    placedAt: order.createdAt,
    confirmedAt: order.confirmedAt ?? undefined,
    deliveredAt: order.deliveredAt ?? undefined,
    cancelledAt: order.cancelledAt ?? undefined,
    cancelReason: order.cancelReason ?? undefined,
    handoffOpenedAt: order.handoffOpenedAt ?? undefined,
    estimatedMinutes: commerce.averagePrepMinutes,
    isTerminal: isTerminal(order.status),
    allowedNextStatuses: allowedNextStatuses(order.status),
  };
}

function mapTimeline(events: OrderStatusEvent[]): Record<string, unknown>[] {
  return events.map((event) => ({
    status: event.status,
    at: event.createdAt,
    note: event.note ?? undefined,
    actor: event.actor,
  }));
}

/* -------------------------------------------------------------------------- */
/* Create                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Creates an order.
 *
 * The whole design rests on one ordering guarantee: the row is committed BEFORE
 * any handoff (WhatsApp link, payment session) is produced. If we built the
 * handoff first and the insert then failed, we would have sent a customer to
 * WhatsApp quoting an order ID that does not exist. See docs/order-flow.md.
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateOrderInput;
  const channel = getChannelHandler(body.channel);

  // 1. Price every line from the catalogue, never from the request body.
  const lines = await resolveOrderLines(body.items);

  // 2. Re-evaluate the coupon server-side against the recomputed subtotal.
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const offer = body.couponCode
    ? await prisma.offer.findUnique({ where: { code: body.couponCode.trim().toUpperCase() } })
    : null;
  const coupon = body.couponCode ? evaluateCoupon(offer, subtotal, "ORDER") : null;

  // A coupon that no longer applies (expired between page load and checkout, or
  // minimum no longer met) is rejected rather than silently dropped — otherwise
  // the customer pays more than the total they just agreed to.
  if (body.couponCode && coupon && !coupon.ok) {
    throw new AppError(coupon.message, 422, "COUPON_REJECTED");
  }

  const bill = calculateBill(lines, coupon);

  if (bill.subtotal < commerce.minimumOrder) {
    throw new AppError(
      `Minimum order value is ₹${commerce.minimumOrder}. Add ₹${commerce.minimumOrder - bill.subtotal} more.`,
      422,
      "BELOW_MINIMUM_ORDER",
      { minimumOrder: commerce.minimumOrder, shortfall: commerce.minimumOrder - bill.subtotal },
    );
  }

  const kitchenNote = body.kitchenNote ?? body.note ?? null;
  const initialStatus = channel.initialStatus();

  // 3. Persist. Order number allocation, the order, its lines and the opening
  //    timeline entry all share one transaction — a half-written order is
  //    worse than no order.
  const order = await prisma.$transaction(async (tx) => {
    const customer = await upsertCustomer(tx, body.customer);
    const addressId = await resolveAddress(tx, customer.id, body.address);
    const orderNumber = await nextOrderNumber(tx);

    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        addressId,
        deliveryName: body.customer.name,
        deliveryPhone: body.customer.phone,
        deliveryWhatsapp: body.customer.whatsappPhone ?? null,
        deliveryLine1: body.address.line1,
        deliveryLine2: body.address.line2 ?? null,
        deliveryLandmark: body.address.landmark ?? null,
        deliveryCity: body.address.city,
        deliveryPincode: body.address.pincode,
        status: initialStatus,
        channel: channel.channel,
        paymentMethod: body.paymentMethod ?? channel.paymentMethod(),
        paymentStatus: channel.initialPaymentStatus(),
        paymentRef: body.paymentRef ?? null,
        couponCode: coupon?.ok ? (coupon.offer?.code ?? null) : null,
        offerId: coupon?.ok ? (coupon.offer?.id ?? null) : null,
        subtotal: bill.subtotal,
        discount: bill.discount,
        deliveryFee: bill.deliveryFee,
        packagingFee: bill.packagingFee,
        gst: bill.gst,
        total: bill.total,
        note: kitchenNote,
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
        events: {
          create: {
            status: initialStatus,
            note: channel.initialEventNote(),
            actor: "customer",
          },
        },
      },
      include: { items: true },
    });

    if (coupon?.ok && coupon.offer) {
      await tx.offer.update({
        where: { id: coupon.offer.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    return created;
  });

  // 4. Only now — with the row durably committed — build the handoff.
  const handoff: ChannelHandoff = await channel.handoff(order);

  // 5. Notify the kitchen. After the commit, so an admin is never alerted about
  //    an order that rolled back.
  orderEvents.emitCreated({
    orderNumber: order.orderNumber,
    customerName: order.deliveryName,
    customerPhone: order.deliveryPhone,
    total: order.total,
    itemCount: order.items.length,
    channel: order.channel,
    status: order.status,
    placedAt: order.createdAt.toISOString(),
  });

  res.status(201).json({
    data: { ...mapOrder(order), handoff },
    message: "Order created.",
  });
});

/* -------------------------------------------------------------------------- */
/* Public tracking                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Public order tracking. The order number is the only credential.
 *
 * That is a deliberate trade-off: requiring a login for a guest cloud-kitchen
 * order would be worse for customers than the marginal risk here. The response
 * is limited to what the customer themselves submitted, and the sequential
 * number is paired with nothing that enables bulk harvesting — the endpoint is
 * rate limited, and it exposes no email or saved-address data.
 */
export const trackOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = String(req.params.orderNumber).trim().toUpperCase();

  const order = (await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  })) as OrderWithTimeline | null;

  if (!order) throw AppError.notFound(`No order found with reference ${orderNumber}.`);

  res.json({
    data: {
      ...mapOrder(order),
      timeline: mapTimeline(order.events),
      pipeline: ORDER_PIPELINE,
    },
  });
});

/**
 * Records that the customer's browser opened the WhatsApp deep link.
 *
 * Telemetry only. It must NEVER advance the status: the browser cannot observe
 * whether Send was actually pressed, and pretending otherwise would put orders
 * into the kitchen queue that nobody ever confirmed. It does let the admin see
 * "link opened but never confirmed", which is a useful signal for a follow-up
 * call.
 */
export const markHandoffOpened = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = String(req.params.orderNumber).trim().toUpperCase();

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, handoffOpenedAt: true },
  });
  if (!order) throw AppError.notFound(`No order found with reference ${orderNumber}.`);

  // First open wins — re-opening the link is not new information.
  if (!order.handoffOpenedAt) {
    await prisma.order.update({
      where: { id: order.id },
      data: { handoffOpenedAt: new Date() },
    });
  }

  res.json({ data: { ok: true } });
});

export const cancelOrderByNumber = asyncHandler(async (req: Request, res: Response) => {
  const orderNumber = String(req.params.orderNumber).trim().toUpperCase();
  const body = req.body as CancelOrderInput;

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) throw AppError.notFound(`No order found with reference ${orderNumber}.`);

  // The phone on the order acts as the shared secret for guest cancellation.
  if (order.deliveryPhone !== body.phone) {
    throw AppError.forbidden("That phone number does not match this order.");
  }

  // Once the food is being cooked the kitchen has already borne the cost.
  const cancellable = ["PENDING_PAYMENT", "PENDING_CUSTOMER_CONFIRMATION", "CONFIRMED"];
  if (!cancellable.includes(order.status)) {
    throw AppError.conflict("This order is already being prepared and can no longer be cancelled.");
  }

  const updated = await prisma.$transaction((tx) =>
    applyStatusChange(tx, order, "CANCELLED", {
      actor: "customer",
      note: body.reason ?? "Cancelled by customer",
    }),
  );

  orderEvents.emitStatusChanged({
    orderNumber: updated.orderNumber,
    customerName: updated.deliveryName,
    from: order.status,
    to: "CANCELLED",
    at: new Date().toISOString(),
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
  const [orders, total, statusGroups] = await Promise.all([
    prisma.order.findMany({ where, include: { items: true }, orderBy, skip, take }),
    prisma.order.count({ where }),
    // Counts per status power the filter tabs. Computed against the *unfiltered*
    // set so the tab badges do not change as you switch between them.
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries(
    statusGroups.map((group) => [group.status, group._count._all]),
  );

  res.json({
    ...paginated(orders.map(mapOrder), total, query),
    meta: { counts },
  });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: String(req.params.id) },
    include: {
      items: true,
      customer: true,
      address: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) throw AppError.notFound("That order does not exist.");

  res.json({
    data: {
      ...mapOrder(order),
      timeline: mapTimeline(order.events),
      pipeline: ORDER_PIPELINE,
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
  const actor = req.admin?.email ?? "admin";

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("That order does not exist.");

  const result = await prisma.$transaction(async (tx) => {
    let order: OrderWithItems | null = null;

    // Status changes go through the shared machine so the append-only timeline
    // can never miss a transition, wherever it was triggered from.
    if (body.status && body.status !== existing.status) {
      order = await applyStatusChange(tx, existing, body.status, {
        actor,
        note: body.statusNote ?? body.cancelReason ?? null,
      });
    }

    const data: Prisma.OrderUpdateInput = {};
    if (body.paymentStatus) data.paymentStatus = body.paymentStatus;
    if (body.paymentRef !== undefined) data.paymentRef = body.paymentRef;
    if (body.cancelReason !== undefined) data.cancelReason = body.cancelReason;
    if (body.note !== undefined) data.note = body.note;

    if (Object.keys(data).length > 0) {
      order = await tx.order.update({ where: { id }, data, include: { items: true } });
    }

    return (
      order ?? (await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } }))
    );
  });

  // Emitted after commit so a listener is never told about a rolled-back change.
  if (body.status && body.status !== existing.status) {
    orderEvents.emitStatusChanged({
      orderNumber: result.orderNumber,
      customerName: result.deliveryName,
      from: existing.status,
      to: body.status,
      at: new Date().toISOString(),
    });
  }

  res.json({ data: mapOrder(result) });
});
