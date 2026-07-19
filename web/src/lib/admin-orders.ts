/**
 * Admin API client.
 *
 * The single typed seam between the admin panel and the Express API. It covers
 * the admin half of `docs/order-flow.md`:
 *
 *   GET   /api/admin/orders          list, filter, search, paginate
 *   GET   /api/admin/orders/:id      full detail with timeline
 *   PATCH /api/admin/orders/:id      advance status / add notes
 *   GET   /api/admin/orders/stream   SSE live feed
 *
 * and every other resource the panel renders — the analytics dashboard,
 * customers, tiffin subscriptions, the menu catalogue, offers, the gallery and
 * the daily specials. Screens never call `fetch` themselves.
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
 * to talk to, so the screen says exactly that and shows no figures at all.
 */
export type AdminFailureReason = "offline" | "unauthorized" | "network" | "server" | "invalid";

export interface AdminFailure {
  ok: false;
  reason: AdminFailureReason;
  message: string;
  status?: number;
  /**
   * Per-field messages from the server's own validator, keyed by field path.
   * Present only when the API rejected a body it could describe precisely —
   * forms render these inline instead of repeating a generic banner.
   */
  fieldErrors?: Record<string, string[]>;
}

export type AdminResult<T> = ({ ok: true } & T) | AdminFailure;

function fail(
  reason: AdminFailureReason,
  message: string,
  status?: number,
  fieldErrors?: Record<string, string[]>,
): AdminFailure {
  return { ok: false, reason, message, status, fieldErrors };
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

/** Where an expired session is sent back to. */
export const ADMIN_LOGIN_PATH = "/admin/login";

/**
 * Discard a rejected session and send the operator to sign in again.
 *
 * A JWT that expires mid-shift otherwise leaves every panel showing an empty
 * "not connected" state that a reload will not fix, so any 401/403 from the
 * admin API ends the session here rather than being absorbed silently.
 *
 * Uses `window.location` rather than the router: this module is imported by
 * plain functions as well as components, and a hard navigation also guarantees
 * no stale authenticated data survives in memory. Callers still get their
 * normal `unauthorized` result — the redirect is not instantaneous and nothing
 * downstream should have to special-case it.
 */
export function forceAdminReauth(): void {
  clearAdminToken();
  if (typeof window === "undefined") return;

  const { pathname, search } = window.location;
  // Already on the sign-in screen: nothing to bounce, and re-navigating would
  // wipe the error message the operator is reading.
  if (pathname === ADMIN_LOGIN_PATH) return;

  const next = `${pathname}${search}`;
  window.location.replace(`${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(next)}`);
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
  method?: "GET" | "PATCH" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /**
   * `optional` marks an endpoint that is readable without a session (the public
   * menu, gallery and offers listings the panel also renders). The token is
   * still sent when one exists, so admin-only fields come back if the server
   * chooses to include them.
   */
  auth?: "required" | "optional";
}

/**
 * Pull per-field messages out of an error body.
 *
 * The API reports a rejected body two ways: request-level validation sends
 * `details: [{ path, message }]`, while the site-content controller re-validates
 * the block itself and sends a flattened `details: { fieldErrors }`. Both mean
 * the same thing to a form, so both are read into one map. Anything else yields
 * `undefined` and the caller falls back to the top-level message.
 */
function readFieldErrors(payload: unknown): Record<string, string[]> | undefined {
  const details = asRecord(payload).details;
  const collected: Record<string, string[]> = {};

  const add = (field: string, message: string) => {
    const key = field.length > 0 ? field : "_";
    collected[key] = [...(collected[key] ?? []), message];
  };

  if (Array.isArray(details)) {
    for (const entry of details) {
      if (typeof entry !== "object" || entry === null) continue;
      const issue = asRecord(entry);
      const message = str(issue.message);
      if (message) add(str(issue.path), message);
    }
  } else {
    const fieldErrors = asRecord(asRecord(details).fieldErrors);
    for (const [field, messages] of Object.entries(fieldErrors)) {
      for (const message of strArray(messages)) add(field, message);
    }
    for (const message of strArray(asRecord(details).formErrors)) add("_", message);
  }

  return Object.keys(collected).length > 0 ? collected : undefined;
}

async function adminRequest(
  path: string,
  { method = "GET", body, signal, auth = "required" }: RequestOptions = {},
): Promise<AdminResult<{ payload: unknown }>> {
  if (!API_URL) {
    return fail("offline", "No API URL is configured for this deployment.");
  }

  const token = getAdminToken();
  if (!token && auth === "required") {
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
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    // Expired or revoked token: clear it and bounce, so the panel does not sit
    // there rendering an empty dashboard for a session that no longer exists.
    forceAdminReauth();
    return fail("unauthorized", "This admin session is not authorised.", response.status);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = str(asRecord(payload).message, `Request failed (${response.status})`);
    return fail(
      response.status >= 500 ? "server" : "invalid",
      message,
      response.status,
      readFieldErrors(payload),
    );
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

/* ========================================================================== */
/*  Analytics dashboard                                                       */
/* ========================================================================== */

/**
 * `GET /api/analytics/dashboard` reports one state the order lifecycle does not
 * model — an order whose payment has not settled — so the dashboard's status
 * vocabulary is the lifecycle plus that extra bucket.
 */
export const DASHBOARD_STATUS_KEYS = ["PENDING_PAYMENT", ...ORDER_STATUSES] as const;

export type DashboardStatusKey = (typeof DASHBOARD_STATUS_KEYS)[number];

export const DASHBOARD_STATUS_LABEL: Record<DashboardStatusKey, string> = {
  PENDING_PAYMENT: "Pending payment",
  ...ORDER_STATUS_LABEL,
};

export const DASHBOARD_STATUS_HEX: Record<DashboardStatusKey, string> = {
  PENDING_PAYMENT: "#9ca3af",
  ...ORDER_STATUS_HEX,
};

export interface DashboardSeriesPoint {
  /** YYYY-MM-DD. */
  date: string;
  revenue: number;
  orders: number;
}

export interface DashboardTopDish {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface AnalyticsDashboard {
  range: { from: string; to: string; days: number };
  revenue: {
    total: number;
    previousTotal: number;
    changePercent: number;
    averageOrderValue: number;
    discountGiven: number;
    gstCollected: number;
    subscriptionBook: number;
  };
  orders: {
    total: number;
    delivered: number;
    previousDelivered: number;
    changePercent: number;
    byStatus: Record<DashboardStatusKey, number>;
    inFlight: number;
    awaitingConfirmation: number;
  };
  topDishes: DashboardTopDish[];
  customers: { total: number; new: number };
  subscriptions: {
    active: number;
    paused: number;
    pending: number;
    cancelled: number;
    newInWindow: number;
  };
  newsletter: { total: number; newInWindow: number };
  operations: { openEnquiries: number; unavailableDishes: number };
  series: { daily: DashboardSeriesPoint[] };
}

function normalizeDashboard(raw: unknown): AnalyticsDashboard {
  const root = asRecord(raw);
  const range = asRecord(root.range);
  const revenue = asRecord(root.revenue);
  const orders = asRecord(root.orders);
  const byStatus = asRecord(orders.byStatus);
  const customers = asRecord(root.customers);
  const subscriptions = asRecord(root.subscriptions);
  const newsletter = asRecord(root.newsletter);
  const operations = asRecord(root.operations);
  const series = asRecord(root.series);

  const counts = {} as Record<DashboardStatusKey, number>;
  for (const key of DASHBOARD_STATUS_KEYS) counts[key] = num(byStatus[key]);

  return {
    range: {
      from: str(range.from),
      to: str(range.to),
      days: num(range.days, 30),
    },
    revenue: {
      total: num(revenue.total),
      previousTotal: num(revenue.previousTotal),
      changePercent: num(revenue.changePercent),
      averageOrderValue: num(revenue.averageOrderValue),
      discountGiven: num(revenue.discountGiven),
      gstCollected: num(revenue.gstCollected),
      subscriptionBook: num(revenue.subscriptionBook),
    },
    orders: {
      total: num(orders.total),
      delivered: num(orders.delivered),
      previousDelivered: num(orders.previousDelivered),
      changePercent: num(orders.changePercent),
      byStatus: counts,
      inFlight: num(orders.inFlight),
      awaitingConfirmation: num(orders.awaitingConfirmation),
    },
    topDishes: (Array.isArray(root.topDishes) ? root.topDishes : []).map((entry) => {
      const dish = asRecord(entry);
      return {
        menuItemId: str(dish.menuItemId),
        name: str(dish.name, "Kitchen special"),
        quantity: num(dish.quantity),
        revenue: num(dish.revenue),
      };
    }),
    customers: { total: num(customers.total), new: num(customers.new) },
    subscriptions: {
      active: num(subscriptions.active),
      paused: num(subscriptions.paused),
      pending: num(subscriptions.pending),
      cancelled: num(subscriptions.cancelled),
      newInWindow: num(subscriptions.newInWindow),
    },
    newsletter: { total: num(newsletter.total), newInWindow: num(newsletter.newInWindow) },
    operations: {
      openEnquiries: num(operations.openEnquiries),
      unavailableDishes: num(operations.unavailableDishes),
    },
    series: {
      daily: (Array.isArray(series.daily) ? series.daily : []).map((entry) => {
        const point = asRecord(entry);
        return {
          date: str(point.date).slice(0, 10),
          revenue: num(point.revenue),
          orders: num(point.orders),
        };
      }),
    },
  };
}

export interface DashboardParams {
  /** Trailing window in days. The API accepts 7–365 and defaults to 30. */
  days?: number;
  /** How many rows `topDishes` should contain (1–25). */
  topDishes?: number;
  signal?: AbortSignal;
}

/**
 * The panel's single source of aggregate truth.
 *
 * Note the response is top level, not wrapped in `data` like the list
 * endpoints — the normaliser reads straight off the root object.
 */
export async function getAnalyticsDashboard(
  params: DashboardParams = {},
): Promise<AdminResult<{ data: AnalyticsDashboard }>> {
  const query = new URLSearchParams();
  if (params.days) query.set("days", String(params.days));
  if (params.topDishes) query.set("topDishes", String(params.topDishes));
  const suffix = query.toString() ? `?${query}` : "";

  const result = await adminRequest(`/analytics/dashboard${suffix}`, { signal: params.signal });
  if (!result.ok) return result;
  return { ok: true, data: normalizeDashboard(result.payload) };
}

/* ========================================================================== */
/*  Pagination envelope shared by the list endpoints                          */
/* ========================================================================== */

export interface AdminPage<T> {
  items: T[];
  meta: ListOrdersMeta;
}

function readMeta(payload: unknown, fallbackCount: number, limit: number): ListOrdersMeta {
  const meta = asRecord(asRecord(payload).meta);
  const total = num(meta.total, fallbackCount);
  const perPage = num(meta.limit, limit);
  return {
    page: num(meta.page, 1),
    limit: perPage,
    total,
    pages: num(meta.pages, Math.max(1, Math.ceil(total / Math.max(1, perPage)))),
  };
}

function rows(payload: unknown): unknown[] {
  const data = asRecord(payload).data;
  return Array.isArray(data) ? data : [];
}

/* ========================================================================== */
/*  Customers                                                                 */
/* ========================================================================== */

export interface AdminCustomerSummary {
  id: string;
  name: string;
  phone: string;
  email?: string;
  orderCount: number;
  subscriptionCount: number;
  /** Sum of delivered orders only — pending rows are not revenue. */
  lifetimeValue: number;
  lastOrderAt?: string;
  joinedAt: string;
}

function normalizeCustomer(raw: unknown): AdminCustomerSummary {
  const customer = asRecord(raw);
  return {
    id: str(customer.id),
    name: str(customer.name, "Customer"),
    phone: str(customer.phone),
    email: optionalStr(customer.email),
    orderCount: Math.max(0, Math.round(num(customer.orderCount))),
    subscriptionCount: Math.max(0, Math.round(num(customer.subscriptionCount))),
    lifetimeValue: num(customer.lifetimeValue),
    lastOrderAt: customer.lastOrderAt ? isoDate(customer.lastOrderAt) || undefined : undefined,
    joinedAt: isoDate(customer.joinedAt),
  };
}

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "newest" | "orders" | "spend";
  signal?: AbortSignal;
}

export async function listAdminCustomers(
  params: ListCustomersParams = {},
): Promise<AdminResult<{ data: AdminPage<AdminCustomerSummary> }>> {
  const limit = params.limit ?? 100;
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(limit));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.sort) query.set("sort", params.sort);

  const result = await adminRequest(`/customers?${query}`, { signal: params.signal });
  if (!result.ok) return result;

  const items = rows(result.payload).map(normalizeCustomer);
  return { ok: true, data: { items, meta: readMeta(result.payload, items.length, limit) } };
}

export interface AdminCustomerAddress {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export interface AdminCustomerOrderRef {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  placedAt: string;
  itemCount: number;
}

export interface AdminCustomerSubscriptionRef {
  id: string;
  code: string;
  plan: string;
  status: string;
  mealsRemaining: number;
}

export interface AdminCustomerDetail {
  id: string;
  name: string;
  phone: string;
  email?: string;
  joinedAt: string;
  addresses: AdminCustomerAddress[];
  orders: AdminCustomerOrderRef[];
  subscriptions: AdminCustomerSubscriptionRef[];
}

export async function getAdminCustomer(
  id: string,
  signal?: AbortSignal,
): Promise<AdminResult<{ data: AdminCustomerDetail }>> {
  const result = await adminRequest(`/customers/${encodeURIComponent(id)}`, { signal });
  if (!result.ok) return result;

  const customer = asRecord(asRecord(result.payload).data);
  const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

  return {
    ok: true,
    data: {
      id: str(customer.id),
      name: str(customer.name, "Customer"),
      phone: str(customer.phone),
      email: optionalStr(customer.email),
      joinedAt: isoDate(customer.joinedAt),
      addresses: list(customer.addresses).map((raw): AdminCustomerAddress => {
        const address = asRecord(raw);
        return {
          id: str(address.id),
          label: str(address.label, "Home"),
          line1: str(address.line1),
          line2: optionalStr(address.line2),
          landmark: optionalStr(address.landmark),
          city: str(address.city),
          pincode: str(address.pincode),
          isDefault: address.isDefault === true,
        };
      }),
      orders: list(customer.orders).map((raw): AdminCustomerOrderRef => {
        const order = asRecord(raw);
        return {
          id: str(order.id),
          orderNumber: str(order.orderNumber, str(order.id)),
          status: isOrderStatus(order.status) ? order.status : "PENDING_CUSTOMER_CONFIRMATION",
          total: num(order.total),
          placedAt: isoDate(order.placedAt),
          itemCount: Math.max(0, Math.round(num(order.itemCount))),
        };
      }),
      subscriptions: list(customer.subscriptions).map((raw): AdminCustomerSubscriptionRef => {
        const subscription = asRecord(raw);
        return {
          id: str(subscription.id),
          code: str(subscription.code),
          plan: str(subscription.plan),
          status: str(subscription.status, "pending").toLowerCase(),
          mealsRemaining: Math.max(0, Math.round(num(subscription.mealsRemaining))),
        };
      }),
    },
  };
}

/* ========================================================================== */
/*  Tiffin subscriptions                                                      */
/* ========================================================================== */

export const SUBSCRIPTION_STATUSES = ["pending", "active", "paused", "cancelled"] as const;

export type AdminSubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export function isSubscriptionStatus(value: unknown): value is AdminSubscriptionStatus {
  return (
    typeof value === "string" &&
    (SUBSCRIPTION_STATUSES as readonly string[]).includes(value.toLowerCase())
  );
}

export const SUBSCRIPTION_STATUS_LABEL: Record<AdminSubscriptionStatus, string> = {
  pending: "Pending",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
};

export const SUBSCRIPTION_STATUS_TONE: Record<AdminSubscriptionStatus, StatusTone> = {
  pending: "progress",
  active: "success",
  paused: "info",
  cancelled: "danger",
};

export type AdminPlanTier = "student" | "regular" | "premium";
export type AdminBillingCycle = "weekly" | "monthly";
export type AdminMealSlot = "lunch" | "dinner" | "both";

export interface AdminSubscription {
  id: string;
  code: string;
  planTier: AdminPlanTier;
  planName: string;
  cycle: AdminBillingCycle;
  slot: AdminMealSlot;
  status: AdminSubscriptionStatus;
  startDate: string;
  nextDeliveryDate: string;
  endDate?: string;
  mealsTotal: number;
  mealsRemaining: number;
  pricePerMeal: number;
  /** What the customer was billed for this cycle, net of discount. */
  amount: number;
  discount: number;
  couponCode?: string;
  paymentStatus: string;
  addressLabel: string;
  skippedDates: string[];
  customerName: string;
  customerPhone: string;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const candidate = str(value).toLowerCase();
  return (allowed as readonly string[]).includes(candidate) ? (candidate as T) : fallback;
}

function normalizeSubscription(raw: unknown): AdminSubscription {
  const subscription = asRecord(raw);
  const customer = asRecord(subscription.customer);

  return {
    id: str(subscription.id),
    code: str(subscription.code, str(subscription.id)),
    planTier: oneOf<AdminPlanTier>(
      subscription.planTier,
      ["student", "regular", "premium"],
      "regular",
    ),
    planName: str(subscription.planName, "Tiffin plan"),
    cycle: oneOf<AdminBillingCycle>(subscription.cycle, ["weekly", "monthly"], "monthly"),
    slot: oneOf<AdminMealSlot>(subscription.slot, ["lunch", "dinner", "both"], "lunch"),
    status: oneOf<AdminSubscriptionStatus>(subscription.status, SUBSCRIPTION_STATUSES, "pending"),
    startDate: str(subscription.startDate).slice(0, 10),
    nextDeliveryDate: str(subscription.nextDeliveryDate).slice(0, 10),
    endDate: optionalStr(subscription.endDate)?.slice(0, 10),
    mealsTotal: Math.max(0, Math.round(num(subscription.mealsTotal))),
    mealsRemaining: Math.max(0, Math.round(num(subscription.mealsRemaining))),
    pricePerMeal: num(subscription.pricePerMeal),
    amount: num(subscription.amount),
    discount: num(subscription.discount),
    couponCode: optionalStr(subscription.couponCode),
    paymentStatus: str(subscription.paymentStatus, "PENDING"),
    addressLabel: str(subscription.addressLabel),
    skippedDates: strArray(subscription.skippedDates),
    customerName: str(customer.name, "Customer"),
    customerPhone: str(customer.phone),
  };
}

export interface ListSubscriptionsParams {
  page?: number;
  limit?: number;
  status?: AdminSubscriptionStatus;
  planTier?: AdminPlanTier;
  search?: string;
  signal?: AbortSignal;
}

export async function listAdminSubscriptions(
  params: ListSubscriptionsParams = {},
): Promise<AdminResult<{ data: AdminPage<AdminSubscription> }>> {
  const limit = params.limit ?? 100;
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(limit));
  if (params.status) query.set("status", params.status);
  if (params.planTier) query.set("planTier", params.planTier);
  if (params.search?.trim()) query.set("search", params.search.trim());

  const result = await adminRequest(`/subscriptions/admin?${query}`, { signal: params.signal });
  if (!result.ok) return result;

  const items = rows(result.payload).map(normalizeSubscription);
  return { ok: true, data: { items, meta: readMeta(result.payload, items.length, limit) } };
}

export interface SubscriptionLifecyclePayload {
  /** Days to pause for; the API defaults it when omitted. */
  days?: number;
  reason?: string;
}

async function subscriptionLifecycle(
  id: string,
  action: "pause" | "resume" | "cancel",
  payload: SubscriptionLifecyclePayload = {},
): Promise<AdminResult<{ data: AdminSubscription }>> {
  const result = await adminRequest(`/subscriptions/${encodeURIComponent(id)}/${action}`, {
    method: "PATCH",
    body: payload,
  });
  if (!result.ok) return result;
  return { ok: true, data: normalizeSubscription(asRecord(result.payload).data) };
}

export function pauseAdminSubscription(id: string, payload?: SubscriptionLifecyclePayload) {
  return subscriptionLifecycle(id, "pause", payload);
}

export function resumeAdminSubscription(id: string) {
  return subscriptionLifecycle(id, "resume");
}

export function cancelAdminSubscription(id: string, reason?: string) {
  return subscriptionLifecycle(id, "cancel", reason ? { reason } : {});
}

/** Bank a meal by skipping one scheduled delivery date (YYYY-MM-DD). */
export async function skipAdminSubscriptionDate(
  id: string,
  date: string,
): Promise<AdminResult<{ data: AdminSubscription }>> {
  const result = await adminRequest(`/subscriptions/${encodeURIComponent(id)}/skip`, {
    method: "PATCH",
    body: { date },
  });
  if (!result.ok) return result;
  return { ok: true, data: normalizeSubscription(asRecord(result.payload).data) };
}

/* ========================================================================== */
/*  Menu catalogue (read-only here — the menu screen owns writes)             */
/* ========================================================================== */

export interface AdminMenuCategory {
  id: string;
  slug: string;
  name: string;
  order: number;
  itemCount: number;
}

export interface AdminMenuItem {
  id: string;
  code: string;
  slug: string;
  name: string;
  description: string;
  /** Category slug, matching `AdminMenuCategory.slug`. */
  category: string;
  categoryId: string;
  price: number;
  imageId: string;
  isVeg: boolean;
  rating: number;
  available: boolean;
}

function normalizeMenuItem(raw: unknown): AdminMenuItem {
  const item = asRecord(raw);
  return {
    id: str(item.id),
    code: str(item.code),
    slug: str(item.slug),
    name: str(item.name, "Kitchen special"),
    description: str(item.description),
    category: str(item.category),
    categoryId: str(item.categoryId),
    price: num(item.price),
    imageId: str(item.imageId, "hero-1"),
    isVeg: item.isVeg !== false,
    rating: num(item.rating),
    available: item.available !== false,
  };
}

export async function listAdminMenuCategories(
  signal?: AbortSignal,
): Promise<AdminResult<{ data: AdminMenuCategory[] }>> {
  const result = await adminRequest("/menu/categories", { signal, auth: "optional" });
  if (!result.ok) return result;

  return {
    ok: true,
    data: rows(result.payload).map((raw): AdminMenuCategory => {
      const category = asRecord(raw);
      return {
        id: str(category.id),
        slug: str(category.slug),
        name: str(category.name, str(category.slug)),
        order: num(category.order),
        itemCount: Math.max(0, Math.round(num(category.itemCount))),
      };
    }),
  };
}

export async function listAdminMenuItems(
  signal?: AbortSignal,
): Promise<AdminResult<{ data: AdminMenuItem[] }>> {
  // The catalogue is 58 rows today and the endpoint caps `limit` at 100; one
  // page is deliberate, and the count assertion lives in the caller's UI copy.
  const result = await adminRequest("/menu?limit=100", { signal, auth: "optional" });
  if (!result.ok) return result;

  return { ok: true, data: rows(result.payload).map(normalizeMenuItem) };
}

/* ========================================================================== */
/*  Offers & coupons                                                          */
/* ========================================================================== */

export type AdminOfferDiscountType = "percentage" | "flat" | "freebie";
export type AdminOfferScope = "order" | "subscription";

export interface AdminOffer {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: AdminOfferDiscountType;
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  /** YYYY-MM-DD. */
  validUntil: string;
  terms: string[];
  imageId: string;
  featured: boolean;
  appliesTo: AdminOfferScope;
  /**
   * Derived, not returned: the API's public projection omits `active`, so a
   * coupon counts as active when the unfiltered listing (which the server
   * restricts to `active && not expired`) also contains it.
   */
  active: boolean;
}

function normalizeOffer(raw: unknown, active: boolean): AdminOffer {
  const offer = asRecord(raw);
  const maxDiscount = offer.maxDiscount;
  return {
    id: str(offer.id),
    code: str(offer.code),
    title: str(offer.title),
    description: str(offer.description),
    discountType: oneOf<AdminOfferDiscountType>(
      offer.discountType,
      ["percentage", "flat", "freebie"],
      "percentage",
    ),
    discountValue: num(offer.discountValue),
    minOrder: num(offer.minOrder),
    maxDiscount: typeof maxDiscount === "number" ? maxDiscount : undefined,
    validUntil: str(offer.validUntil).slice(0, 10),
    terms: strArray(offer.terms),
    imageId: str(offer.imageId, "offer-1"),
    featured: offer.featured === true,
    appliesTo: oneOf<AdminOfferScope>(offer.appliesTo, ["order", "subscription"], "order"),
    active,
  };
}

/**
 * Every coupon, with an honest `active` flag.
 *
 * Two calls, because the API exposes activation only as a filter: the second
 * listing is the server's own definition of "live right now", so membership in
 * it is the flag rather than a guess made in the browser.
 */
export async function listAdminOffers(
  signal?: AbortSignal,
): Promise<AdminResult<{ data: AdminOffer[] }>> {
  const [all, live] = await Promise.all([
    adminRequest("/offers?includeInactive=true", { signal, auth: "optional" }),
    adminRequest("/offers", { signal, auth: "optional" }),
  ]);
  if (!all.ok) return all;
  if (!live.ok) return live;

  const liveIds = new Set(rows(live.payload).map((raw) => str(asRecord(raw).id)));

  return {
    ok: true,
    data: rows(all.payload).map((raw) => normalizeOffer(raw, liveIds.has(str(asRecord(raw).id)))),
  };
}

export interface OfferInput {
  code: string;
  title: string;
  description: string;
  discountType: AdminOfferDiscountType;
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  validUntil: string;
  terms: string[];
  imageId: string;
  featured: boolean;
  appliesTo: AdminOfferScope;
  active: boolean;
}

export async function createAdminOffer(
  input: OfferInput,
): Promise<AdminResult<{ data: AdminOffer }>> {
  const result = await adminRequest("/offers", { method: "POST", body: input });
  if (!result.ok) return result;
  return { ok: true, data: normalizeOffer(asRecord(result.payload).data, input.active) };
}

export async function updateAdminOffer(
  id: string,
  patch: Partial<OfferInput>,
): Promise<AdminResult<{ data: AdminOffer }>> {
  const result = await adminRequest(`/offers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
  if (!result.ok) return result;
  return { ok: true, data: normalizeOffer(asRecord(result.payload).data, patch.active !== false) };
}

export async function deleteAdminOffer(id: string): Promise<AdminResult<{ data: null }>> {
  const result = await adminRequest(`/offers/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!result.ok) return result;
  return { ok: true, data: null };
}

/* ========================================================================== */
/*  Gallery                                                                   */
/* ========================================================================== */

export const GALLERY_CATEGORIES = [
  "dishes",
  "kitchen",
  "team",
  "packaging",
  "moments",
] as const;

export type AdminGalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export const GALLERY_ASPECTS = ["portrait", "landscape", "square"] as const;

export type AdminGalleryAspect = (typeof GALLERY_ASPECTS)[number];

export interface AdminGalleryImage {
  id: string;
  imageId: string;
  imageUrl?: string;
  caption: string;
  category: AdminGalleryCategory;
  aspect: AdminGalleryAspect;
  sortOrder: number;
}

function normalizeGalleryImage(raw: unknown): AdminGalleryImage {
  const image = asRecord(raw);
  return {
    id: str(image.id),
    imageId: str(image.imageId, "hero-1"),
    imageUrl: optionalStr(image.imageUrl),
    caption: str(image.caption),
    category: oneOf<AdminGalleryCategory>(image.category, GALLERY_CATEGORIES, "dishes"),
    aspect: oneOf<AdminGalleryAspect>(image.aspect, GALLERY_ASPECTS, "square"),
    sortOrder: num(image.sortOrder),
  };
}

export async function listAdminGallery(
  signal?: AbortSignal,
): Promise<AdminResult<{ data: AdminGalleryImage[] }>> {
  const result = await adminRequest("/gallery?limit=100&includeUnpublished=true", {
    signal,
    auth: "optional",
  });
  if (!result.ok) return result;
  return { ok: true, data: rows(result.payload).map(normalizeGalleryImage) };
}

export interface GalleryImagePatch {
  caption?: string;
  category?: AdminGalleryCategory;
  aspect?: AdminGalleryAspect;
  sortOrder?: number;
  published?: boolean;
}

export async function updateAdminGalleryImage(
  id: string,
  patch: GalleryImagePatch,
): Promise<AdminResult<{ data: AdminGalleryImage }>> {
  const result = await adminRequest(`/gallery/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
  if (!result.ok) return result;
  return { ok: true, data: normalizeGalleryImage(asRecord(result.payload).data) };
}

export interface GalleryUploadMeta {
  caption: string;
  category: AdminGalleryCategory;
  aspect: AdminGalleryAspect;
  sortOrder?: number;
}

/**
 * `POST /api/gallery/upload` — multipart, not JSON.
 *
 * This is the one call that cannot go through `adminRequest`: the body is a
 * `FormData` and the browser must be left to set its own `Content-Type` with
 * the multipart boundary. Everything else — the token, the failure vocabulary —
 * matches the rest of the client so callers handle it identically.
 */
export async function uploadAdminGalleryImage(
  file: File,
  meta: GalleryUploadMeta,
): Promise<AdminResult<{ data: AdminGalleryImage }>> {
  if (!API_URL) return fail("offline", "No API URL is configured for this deployment.");

  const token = getAdminToken();
  if (!token) return fail("offline", "No admin session token is stored in this browser.");

  const form = new FormData();
  form.append("image", file);
  form.append("caption", meta.caption);
  form.append("category", meta.category);
  form.append("aspect", meta.aspect);
  form.append("sortOrder", String(meta.sortOrder ?? 0));

  let response: Response;
  try {
    response = await fetch(`${API_URL}/gallery/upload`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    return fail("network", "The API could not be reached.");
  }

  if (response.status === 401 || response.status === 403) {
    forceAdminReauth();
    return fail("unauthorized", "This admin session is not authorised.", response.status);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = str(asRecord(payload).message, `Upload failed (${response.status})`);
    return fail(response.status >= 500 ? "server" : "invalid", message, response.status);
  }

  return { ok: true, data: normalizeGalleryImage(asRecord(payload).data) };
}

export async function deleteAdminGalleryImage(id: string): Promise<AdminResult<{ data: null }>> {
  const result = await adminRequest(`/gallery/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!result.ok) return result;
  return { ok: true, data: null };
}

/* ========================================================================== */
/*  Today's Special                                                           */
/* ========================================================================== */

export interface AdminSpecial {
  id: string;
  /** YYYY-MM-DD. */
  date: string;
  headline?: string;
  specialPrice?: number;
  sortOrder: number;
  item: AdminMenuItem;
}

function normalizeSpecial(raw: unknown): AdminSpecial {
  const special = asRecord(raw);
  const item = asRecord(special.item);
  const specialPrice = special.specialPrice;
  return {
    id: str(special.id),
    date: str(special.date).slice(0, 10),
    headline: optionalStr(special.headline),
    specialPrice: typeof specialPrice === "number" ? specialPrice : undefined,
    sortOrder: num(special.sortOrder),
    item: normalizeMenuItem(item),
  };
}

/** Curated specials from today forward. Past days are history, not a plan. */
export async function listAdminSpecials(
  signal?: AbortSignal,
): Promise<AdminResult<{ data: AdminSpecial[] }>> {
  const result = await adminRequest("/specials", { signal });
  if (!result.ok) return result;
  return { ok: true, data: rows(result.payload).map(normalizeSpecial) };
}

export interface SpecialInput {
  /** Menu item id, slug or code — the API resolves all three. */
  menuItem: string;
  date: string;
  specialPrice?: number;
  headline?: string;
  sortOrder: number;
}

export async function createAdminSpecial(
  input: SpecialInput,
): Promise<AdminResult<{ data: AdminSpecial }>> {
  const result = await adminRequest("/specials", { method: "POST", body: input });
  if (!result.ok) return result;
  return { ok: true, data: normalizeSpecial(asRecord(result.payload).data) };
}

export interface SpecialPatch {
  specialPrice?: number | null;
  headline?: string | null;
  sortOrder?: number;
  date?: string;
}

export async function updateAdminSpecial(
  id: string,
  patch: SpecialPatch,
): Promise<AdminResult<{ data: AdminSpecial }>> {
  const result = await adminRequest(`/specials/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
  if (!result.ok) return result;
  return { ok: true, data: normalizeSpecial(asRecord(result.payload).data) };
}

export async function deleteAdminSpecial(id: string): Promise<AdminResult<{ data: null }>> {
  const result = await adminRequest(`/specials/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!result.ok) return result;
  return { ok: true, data: null };
}

/* ========================================================================== */
/*  Editable site content                                                     */
/* ========================================================================== */

/**
 * The editable block registry, mirroring `CONTENT_BLOCKS` on the server.
 *
 * The API refuses any key outside this list, so it is part of the wire contract
 * and belongs here rather than in a view. `GET /site-content` also advertises
 * it, and the listing prefers the server's answer over this constant.
 */
export const CONTENT_KEYS = [
  "home.hero",
  "home.stats",
  "home.banners",
  "home.featured",
  "home.deliveryInfo",
  "about.story",
  "about.milestones",
  "about.team",
] as const;

export type ContentKey = (typeof CONTENT_KEYS)[number];

export function isContentKey(value: unknown): value is ContentKey {
  return typeof value === "string" && (CONTENT_KEYS as readonly string[]).includes(value);
}

/**
 * One authored block, exactly as stored.
 *
 * `value` stays `unknown` on the wire: each key has its own shape and the
 * content editor narrows it per key through `toContentDraft`, so a block that
 * predates a field costs one empty input rather than a mistyped object.
 */
export interface AdminContentBlock {
  key: ContentKey;
  value: unknown;
  published: boolean;
  /** ISO 8601. Empty when the API omitted it. */
  updatedAt: string;
}

export interface AdminContentSnapshot {
  /** Only the keys that actually have a row — an unauthored block is absent. */
  blocks: AdminContentBlock[];
  /** The full registry the API advertises, including unauthored keys. */
  keys: ContentKey[];
}

function normalizeContentBlock(raw: unknown): AdminContentBlock | null {
  const block = asRecord(raw);
  const key = str(block.key);
  // A key this build does not know about is skipped rather than rendered: the
  // panel has no form for it and would have nothing honest to show.
  if (!isContentKey(key)) return null;

  return {
    key,
    value: block.value,
    published: block.published !== false,
    updatedAt: isoDate(block.updatedAt),
  };
}

export async function listAdminContent(
  signal?: AbortSignal,
): Promise<AdminResult<{ data: AdminContentSnapshot }>> {
  const result = await adminRequest("/site-content?includeUnpublished=true", { signal });
  if (!result.ok) return result;

  const payload = asRecord(result.payload);
  const advertised = strArray(payload.keys).filter(isContentKey);

  return {
    ok: true,
    data: {
      blocks: rows(result.payload)
        .map(normalizeContentBlock)
        .filter((block): block is AdminContentBlock => block !== null),
      // Fall back to this build's registry when the API stops advertising one,
      // so the editor always offers every block it can actually edit.
      keys: advertised.length > 0 ? advertised : [...CONTENT_KEYS],
    },
  };
}

export async function saveAdminContent(
  key: ContentKey,
  value: unknown,
  published: boolean,
): Promise<AdminResult<{ data: AdminContentBlock }>> {
  const result = await adminRequest(`/site-content/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: { value, published },
  });
  if (!result.ok) return result;

  const block = normalizeContentBlock(asRecord(result.payload).data);
  if (!block) return fail("invalid", "The API returned a content block this panel cannot read.");
  return { ok: true, data: block };
}

/** Clears the block entirely. The storefront then renders nothing for it. */
export async function deleteAdminContent(key: ContentKey): Promise<AdminResult<{ data: null }>> {
  const result = await adminRequest(`/site-content/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  if (!result.ok) return result;
  return { ok: true, data: null };
}

/* ========================================================================== */
/*  Customer reviews                                                          */
/* ========================================================================== */

export interface AdminReview {
  id: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  quote: string;
  initials: string;
  /** YYYY-MM-DD. */
  date: string;
  verified: boolean;
  published: boolean;
  featured: boolean;
}

function normalizeReview(raw: unknown): AdminReview {
  const review = asRecord(raw);
  return {
    id: str(review.id),
    name: str(review.name),
    role: str(review.role),
    location: str(review.location),
    rating: num(review.rating),
    quote: str(review.quote),
    initials: str(review.initials),
    date: str(review.date).slice(0, 10),
    verified: review.verified === true,
    // Both flags are admin-only projections. A listing that omits them is a
    // public one, and an unmoderated review is never public — so absent reads
    // as published rather than as a pending submission.
    published: review.published !== false,
    featured: review.featured === true,
  };
}

export interface AdminReviewSummary {
  /** Mean rating across published reviews only. */
  average: number;
  count: number;
}

export async function listAdminReviews(
  signal?: AbortSignal,
): Promise<AdminResult<{ data: { reviews: AdminReview[]; summary: AdminReviewSummary } }>> {
  const result = await adminRequest("/reviews?includeUnpublished=true&limit=100", { signal });
  if (!result.ok) return result;

  const summary = asRecord(asRecord(result.payload).summary);

  return {
    ok: true,
    data: {
      reviews: rows(result.payload).map(normalizeReview),
      summary: { average: num(summary.average), count: num(summary.count) },
    },
  };
}

export interface ReviewModerationPatch {
  published?: boolean;
  featured?: boolean;
}

/**
 * Moderation only.
 *
 * There is deliberately no create call here: reviews are written by customers
 * through the public endpoint, and an admin-side "add a review" form is exactly
 * the fabrication this project set out to remove.
 */
export async function updateAdminReview(
  id: string,
  patch: ReviewModerationPatch,
): Promise<AdminResult<{ data: null }>> {
  const result = await adminRequest(`/reviews/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
  if (!result.ok) return result;
  // The PATCH response is the public projection and carries neither flag, so
  // there is nothing trustworthy to hand back — callers re-read the listing.
  return { ok: true, data: null };
}

export async function deleteAdminReview(id: string): Promise<AdminResult<{ data: null }>> {
  const result = await adminRequest(`/reviews/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!result.ok) return result;
  return { ok: true, data: null };
}

/* ========================================================================== */
/*  Outlets & delivery areas                                                  */
/* ========================================================================== */

export interface AdminDeliveryArea {
  id: string;
  outletId: string;
  name: string;
  /** Six digits, never leading zero — the API enforces the same rule. */
  pincode: string;
  etaMinutes: number;
  freeDelivery: boolean;
  active: boolean;
  sortOrder: number;
}

export interface AdminOutlet {
  id: string;
  slug: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  deliveryRadiusKm?: number;
  deliveryMinutes?: number;
  /** 24h "HH:MM". */
  opensAt?: string;
  closesAt?: string;
  active: boolean;
  sortOrder: number;
  deliveryAreas: AdminDeliveryArea[];
}

function optionalNum(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeDeliveryArea(raw: unknown, fallbackOutletId: string): AdminDeliveryArea {
  const area = asRecord(raw);
  return {
    id: str(area.id),
    outletId: str(area.outletId, fallbackOutletId),
    name: str(area.name),
    pincode: str(area.pincode),
    etaMinutes: num(area.etaMinutes),
    freeDelivery: area.freeDelivery === true,
    active: area.active !== false,
    sortOrder: num(area.sortOrder),
  };
}

function normalizeOutlet(raw: unknown): AdminOutlet {
  const outlet = asRecord(raw);
  // The API nests the postal fields under `address`; the panel edits them flat
  // because that is the shape the create/patch bodies take.
  const address = asRecord(outlet.address);
  const id = str(outlet.id);

  return {
    id,
    slug: str(outlet.slug),
    name: str(outlet.name),
    line1: str(address.line1),
    line2: optionalStr(address.line2),
    city: str(address.city),
    state: str(address.state),
    postalCode: str(address.postalCode),
    country: str(address.country, "IN"),
    phone: optionalStr(outlet.phone),
    email: optionalStr(outlet.email),
    latitude: optionalNum(outlet.latitude),
    longitude: optionalNum(outlet.longitude),
    deliveryRadiusKm: optionalNum(outlet.deliveryRadiusKm),
    deliveryMinutes: optionalNum(outlet.deliveryMinutes),
    opensAt: optionalStr(outlet.opensAt),
    closesAt: optionalStr(outlet.closesAt),
    active: outlet.active !== false,
    sortOrder: num(outlet.sortOrder),
    deliveryAreas: (Array.isArray(outlet.deliveryAreas) ? outlet.deliveryAreas : []).map((area) =>
      normalizeDeliveryArea(area, id),
    ),
  };
}

/** Every outlet including the disabled ones — this is the admin's own view. */
export async function listAdminOutlets(
  signal?: AbortSignal,
): Promise<AdminResult<{ data: AdminOutlet[] }>> {
  const result = await adminRequest("/outlets?includeInactive=true", { signal });
  if (!result.ok) return result;
  return { ok: true, data: rows(result.payload).map(normalizeOutlet) };
}

export interface OutletInput {
  slug: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  deliveryRadiusKm?: number;
  deliveryMinutes?: number;
  opensAt?: string;
  closesAt?: string;
  active: boolean;
  sortOrder: number;
}

/**
 * Drops the fields the operator left blank.
 *
 * The API's optional fields reject an empty string, and sending `""` for a
 * phone number would also be a claim that the outlet has one.
 */
function outletBody(input: Partial<OutletInput>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (typeof value === "string" && value.trim().length === 0) continue;
    body[field] = typeof value === "string" ? value.trim() : value;
  }
  return body;
}

export async function createAdminOutlet(
  input: OutletInput,
): Promise<AdminResult<{ data: AdminOutlet }>> {
  const result = await adminRequest("/outlets", { method: "POST", body: outletBody(input) });
  if (!result.ok) return result;
  return { ok: true, data: normalizeOutlet(asRecord(result.payload).data) };
}

export async function updateAdminOutlet(
  id: string,
  patch: Partial<OutletInput>,
): Promise<AdminResult<{ data: AdminOutlet }>> {
  const result = await adminRequest(`/outlets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: outletBody(patch),
  });
  if (!result.ok) return result;
  return { ok: true, data: normalizeOutlet(asRecord(result.payload).data) };
}

export async function deleteAdminOutlet(id: string): Promise<AdminResult<{ data: null }>> {
  const result = await adminRequest(`/outlets/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!result.ok) return result;
  return { ok: true, data: null };
}

export interface DeliveryAreaInput {
  name: string;
  pincode: string;
  etaMinutes: number;
  freeDelivery: boolean;
  active: boolean;
  sortOrder: number;
}

export async function createAdminDeliveryArea(
  outletId: string,
  input: DeliveryAreaInput,
): Promise<AdminResult<{ data: AdminDeliveryArea }>> {
  const result = await adminRequest(`/outlets/${encodeURIComponent(outletId)}/areas`, {
    method: "POST",
    body: input,
  });
  if (!result.ok) return result;
  return { ok: true, data: normalizeDeliveryArea(asRecord(result.payload).data, outletId) };
}

export async function updateAdminDeliveryArea(
  outletId: string,
  areaId: string,
  patch: Partial<DeliveryAreaInput>,
): Promise<AdminResult<{ data: AdminDeliveryArea }>> {
  const result = await adminRequest(
    `/outlets/${encodeURIComponent(outletId)}/areas/${encodeURIComponent(areaId)}`,
    { method: "PATCH", body: patch },
  );
  if (!result.ok) return result;
  return { ok: true, data: normalizeDeliveryArea(asRecord(result.payload).data, outletId) };
}

export async function deleteAdminDeliveryArea(
  outletId: string,
  areaId: string,
): Promise<AdminResult<{ data: null }>> {
  const result = await adminRequest(
    `/outlets/${encodeURIComponent(outletId)}/areas/${encodeURIComponent(areaId)}`,
    { method: "DELETE" },
  );
  if (!result.ok) return result;
  return { ok: true, data: null };
}

export interface CoverageAnswer {
  covered: boolean;
  query: string;
  area?: AdminDeliveryArea;
  outlet?: { id: string; name: string; city: string };
}

/**
 * The same lookup the storefront's "do you deliver here?" box performs, so an
 * operator can check a PIN code against live data rather than against the table
 * they just edited.
 */
export async function checkAdminCoverage(
  query: string,
  signal?: AbortSignal,
): Promise<AdminResult<{ data: CoverageAnswer }>> {
  const result = await adminRequest(`/outlets/coverage?q=${encodeURIComponent(query)}`, {
    signal,
    auth: "optional",
  });
  if (!result.ok) return result;

  const answer = asRecord(asRecord(result.payload).data);
  const outlet = asRecord(answer.outlet);
  const covered = answer.covered === true;

  return {
    ok: true,
    data: {
      covered,
      query: str(answer.query, query),
      area: covered && answer.area ? normalizeDeliveryArea(answer.area, str(outlet.id)) : undefined,
      outlet: covered
        ? { id: str(outlet.id), name: str(outlet.name), city: str(outlet.city) }
        : undefined,
    },
  };
}
