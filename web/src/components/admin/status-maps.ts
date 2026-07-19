import type { StatusTone } from "@/components/admin/status-pill";
import type { AdminPlanTier, AdminSubscriptionStatus } from "@/lib/admin-orders";

/**
 * Status → presentation lookups.
 *
 * Every table, card and drawer resolves colour and copy through these maps, so
 * a state can never be styled two different ways in two different screens. The
 * vocabularies themselves live in `@/lib/admin-orders`, next to the wire
 * contract they mirror — this module only decides how they look.
 *
 * Order statuses are the exception: their tone and label maps ship with the
 * contract itself (`ORDER_STATUS_TONE`, `ORDER_STATUS_LABEL`), because the
 * orders screen and the API client have to agree on them exactly.
 */

/* -------------------------------------------------------------------------- */
/* Customer segments                                                          */
/* -------------------------------------------------------------------------- */

/**
 * A presentation-only banding of real customer figures.
 *
 * The API does not store a segment; it stores order counts and delivered
 * spend. This is the panel's own reading of those two numbers, applied
 * consistently wherever a customer is shown.
 */
export type CustomerSegment = "new" | "regular" | "vip";

/** Lifetime value is in rupees and counts delivered orders only. */
export function segmentOf(orderCount: number, lifetimeValue: number): CustomerSegment {
  if (lifetimeValue >= 18_000 || orderCount >= 45) return "vip";
  if (orderCount >= 6) return "regular";
  return "new";
}

export const segmentTone: Record<CustomerSegment, StatusTone> = {
  new: "info",
  regular: "neutral",
  vip: "transit",
};

export const segmentLabel: Record<CustomerSegment, string> = {
  new: "New",
  regular: "Regular",
  vip: "VIP",
};

/* -------------------------------------------------------------------------- */
/* Tiffin subscriptions                                                       */
/* -------------------------------------------------------------------------- */

export const subscriptionStatusTone: Record<AdminSubscriptionStatus, StatusTone> = {
  pending: "progress",
  active: "success",
  paused: "info",
  cancelled: "danger",
};

export const subscriptionStatusLabel: Record<AdminSubscriptionStatus, string> = {
  pending: "Pending",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
};

export const planTierLabel: Record<AdminPlanTier, string> = {
  student: "Student",
  regular: "Regular",
  premium: "Premium",
};

export const planTierTone: Record<AdminPlanTier, StatusTone> = {
  student: "info",
  regular: "neutral",
  premium: "transit",
};

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

/** "13:42" from an ISO timestamp — stable across server and client renders. */
export function formatClock(iso: string): string {
  return iso.slice(11, 16);
}

/** "19 Jul, 13:42" without pulling in a locale-dependent formatter. */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDateTime(iso: string): string {
  const day = Number(iso.slice(8, 10));
  const month = MONTHS[Number(iso.slice(5, 7)) - 1];
  return `${day} ${month}, ${formatClock(iso)}`;
}

/** "19 Jul 2026" from a plain YYYY-MM-DD string. */
export function formatDay(iso: string): string {
  const day = Number(iso.slice(8, 10));
  const month = MONTHS[Number(iso.slice(5, 7)) - 1];
  if (!day || !month) return "—";
  return `${day} ${month} ${iso.slice(0, 4)}`;
}

/** Whole days between two YYYY-MM-DD dates (b − a). */
export function daysBetween(a: string, b: string): number {
  const toStamp = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toStamp(b) - toStamp(a)) / 86_400_000);
}

/** "Today", "Yesterday", "in 3 days", "12 days ago" — relative to a given day. */
export function relativeDay(iso: string, today: string): string {
  const delta = daysBetween(today, iso.slice(0, 10));
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  return delta > 0 ? `In ${delta} days` : `${Math.abs(delta)} days ago`;
}

/**
 * Today as YYYY-MM-DD in the operator's own timezone.
 *
 * Call this from an effect or an event handler, never during a server render:
 * the server's clock and the browser's would disagree and hydration would
 * mismatch. The panel's date filters and "today" comparisons all go through it.
 */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Shift a YYYY-MM-DD date by whole days, without touching a clock. */
export function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}
