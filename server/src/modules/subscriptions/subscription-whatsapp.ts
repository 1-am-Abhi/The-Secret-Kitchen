import type { BillingCycle, MealSlot } from "@prisma/client";

import { env } from "../../config/env";

/**
 * WhatsApp handoff for a tiffin subscription.
 *
 * Mirrors the order flow in docs/order-flow.md: the subscription row is
 * committed first, and only then is this message built. The kitchen confirms it
 * by replying — nothing here may mark a subscription active on its own.
 *
 * The billing cycle and meal slot are the two things the kitchen must not have
 * to guess (they decide how much food is cooked and when it is dispatched), so
 * both appear near the top rather than buried under the price breakdown.
 */

export interface SubscriptionHandoffInput {
  code: string;
  planName: string;
  cycle: BillingCycle;
  slot: MealSlot;
  customerName: string;
  customerPhone: string;
  mealsTotal: number;
  pricePerMeal: number;
  amount: number;
  discount: number;
  couponCode?: string | null;
  startDate: string;
  addressLabel: string;
  addressLine: string;
  preferences?: string | null;
}

const CYCLE_LABEL: Record<BillingCycle, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};

const SLOT_LABEL: Record<MealSlot, string> = {
  LUNCH: "Lunch only",
  DINNER: "Dinner only",
  BOTH: "Lunch + Dinner",
};

function rupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function buildSubscriptionMessage(input: SubscriptionHandoffInput): string {
  const lines: string[] = [];

  lines.push(`Hello ${env.BUSINESS_NAME},`);
  lines.push("");
  lines.push("I'd like to start a tiffin subscription.");
  lines.push("");
  lines.push(`Subscription ID: ${input.code}`);
  lines.push("");
  lines.push("Plan:");
  lines.push(input.planName);
  lines.push("");
  lines.push("Billing Cycle:");
  lines.push(CYCLE_LABEL[input.cycle]);
  lines.push("");
  lines.push("Meals Per Day:");
  lines.push(SLOT_LABEL[input.slot]);
  lines.push("");
  lines.push("Name:");
  lines.push(input.customerName);
  lines.push("");
  lines.push("Phone:");
  lines.push(input.customerPhone);
  lines.push("");
  lines.push(`Meals: ${input.mealsTotal} × ${rupees(input.pricePerMeal)} per meal`);

  // Only shown when something was actually taken off, so a plain subscription
  // stays a short message rather than an invoice.
  if (input.discount > 0) {
    lines.push(
      `Discount${input.couponCode ? ` (${input.couponCode})` : ""}: -${rupees(input.discount)}`,
    );
  }

  lines.push(`Total: ${rupees(input.amount)}`);
  lines.push("");
  lines.push(`Starts: ${input.startDate}`);
  lines.push("");
  lines.push("Delivery Address:");
  lines.push(`${input.addressLabel} — ${input.addressLine}`);

  if (input.preferences) {
    lines.push("");
    lines.push("Preferences:");
    lines.push(input.preferences);
  }

  lines.push("");
  lines.push("Please confirm my subscription.");

  return lines.join("\n");
}

/** Strips formatting to the digits `wa.me` expects, applying the country code. */
function toWaNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export function buildSubscriptionHandoff(input: SubscriptionHandoffInput): {
  channel: "WHATSAPP";
  whatsappUrl: string;
  text: string;
} {
  const text = buildSubscriptionMessage(input);
  return {
    channel: "WHATSAPP",
    whatsappUrl: `https://wa.me/${toWaNumber(env.BUSINESS_WHATSAPP)}?text=${encodeURIComponent(text)}`,
    text,
  };
}
