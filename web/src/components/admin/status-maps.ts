import type { StatusTone } from "@/components/admin/status-pill";
import type {
  AdminSubscriptionStatus,
  CustomerSegment,
  OrderStatus,
  PaymentStatus,
} from "@/data/admin-mock";
import type { PlanTier } from "@/types";

/**
 * Status → presentation lookups.
 *
 * Every table, card and drawer resolves colour and copy through these maps, so
 * a state can never be styled two different ways in two different screens.
 */

export const orderStatusTone: Record<OrderStatus, StatusTone> = {
  pending: "neutral",
  confirmed: "info",
  preparing: "progress",
  "out-for-delivery": "transit",
  delivered: "success",
  cancelled: "danger",
};

export const paymentStatusTone: Record<PaymentStatus, StatusTone> = {
  paid: "success",
  pending: "progress",
  refunded: "muted",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  paid: "Paid",
  pending: "Payment due",
  refunded: "Refunded",
};

export const paymentMethodLabel: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  cod: "Cash on delivery",
  wallet: "Wallet",
};

export const subscriptionStatusTone: Record<AdminSubscriptionStatus, StatusTone> = {
  active: "success",
  paused: "progress",
  cancelled: "danger",
};

export const subscriptionStatusLabel: Record<AdminSubscriptionStatus, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
};

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

export const planTierLabel: Record<PlanTier, string> = {
  student: "Student",
  regular: "Regular",
  premium: "Premium",
};

export const planTierTone: Record<PlanTier, StatusTone> = {
  student: "info",
  regular: "neutral",
  premium: "transit",
};

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

/** "Today", "Yesterday", "in 3 days", "12 days ago" — relative to a fixed today. */
export function relativeDay(iso: string, today: string): string {
  const delta = daysBetween(today, iso.slice(0, 10));
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  return delta > 0 ? `In ${delta} days` : `${Math.abs(delta)} days ago`;
}
