/**
 * Order API client and the shared order vocabulary.
 *
 * This module is deliberately separate from `lib/api.ts`. That client fakes a
 * `{ ok: true, offline: true }` success when `NEXT_PUBLIC_API_URL` is unset so
 * newsletter/enquiry flows can be demoed without a backend. Orders must never
 * behave that way: per docs/order-flow.md the database is the only source of
 * truth for whether an order exists, so a "success" the database did not
 * witness is a lost order. Every failure path here throws `OrderError`.
 *
 * The contract this implements lives in docs/order-flow.md — change that first.
 */

/* ==========================================================================
   Status vocabulary
   ========================================================================== */

export type OrderStatus =
  | "PENDING_CUSTOMER_CONFIRMATION"
  | "CONFIRMED"
  | "PREPARING"
  | "COOKING"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type OrderChannel = "WHATSAPP" | "RAZORPAY" | "COD";

/** Customer-facing status names. Short enough to sit on one line at 360px. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_CUSTOMER_CONFIRMATION: "Awaiting your WhatsApp confirmation",
  CONFIRMED: "Confirmed by the kitchen",
  PREPARING: "Prepping ingredients",
  COOKING: "On the fire",
  PACKED: "Packed and sealed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_DESCRIPTION: Record<OrderStatus, string> = {
  PENDING_CUSTOMER_CONFIRMATION:
    "Your order is saved with us. Send the WhatsApp message so the kitchen can pick it up.",
  CONFIRMED: "The kitchen has seen your order and queued it to the pass.",
  PREPARING: "Vegetables chopped, masalas measured, your order is next in line.",
  COOKING: "Cooking fresh right now — nothing is made ahead of time.",
  PACKED: "Sealed in insulated packaging and waiting for a rider.",
  OUT_FOR_DELIVERY: "With the rider and on the way to your address.",
  DELIVERED: "Handed over. We hope it was worth the wait.",
  CANCELLED: "This order was cancelled and will not be delivered.",
};

/**
 * The happy path in order. `CANCELLED` is excluded on purpose: it is a terminal
 * branch off any step rather than a step of its own, so progress UI renders it
 * as a distinct state instead of a position on this line.
 */
export const ORDER_PIPELINE = [
  "PENDING_CUSTOMER_CONFIRMATION",
  "CONFIRMED",
  "PREPARING",
  "COOKING",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const satisfies readonly OrderStatus[];

/** `DELIVERED` and `CANCELLED` are terminal — nothing follows, stop polling. */
export function isTerminalStatus(status: OrderStatus): boolean {
  return status === "DELIVERED" || status === "CANCELLED";
}

/** Index on `ORDER_PIPELINE`, or -1 for `CANCELLED`. */
export function pipelineIndex(status: OrderStatus): number {
  return (ORDER_PIPELINE as readonly OrderStatus[]).indexOf(status);
}

/** `TSK-YYYY-NNNNN`, e.g. TSK-2026-00041. */
export const ORDER_NUMBER_PATTERN = /^TSK-\d{4}-\d{5}$/;

/** Accepts lowercase and stray whitespace; returns the canonical form. */
export function normaliseOrderNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidOrderNumber(value: string): boolean {
  return ORDER_NUMBER_PATTERN.test(normaliseOrderNumber(value));
}

/* ==========================================================================
   Wire types
   ========================================================================== */

export interface OrderItemInput {
  itemId: string;
  quantity: number;
  addOnIds: string[];
  note: string | null;
}

export interface CreateOrderInput {
  channel: OrderChannel;
  customer: {
    name: string;
    phone: string;
    /** Falls back to `phone` server-side when omitted. */
    whatsappPhone?: string | null;
  };
  address: {
    line1: string;
    landmark?: string | null;
    city: string;
    pincode: string;
  };
  items: OrderItemInput[];
  couponCode?: string | null;
  kitchenNote?: string | null;
}

/**
 * The bill as the server computed it. Prices are always recomputed from the
 * catalogue server-side — the client says *what* it wants, never what it costs,
 * so this is the only bill that may be displayed after checkout.
 */
export interface OrderBill {
  subtotal: number;
  discount?: number;
  deliveryFee?: number;
  packagingFee?: number;
  gst?: number;
  total: number;
  currency: string;
}

export interface OrderItemLine {
  itemId: string;
  name: string;
  quantity: number;
  /** Per-unit price snapshotted at order time. */
  unitPrice: number;
  /** Line total including add-ons. */
  total: number;
  addOnLabels?: string[];
  note?: string | null;
}

export interface OrderDelivery {
  line1: string;
  landmark?: string | null;
  city: string;
  pincode: string;
}

/** Extra fields the channel handler returns to complete the handoff. */
export interface WhatsappHandoff {
  channel: "WHATSAPP";
  whatsappUrl: string;
  text: string;
}

export interface GenericHandoff {
  channel: Exclude<OrderChannel, "WHATSAPP">;
  [key: string]: unknown;
}

export type ChannelHandoff = WhatsappHandoff | GenericHandoff;

export function isWhatsappHandoff(handoff: ChannelHandoff | undefined): handoff is WhatsappHandoff {
  return handoff?.channel === "WHATSAPP" && typeof handoff.whatsappUrl === "string";
}

export interface CreatedOrder {
  orderNumber: string;
  status: OrderStatus;
  bill: OrderBill;
  items: OrderItemLine[];
  delivery: OrderDelivery;
  placedAt: string;
  handoff: ChannelHandoff;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  at: string;
  note?: string | null;
}

/**
 * Tracking payload. Everything beyond `orderNumber`/`status`/`timeline` is
 * typed optional: the tracking endpoint is public and may legitimately trim
 * fields, and a missing bill must degrade to a hidden section rather than a
 * crashed page.
 */
export interface TrackedOrder {
  orderNumber: string;
  status: OrderStatus;
  timeline: OrderTimelineEntry[];
  estimatedMinutes?: number | null;
  bill?: OrderBill;
  items?: OrderItemLine[];
  delivery?: OrderDelivery;
  placedAt?: string;
  customer?: { name?: string };
}

/* ==========================================================================
   Errors
   ========================================================================== */

export type OrderErrorCode =
  | "API_NOT_CONFIGURED"
  | "NETWORK"
  | "COUPON_REJECTED"
  | "BELOW_MINIMUM_ORDER"
  | "ITEM_UNAVAILABLE"
  | "VALIDATION"
  | "NOT_FOUND"
  | "SERVER"
  | "UNKNOWN";

/**
 * Every order failure surfaces as one of these. `message` is already written
 * for a customer to read — callers can render it straight into a toast.
 */
export class OrderError extends Error {
  readonly code: OrderErrorCode;
  readonly status?: number;
  /** Whether retrying the identical request could plausibly succeed. */
  readonly retryable: boolean;

  constructor(code: OrderErrorCode, message: string, status?: number, retryable = false) {
    super(message);
    this.name = "OrderError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

const FALLBACK_MESSAGE: Record<OrderErrorCode, string> = {
  API_NOT_CONFIGURED:
    "We can't reach our ordering system right now, so we haven't saved this order. Please call or WhatsApp the kitchen and we'll take it directly.",
  NETWORK:
    "We couldn't reach the kitchen's system, so nothing was saved. Check your connection and try again — your cart is untouched.",
  COUPON_REJECTED:
    "That coupon is no longer valid. Remove or change it in your cart and your total will update.",
  BELOW_MINIMUM_ORDER: "This order is below our minimum. Please add a little more and try again.",
  ITEM_UNAVAILABLE:
    "One of the dishes just sold out. Remove it from your cart and we'll take the rest straight away.",
  VALIDATION: "Some of those details didn't look right. Please check the form and try again.",
  NOT_FOUND: "We couldn't find an order with that number.",
  SERVER: "Something broke on our side and the order was not saved. Please try again in a moment.",
  UNKNOWN: "We couldn't place that order. Nothing has been charged and your cart is intact.",
};

/* ==========================================================================
   Transport
   ========================================================================== */

/**
 * Base URL of the Express API, matching `lib/api.ts` — it already points at the
 * API root, so paths here are written without the `/api` prefix used in the
 * contract document.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ApiEnvelope<T> {
  data: T;
}

interface ApiErrorBody {
  code?: string;
  message?: string;
  error?: { code?: string; message?: string };
}

/** Pull `{ code, message }` out of either error envelope shape the API uses. */
function readErrorBody(body: unknown): { code?: string; message?: string } {
  if (typeof body !== "object" || body === null) return {};
  const shaped = body as ApiErrorBody;
  return {
    code: shaped.error?.code ?? shaped.code,
    message: shaped.error?.message ?? shaped.message,
  };
}

/** Translate an HTTP status + API error code into a customer-readable failure. */
function toOrderError(status: number, body: unknown): OrderError {
  const { code, message } = readErrorBody(body);

  // 409 is reserved by the contract for "a dish went unavailable"; the server
  // names the dish in the message, so prefer that over our generic copy.
  if (status === 409) {
    return new OrderError("ITEM_UNAVAILABLE", message ?? FALLBACK_MESSAGE.ITEM_UNAVAILABLE, status);
  }

  switch (code) {
    case "COUPON_REJECTED":
      return new OrderError(
        "COUPON_REJECTED",
        message ?? FALLBACK_MESSAGE.COUPON_REJECTED,
        status,
      );
    case "BELOW_MINIMUM_ORDER":
      return new OrderError(
        "BELOW_MINIMUM_ORDER",
        message ?? FALLBACK_MESSAGE.BELOW_MINIMUM_ORDER,
        status,
      );
    case "ITEM_UNAVAILABLE":
      return new OrderError("ITEM_UNAVAILABLE", message ?? FALLBACK_MESSAGE.ITEM_UNAVAILABLE, status);
    default:
      break;
  }

  if (status === 404) return new OrderError("NOT_FOUND", message ?? FALLBACK_MESSAGE.NOT_FOUND, status);
  if (status === 422 || status === 400) {
    return new OrderError("VALIDATION", message ?? FALLBACK_MESSAGE.VALIDATION, status);
  }
  if (status >= 500) {
    return new OrderError("SERVER", message ?? FALLBACK_MESSAGE.SERVER, status, true);
  }
  return new OrderError("UNKNOWN", message ?? FALLBACK_MESSAGE.UNKNOWN, status);
}

async function orderRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    // Never fabricate a success here — see the module comment.
    throw new OrderError("API_NOT_CONFIGURED", FALLBACK_MESSAGE.API_NOT_CONFIGURED);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    // fetch only rejects on transport failure, which means the request may or
    // may not have reached the server. We report it as "not saved" because the
    // customer can safely retry — a duplicate is recoverable, a lost order is not.
    throw new OrderError("NETWORK", FALLBACK_MESSAGE.NETWORK, undefined, true);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw toOrderError(response.status, body);
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new OrderError("SERVER", FALLBACK_MESSAGE.SERVER, response.status, true);
  }
  return payload.data;
}

/* ==========================================================================
   Endpoints
   ========================================================================== */

/**
 * `POST /api/orders`. Resolves only once the API has confirmed the row was
 * committed; every other outcome rejects with an `OrderError`.
 */
export function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  return orderRequest<CreatedOrder>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** `GET /api/orders/track/:orderNumber`. The order number is the credential. */
export function trackOrder(orderNumber: string): Promise<TrackedOrder> {
  const normalised = normaliseOrderNumber(orderNumber);
  if (!ORDER_NUMBER_PATTERN.test(normalised)) {
    throw new OrderError("NOT_FOUND", "That doesn't look like one of our order numbers.");
  }
  return orderRequest<TrackedOrder>(`/orders/track/${encodeURIComponent(normalised)}`);
}

/**
 * `POST /api/orders/:orderNumber/handoff-opened` — telemetry only.
 *
 * Deliberately swallows every failure: it records that the deep link was
 * opened, never that the customer pressed Send, and a telemetry outage must not
 * put an error in front of someone who has already ordered successfully.
 */
export function reportHandoffOpened(orderNumber: string): void {
  if (!API_URL) return;
  const normalised = normaliseOrderNumber(orderNumber);
  if (!ORDER_NUMBER_PATTERN.test(normalised)) return;

  void fetch(`${API_URL}/orders/${encodeURIComponent(normalised)}/handoff-opened`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Survives the page being unloaded by the WhatsApp navigation.
    keepalive: true,
  }).catch(() => {
    /* telemetry is best-effort by design */
  });
}

/* ==========================================================================
   Checkout → confirmation handoff
   ========================================================================== */

export interface StoredHandoff {
  orderNumber: string;
  whatsappUrl: string;
  text: string;
  status: OrderStatus;
  placedAt: string;
  bill: OrderBill;
  items: OrderItemLine[];
  delivery: OrderDelivery;
}

/**
 * The confirmation page needs the WhatsApp URL on its very first paint so it
 * can attempt the auto-open without waiting on a round trip. sessionStorage
 * (not localStorage) because it is scoped to this tab and this session — a
 * stale handoff must never resurface days later.
 *
 * Keyed by order number so two tabs checking out concurrently cannot collide.
 */
const HANDOFF_KEY_PREFIX = "tsk:order-handoff:";

export function handoffStorageKey(orderNumber: string): string {
  return `${HANDOFF_KEY_PREFIX}${normaliseOrderNumber(orderNumber)}`;
}

export function saveHandoff(order: CreatedOrder): void {
  if (typeof window === "undefined" || !isWhatsappHandoff(order.handoff)) return;
  const payload: StoredHandoff = {
    orderNumber: order.orderNumber,
    whatsappUrl: order.handoff.whatsappUrl,
    text: order.handoff.text,
    status: order.status,
    placedAt: order.placedAt,
    bill: order.bill,
    items: order.items,
    delivery: order.delivery,
  };
  try {
    window.sessionStorage.setItem(handoffStorageKey(order.orderNumber), JSON.stringify(payload));
  } catch {
    // Private-browsing quota failures are non-fatal: the confirmation page
    // falls back to `trackOrder` and rebuilds the link from the API.
  }
}

export function readHandoff(orderNumber: string): StoredHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(handoffStorageKey(orderNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredHandoff;
    return typeof parsed?.whatsappUrl === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearHandoff(orderNumber: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(handoffStorageKey(orderNumber));
  } catch {
    /* ignore */
  }
}

/**
 * Records that the confirmation page already tried to open WhatsApp for this
 * order. The attempt must happen once per *order*, not once per mount — a
 * refresh should not fire another popup at someone who has already sent (or
 * deliberately dismissed) the message. The handoff snapshot itself is kept so a
 * refresh can still render the summary offline.
 */
const OPEN_ATTEMPT_KEY_PREFIX = "tsk:order-opened:";

export function wasHandoffAttempted(orderNumber: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(
      `${OPEN_ATTEMPT_KEY_PREFIX}${normaliseOrderNumber(orderNumber)}`,
    ) !== null;
  } catch {
    // Storage unavailable: treat as "already attempted" so we never loop popups.
    return true;
  }
}

export function markHandoffAttempted(orderNumber: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${OPEN_ATTEMPT_KEY_PREFIX}${normaliseOrderNumber(orderNumber)}`,
      "1",
    );
  } catch {
    /* ignore */
  }
}

/**
 * Rebuilds the WhatsApp message when the sessionStorage handoff is gone (a
 * refresh in a new tab, a shared link, a cleared session). Intentionally
 * mirrors the server's message shape rather than inventing a new one.
 */
export function buildTrackedWhatsappText(order: TrackedOrder): string {
  const lines = [
    `Hello The Secret Kitchen, I'd like to confirm my order ${order.orderNumber}.`,
  ];
  if (order.items?.length) {
    lines.push("", ...order.items.map((item) => `• ${item.quantity} × ${item.name}`));
  }
  if (order.bill) lines.push("", `Total: ₹${order.bill.total}`);
  if (order.delivery) {
    lines.push(
      "",
      `Deliver to: ${[order.delivery.line1, order.delivery.landmark, order.delivery.city, order.delivery.pincode]
        .filter(Boolean)
        .join(", ")}`,
    );
  }
  return lines.join("\n");
}
