/**
 * Admin order API client.
 *
 * Implements the admin half of `docs/order-flow.md`:
 *
 *   GET   /api/admin/orders          list, filter, search, paginate
 *   GET   /api/admin/orders/:id      full detail with timeline
 *   PATCH /api/admin/orders/:id      advance status / add notes
 *   GET   /api/admin/orders/stream   SSE live feed
 *
 * Two design rules drive the shape of this module:
 *
 *  1. **Never throw into render.** Every call resolves to a discriminated
 *     `AdminResult`. A missing backend, a missing token or a dead network are
 *     ordinary, expected states of this UI — not exceptions — so the orders
 *     screen can honestly say "not connected" instead of blowing up an error
 *     boundary.
 *  2. **Trust nothing from the wire.** The API and this panel ship
 *     independently, so responses are normalised field by field from `unknown`.
 *     A renamed or absent field degrades one cell, it does not crash the table.
 */

import type { StatusTone } from "@/components/admin/status-pill";

/* ========================================================================== */
/*  Status vocabulary                                                         */
/* ========================================================================== */

/** The eight lifecycle states in the contract. */
export const ORDER_STATUSES = [
  "PENDING_CUSTOMER_CONFIRMATION",
  "CONFIRMED",
  "PREPARING",
  "COOKING",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * The happy path, in order. `CANCELLED` is deliberately absent — it is a branch
 * off any non-terminal state, not a step, and putting it in the pipeline would
 * make progress indicators lie.
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

export const TERMINAL_STATUSES: readonly OrderStatus[] = ["DELIVERED", "CANCELLED"];

/**
 * Mirror of the server's state machine.
 *
 * Backward transitions are rejected by the API (revenue reporting counts
 * `DELIVERED` rows and must not be rewritable), so the UI must only ever offer
 * a legal next state — an operator should never be able to click something the
 * server will refuse.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_CUSTOMER_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["COOKING", "CANCELLED"],
  COOKING: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_CUSTOMER_CONFIRMATION: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  COOKING: "Cooking",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/** Short form for chips and dense table cells. */
export const ORDER_STATUS_SHORT_LABEL: Record<OrderStatus, string> = {
  ...ORDER_STATUS_LABEL,
  PENDING_CUSTOMER_CONFIRMATION: "Awaiting",
  OUT_FOR_DELIVERY: "On the way",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  PENDING_CUSTOMER_CONFIRMATION: "progress",
  CONFIRMED: "info",
  PREPARING: "progress",
  COOKING: "progress",
  PACKED: "info",
  OUT_FOR_DELIVERY: "transit",
  DELIVERED: "success",
  CANCELLED: "danger",
};

/** Fixed hexes so charts, pills and the dashboard donut agree on every state. */
export const ORDER_STATUS_HEX: Record<OrderStatus, string> = {
  PENDING_CUSTOMER_CONFIRMATION: "#f59e0b",
  CONFIRMED: "#0ea5e9",
  PREPARING: "#eab308",
  COOKING: "#f97316",
  PACKED: "#38bdf8",
  OUT_FOR_DELIVERY: "#ff6b00",
  DELIVERED: "#22c55e",
  CANCELLED: "#ef4444",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

/** The single forward step, if there is one. Cancellation is offered separately. */
export function nextPipelineStatus(status: OrderStatus): OrderStatus | null {
  const legal = ALLOWED_TRANSITIONS[status];
  return legal.find((candidate) => candidate !== "CANCELLED") ?? null;
}

/* ========================================================================== */
/*  Domain types                                                              */
/* ========================================================================== */

export interface AdminOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  addOnTotal: number;
  /** Snapshotted add-on labels for the kitchen docket. */
  addOns: string[];
  /** Component labels when the line is a custom-built tiffin box. */
  components: string[];
  isCustomTiffin: boolean;
  note?: string;
}

export interface AdminOrderBill {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  packagingFee: number;
  gst: number;
  total: number;
  currency: string;
}

export interface AdminOrderDelivery {
  name: string;
  phone: string;
  /** WhatsApp number when it differs from the delivery phone. */
  whatsappPhone?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  pincode: string;
}

export interface AdminOrderTimelineEntry {
  status: OrderStatus;
  at: string;
  note?: string;
  /** Admin email, or "system"/"customer". */
  actor?: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  channel: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  placedAt: string;
  items: AdminOrderItem[];
  bill: AdminOrderBill;
  delivery: AdminOrderDelivery;
  timeline: AdminOrderTimelineEntry[];
  /** The customer's note to the kitchen. */
  kitchenNote?: string;
  couponCode?: string;
  cancelReason?: string;
  estimatedMinutes?: number;
  /** Telemetry only — the WhatsApp deep link was opened, NOT that Send was pressed. */
  handoffOpenedAt?: string;
  /** True when this row came from the bundled sample data, not the API. */
  isSample?: boolean;
}

export function orderItemCount(order: AdminOrder): number {
  return order.items.reduce((sum, line) => sum + line.quantity, 0);
}

/* ========================================================================== */
/*  Result envelope                                                           */
/* ========================================================================== */

/**
 * Why a call could not produce data.
 *
 * `offline` covers both "no `NEXT_PUBLIC_API_URL`" and "no admin token" — from
 * the panel's point of view they are the same situation: there is nothing live
 * to talk to, show the sample data with an honest banner.
 */
export type AdminFailureReason = "offline" | "unauthorized" | "network" | "server" | "invalid";

export interface AdminFailure {
  ok: false;
  reason: AdminFailureReason;
  message: string;
  status?: number;
}

export type AdminResult<T> = ({ ok: true } & T) | AdminFailure;

function fail(reason: AdminFailureReason, message: string, status?: number): AdminFailure {
  return { ok: false, reason, message, status };
}

/* ========================================================================== */
/*  Configuration & auth                                                      */
/* ========================================================================== */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** Single well-known key. Exported so a future sign-in screen writes the same one. */
export const ADMIN_TOKEN_STORAGE_KEY = "tsk:admin-token";

/** True when a backend base URL is configured at build time. */
export const isAdminApiConfigured = Boolean(API_URL);

/**
 * Bearer token for the admin endpoints.
 *
 * Deliberately tolerant: this runs during render on pages that are also
 * server-rendered, and `localStorage` throws outright in Safari private mode.
 * Either way the answer is "no token", which the caller reads as offline.
 */
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    return token && token.trim().length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  } catch {
    /* Storage unavailable — the session simply stays unauthenticated. */
  }
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Can we actually reach the admin API right now? */
export function isAdminApiReady(): boolean {
  return isAdminApiConfigured && getAdminToken() !== null;
}

/* ========================================================================== */
/*  Normalisation helpers                                                     */
/* ========================================================================== */

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function optionalStr(value: unknown): string | undefined {
  const result = str(value);
  return result.length > 0 ? result : undefined;
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => str(entry)).filter(Boolean) : [];
}

/** Anything date-shaped in, ISO 8601 out. Empty string when unparseable. */
function isoDate(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return fallback;
}

function normalizeItem(raw: unknown, index: number): AdminOrderItem {
  const item = asRecord(raw);
  const quantity = Math.max(1, Math.round(num(item.quantity, 1)));
  const unitPrice = num(item.unitPrice);
  return {
    id: str(item.id, `line-${index}`),
    name: str(item.name, "Kitchen special"),
    quantity,
    unitPrice,
    lineTotal: num(item.lineTotal, unitPrice * quantity),
    addOnTotal: num(item.addOnTotal),
    addOns: strArray(item.addOns ?? item.addOnLabels),
    components: strArray(item.components ?? item.componentLabels),
    isCustomTiffin: item.isCustomTiffin === true,
    note: optionalStr(item.note),
  };
}

function normalizeTimeline(raw: unknown): AdminOrderTimelineEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): AdminOrderTimelineEntry | null => {
      const event = asRecord(entry);
      const status = event.status;
      if (!isOrderStatus(status)) return null;
      return {
        status,
        at: isoDate(event.at ?? event.createdAt),
        note: optionalStr(event.note),
        actor: optionalStr(event.actor),
      };
    })
    .filter((entry): entry is AdminOrderTimelineEntry => entry !== null)
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** Wire shape → `AdminOrder`, tolerating missing and renamed fields. */
export function normalizeOrder(raw: unknown): AdminOrder {
  const order = asRecord(raw);
  const bill = asRecord(order.bill);
  const delivery = asRecord(order.delivery);
  const customer = asRecord(order.customer);

  const items = Array.isArray(order.items) ? order.items.map(normalizeItem) : [];
  const subtotal = num(bill.subtotal, items.reduce((sum, line) => sum + line.lineTotal, 0));
  const discount = num(bill.discount);
  const deliveryFee = num(bill.deliveryFee);
  const packagingFee = num(bill.packagingFee);
  const gst = num(bill.gst);

  const status = isOrderStatus(order.status) ? order.status : "PENDING_CUSTOMER_CONFIRMATION";
  const placedAt = isoDate(order.placedAt ?? order.createdAt, new Date(0).toISOString());

  const timeline = normalizeTimeline(order.timeline);

  return {
    id: str(order.id, str(order.orderNumber)),
    orderNumber: str(order.orderNumber, str(order.id)),
    status,
    channel: str(order.channel, "WHATSAPP"),
    paymentMethod: str(order.paymentMethod, "WHATSAPP"),
    paymentStatus: str(order.paymentStatus, "PENDING"),
    customerName: str(
      order.customerName ?? customer.name ?? delivery.name,
      "Customer",
    ),
    customerPhone: str(order.customerPhone ?? customer.phone ?? delivery.phone),
    placedAt,
    items,
    bill: {
      subtotal,
      discount,
      deliveryFee,
      packagingFee,
      gst,
      total: num(bill.total, subtotal - discount + deliveryFee + packagingFee + gst),
      currency: str(bill.currency, "INR"),
    },
    delivery: {
      name: str(delivery.name, str(order.customerName, "Customer")),
      phone: str(delivery.phone ?? order.customerPhone),
      whatsappPhone: optionalStr(delivery.whatsappPhone ?? delivery.whatsapp),
      line1: str(delivery.line1),
      line2: optionalStr(delivery.line2),
      landmark: optionalStr(delivery.landmark),
      city: str(delivery.city),
      pincode: str(delivery.pincode),
    },
    // An order always has at least the state it was created in, even before the
    // detail endpoint has been hit — otherwise the timeline renders empty and
    // looks broken rather than merely unloaded.
    timeline: timeline.length > 0 ? timeline : [{ status, at: placedAt }],
    kitchenNote: optionalStr(order.kitchenNote ?? order.note),
    couponCode: optionalStr(order.couponCode),
    cancelReason: optionalStr(order.cancelReason),
    estimatedMinutes: typeof order.estimatedMinutes === "number" ? order.estimatedMinutes : undefined,
    handoffOpenedAt: optionalStr(order.handoffOpenedAt ?? order.whatsappOpenedAt),
  };
}

/* ========================================================================== */
/*  Transport                                                                 */
/* ========================================================================== */

interface RequestOptions {
  method?: "GET" | "PATCH" | "POST";
  body?: unknown;
  signal?: AbortSignal;
}

async function adminRequest(
  path: string,
  { method = "GET", body, signal }: RequestOptions = {},
): Promise<AdminResult<{ payload: unknown }>> {
  if (!API_URL) {
    return fail("offline", "No API URL is configured for this deployment.");
  }

  const token = getAdminToken();
  if (!token) {
    return fail("offline", "No admin session token is stored in this browser.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    // Aborts are a caller-initiated cancellation, not a fault — surface them
    // as `invalid` so callers can ignore them rather than showing an error.
    if (error instanceof DOMException && error.name === "AbortError") {
      return fail("invalid", "Request cancelled.");
    }
    return fail("network", "The API could not be reached.");
  }

  if (response.status === 401 || response.status === 403) {
    return fail("unauthorized", "This admin session is not authorised.", response.status);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = str(asRecord(payload).message, `Request failed (${response.status})`);
    return fail(response.status >= 500 ? "server" : "invalid", message, response.status);
  }

  return { ok: true, payload };
}

/* ========================================================================== */
/*  Endpoints                                                                 */
/* ========================================================================== */

export interface ListOrdersParams {
  status?: OrderStatus;
  search?: string;
  /** Inclusive YYYY-MM-DD bounds. */
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}

export interface ListOrdersMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type ListOrdersResult = AdminResult<{ orders: AdminOrder[]; meta: ListOrdersMeta }>;

function listQuery(params: ListOrdersParams): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.from) query.set("from", params.from);
  // `to` is an inclusive calendar day for the operator; send the end of that
  // day so orders placed at 21:00 on the last day are not silently excluded.
  if (params.to) query.set("to", `${params.to}T23:59:59.999Z`);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 50));
  const serialised = query.toString();
  return serialised ? `?${serialised}` : "";
}

export async function listAdminOrders(params: ListOrdersParams = {}): Promise<ListOrdersResult> {
  const result = await adminRequest(`/admin/orders${listQuery(params)}`, { signal: params.signal });
  if (!result.ok) return result;

  const body = asRecord(result.payload);
  const rows = Array.isArray(body.data) ? body.data : [];
  const meta = asRecord(body.meta);
  const limit = num(meta.limit, params.limit ?? 50);
  const total = num(meta.total, rows.length);

  return {
    ok: true,
    orders: rows.map(normalizeOrder),
    meta: {
      page: num(meta.page, params.page ?? 1),
      limit,
      total,
      pages: num(meta.pages, Math.max(1, Math.ceil(total / Math.max(1, limit)))),
    },
  };
}

/**
 * Count of orders in one status without pulling the rows.
 *
 * Asks for a single row and reads `meta.total`; used by the dashboard KPI and
 * the "awaiting confirmation" callout, both of which need a number, not a list.
 */
export async function countAdminOrders(
  status: OrderStatus,
  signal?: AbortSignal,
): Promise<AdminResult<{ count: number }>> {
  const result = await listAdminOrders({ status, limit: 1, signal });
  if (!result.ok) return result;
  return { ok: true, count: result.meta.total };
}

export type GetOrderResult = AdminResult<{ order: AdminOrder }>;

export async function getAdminOrder(id: string, signal?: AbortSignal): Promise<GetOrderResult> {
  const result = await adminRequest(`/admin/orders/${encodeURIComponent(id)}`, { signal });
  if (!result.ok) return result;
  return { ok: true, order: normalizeOrder(asRecord(result.payload).data) };
}

export interface UpdateOrderPayload {
  status?: OrderStatus;
  /** Operator note appended to the status event. */
  note?: string;
  cancelReason?: string;
}

export async function updateAdminOrder(
  id: string,
  payload: UpdateOrderPayload,
): Promise<GetOrderResult> {
  const result = await adminRequest(`/admin/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
  if (!result.ok) return result;
  return { ok: true, order: normalizeOrder(asRecord(result.payload).data) };
}

/* ========================================================================== */
/*  SSE stream                                                                */
/* ========================================================================== */

export interface OrderCreatedEvent {
  orderNumber: string;
  customerName: string;
  total: number;
  itemCount: number;
  placedAt: string;
  /** Present when the server includes it; lets "View order" deep-link by id. */
  id?: string;
}

export interface OrderStatusChangedEvent {
  orderNumber: string;
  from: OrderStatus | null;
  to: OrderStatus;
}

export function parseOrderCreated(data: string): OrderCreatedEvent | null {
  const raw = safeParse(data);
  if (!raw) return null;
  const event = asRecord(raw);
  const orderNumber = str(event.orderNumber);
  if (!orderNumber) return null;
  return {
    orderNumber,
    customerName: str(event.customerName, "Customer"),
    total: num(event.total),
    itemCount: Math.max(0, Math.round(num(event.itemCount))),
    placedAt: isoDate(event.placedAt, new Date().toISOString()),
    id: optionalStr(event.id),
  };
}

export function parseOrderStatusChanged(data: string): OrderStatusChangedEvent | null {
  const raw = safeParse(data);
  if (!raw) return null;
  const event = asRecord(raw);
  const orderNumber = str(event.orderNumber);
  if (!orderNumber || !isOrderStatus(event.to)) return null;
  return {
    orderNumber,
    from: isOrderStatus(event.from) ? event.from : null,
    to: event.to,
  };
}

function safeParse(data: string): unknown {
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return null;
  }
}

/**
 * URL for `GET /api/admin/orders/stream`.
 *
 * `EventSource` cannot send an `Authorization` header — the constructor takes a
 * URL and nothing else — so the bearer token travels as a query parameter, the
 * standard workaround. It is an internal, `noindex` panel over HTTPS and the
 * token is already in this browser's storage, so this widens the exposure only
 * to server access logs. Returns `null` when there is nothing to connect to,
 * which the caller treats as "go straight to polling".
 */
export function adminOrderStreamUrl(): string | null {
  if (!API_URL) return null;
  const token = getAdminToken();
  if (!token) return null;
  return `${API_URL}/admin/orders/stream?token=${encodeURIComponent(token)}`;
}

/* ========================================================================== */
/*  Presentation helpers                                                      */
/* ========================================================================== */

/** Digits only, E.164-ish, so `wa.me` and `tel:` links both work. */
export function dialableNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${dialableNumber(phone)}?text=${encodeURIComponent(message)}`;
}

export function telUrl(phone: string): string {
  return `tel:+${dialableNumber(phone)}`;
}

/** The nudge the kitchen sends when a customer never pressed Send. */
export function confirmationChaseMessage(order: AdminOrder): string {
  return (
    `Hello ${order.customerName}, this is The Secret Kitchen. ` +
    `We have your order ${order.orderNumber} but have not received your confirmation yet. ` +
    `Reply here to confirm and we will start cooking right away.`
  );
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * "13:42" in the viewer's own timezone.
 *
 * The API sends UTC; a kitchen in IST reading UTC clock times would mis-time
 * every ticket by five and a half hours. Callers must only render this once
 * mounted — a server render would use the server's timezone and hydrate wrong.
 */
export function formatOrderClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** "19 Jul, 13:42", local time. Same mounting caveat as `formatOrderClock`. */
export function formatOrderDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${formatOrderClock(iso)}`;
}

/** Local YYYY-MM-DD, for comparing an order against the date-range filter. */
export function orderLocalDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "B-402, Sunrise Residency, Opp. Fortis, Noida 201309" */
export function formatDeliveryAddress(delivery: AdminOrderDelivery): string {
  return [
    delivery.line1,
    delivery.line2,
    delivery.landmark,
    delivery.city,
    delivery.pincode,
  ]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(", ");
}
