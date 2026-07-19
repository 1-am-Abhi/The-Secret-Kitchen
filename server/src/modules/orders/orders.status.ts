import type { OrderStatus, Prisma } from "@prisma/client";

import { AppError } from "../../utils/AppError";
import { orderEvents } from "./orders.events";
import type { OrderWithItems } from "./orders.types";

/**
 * Order status machine.
 *
 * Transitions are explicit rather than "any status to any status" because a
 * backward move would corrupt reporting: revenue counts DELIVERED rows and
 * fulfilment timing is derived from the transition timestamps. Both terminal
 * states are dead ends by design.
 */

/** The happy path, in order. Drives progress UI on both admin and tracking. */
export const ORDER_PIPELINE: readonly OrderStatus[] = [
  "PENDING_CUSTOMER_CONFIRMATION",
  "CONFIRMED",
  "PREPARING",
  "COOKING",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export const TERMINAL_STATUSES: readonly OrderStatus[] = ["DELIVERED", "CANCELLED"] as const;

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  // Online payment pending — the gateway callback moves it on.
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],

  // The customer may not have pressed Send in WhatsApp. Only a human at the
  // kitchen can move this forward; nothing automatic may do it.
  PENDING_CUSTOMER_CONFIRMATION: ["CONFIRMED", "CANCELLED"],

  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["COOKING", "CANCELLED"],
  COOKING: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  // Once food is on a bike, cancelling still has to be possible (wrong address,
  // customer unreachable) but the kitchen has already borne the cost.
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],

  DELIVERED: [],
  CANCELLED: [],
};

export function allowedNextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) return;
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    // The legal alternatives ride along in `details` so the admin UI can
    // re-render its controls from the rejection instead of guessing.
    throw new AppError(`An order cannot move from ${from} to ${to}.`, 409, "ILLEGAL_TRANSITION", {
      from,
      to,
      allowed: allowedNextStatuses(from),
    });
  }
}

/**
 * Derived timestamp columns for a transition.
 *
 * These are computed here, never accepted from a client, so analytics can
 * treat them as trustworthy fulfilment timing.
 */
export function timestampsForStatus(
  status: OrderStatus,
  existing: { confirmedAt: Date | null; paymentMethod: string; paymentStatus: string },
  now = new Date(),
): Prisma.OrderUpdateInput {
  const data: Prisma.OrderUpdateInput = {};

  if (status === "CONFIRMED" && !existing.confirmedAt) data.confirmedAt = now;

  if (status === "DELIVERED") {
    data.deliveredAt = now;
    // A delivered cash order has, by definition, been paid at the door.
    if (existing.paymentMethod === "COD" && existing.paymentStatus === "PENDING") {
      data.paymentStatus = "PAID";
    }
  }

  if (status === "CANCELLED") {
    data.cancelledAt = now;
    if (existing.paymentStatus === "PAID") data.paymentStatus = "REFUNDED";
  }

  return data;
}

/**
 * Applies a status change: validates the transition, updates the order, and
 * appends to the append-only history in ONE transaction.
 *
 * Every status change in the system goes through here — the admin endpoint, and
 * later the Razorpay webhook — so the timeline can never miss a transition.
 */
export async function applyStatusChange(
  tx: Prisma.TransactionClient,
  order: { id: string; status: OrderStatus; confirmedAt: Date | null; paymentMethod: string; paymentStatus: string },
  to: OrderStatus,
  options: { actor?: string; note?: string | null } = {},
): Promise<OrderWithItems> {
  assertTransition(order.status, to);

  const now = new Date();
  const data: Prisma.OrderUpdateInput = {
    status: to,
    ...timestampsForStatus(to, order, now),
  };
  if (to === "CANCELLED" && options.note) data.cancelReason = options.note;

  const updated = await tx.order.update({
    where: { id: order.id },
    data,
    include: { items: true },
  });

  await tx.orderStatusEvent.create({
    data: {
      orderId: order.id,
      status: to,
      note: options.note ?? null,
      actor: options.actor ?? "system",
    },
  });

  return updated;
}

/**
 * Publishes a status change to live listeners.
 *
 * Deliberately called by the controller AFTER the transaction commits, never
 * from inside it: a listener must never be told about a change that then rolls
 * back.
 */
export function publishStatusChange(
  order: OrderWithItems,
  from: OrderStatus,
  to: OrderStatus,
): void {
  orderEvents.emitStatusChanged({
    orderNumber: order.orderNumber,
    customerName: order.deliveryName,
    from,
    to,
    at: new Date().toISOString(),
  });
}
