import type { BillingCycle, MealSlot, PlanTier } from "@/types";

/**
 * Tiffin subscription API client.
 *
 * Deliberately does NOT route through `lib/api.ts`: that helper resolves to a
 * fake success when `NEXT_PUBLIC_API_URL` is unset, which is acceptable for a
 * newsletter signup and completely unacceptable here. A subscription the
 * database never witnessed is a customer who thinks they have food coming and
 * does not. This module fails loudly instead — same rule as `lib/orders.ts`.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type SubscriptionErrorCode =
  | "API_NOT_CONFIGURED"
  | "COUPON_REJECTED"
  | "PLAN_UNAVAILABLE"
  | "VALIDATION"
  | "NETWORK"
  | "SERVER";

export class SubscriptionError extends Error {
  constructor(
    message: string,
    readonly code: SubscriptionErrorCode,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SubscriptionError";
  }
}

export interface CreateSubscriptionInput {
  customer: { name: string; phone: string; email?: string | null };
  address: {
    label?: string;
    line1: string;
    line2?: string | null;
    landmark?: string | null;
    city: string;
    pincode: string;
  };
  planTier: PlanTier;
  cycle: Exclude<BillingCycle, "custom">;
  slot: MealSlot;
  couponCode?: string | null;
  preferences?: string | null;
}

export interface SubscriptionHandoff {
  channel: "WHATSAPP";
  whatsappUrl: string;
  text: string;
}

export interface CreatedSubscription {
  id: string;
  code: string;
  planTier: PlanTier;
  planName: string;
  cycle: BillingCycle;
  slot: MealSlot;
  status: string;
  startDate: string;
  nextDeliveryDate: string;
  mealsTotal: number;
  mealsRemaining: number;
  pricePerMeal: number;
  amount: number;
  discount: number;
  couponCode?: string;
  addressLabel: string;
  preferences?: string;
  handoff: SubscriptionHandoff;
}

/**
 * Creates the subscription. Resolves only on a 2xx carrying a real payload —
 * every other outcome throws a typed error the caller can turn into copy.
 */
export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<CreatedSubscription> {
  if (!API_URL) {
    throw new SubscriptionError(
      "Subscriptions are not available right now. Please message the kitchen on WhatsApp.",
      "API_NOT_CONFIGURED",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new SubscriptionError(
      "We could not reach the kitchen. Check your connection and try again.",
      "NETWORK",
    );
  }

  const body = (await response.json().catch(() => null)) as
    | { data?: CreatedSubscription; message?: string; code?: string }
    | null;

  if (!response.ok) {
    const code: SubscriptionErrorCode =
      body?.code === "COUPON_REJECTED"
        ? "COUPON_REJECTED"
        : response.status === 400
          ? "PLAN_UNAVAILABLE"
          : response.status === 422
            ? "VALIDATION"
            : "SERVER";
    throw new SubscriptionError(
      body?.message ?? "We could not start that subscription.",
      code,
      response.status,
    );
  }

  if (!body?.data?.code || !body.data.handoff?.whatsappUrl) {
    // A 2xx without a payload is not a success we can act on.
    throw new SubscriptionError(
      "The kitchen accepted the request but returned an unexpected response.",
      "SERVER",
      response.status,
    );
  }

  return body.data;
}

/* -------------------------------------------------------------------------- */
/* Handoff persistence                                                        */
/* -------------------------------------------------------------------------- */

const HANDOFF_PREFIX = "tsk:subscription-handoff:";

/**
 * Stashes the handoff for the confirmation step, keyed by subscription code so
 * two tabs cannot overwrite each other. Session-scoped: it is a one-time
 * transfer, not a record — the database already holds the real thing.
 */
export function saveSubscriptionHandoff(subscription: CreatedSubscription): void {
  try {
    sessionStorage.setItem(
      `${HANDOFF_PREFIX}${subscription.code}`,
      JSON.stringify(subscription),
    );
  } catch {
    // Storage can be unavailable (private mode, quota). The confirmation page
    // re-fetches in that case, so losing this is never fatal.
  }
}

export function readSubscriptionHandoff(code: string): CreatedSubscription | null {
  try {
    const raw = sessionStorage.getItem(`${HANDOFF_PREFIX}${code}`);
    return raw ? (JSON.parse(raw) as CreatedSubscription) : null;
  } catch {
    return null;
  }
}

export function clearSubscriptionHandoff(code: string): void {
  try {
    sessionStorage.removeItem(`${HANDOFF_PREFIX}${code}`);
  } catch {
    /* nothing to clean up */
  }
}

/* -------------------------------------------------------------------------- */
/* Display helpers                                                            */
/* -------------------------------------------------------------------------- */

export const CYCLE_LABEL: Record<Exclude<BillingCycle, "custom">, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

export const SLOT_LABEL: Record<MealSlot, string> = {
  lunch: "Lunch only",
  dinner: "Dinner only",
  both: "Lunch + Dinner",
};

/** How many meals a day the chosen slot represents. */
export function mealsPerDay(slot: MealSlot): number {
  return slot === "both" ? 2 : 1;
}
