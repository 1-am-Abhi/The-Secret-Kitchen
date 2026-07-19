import { env } from "../../../config/env";
import { commerce } from "../../../config/commerce";
import type { OrderWithItems } from "../orders.types";
import type { ChannelHandoff, OrderChannelHandler } from "./types";

/**
 * WhatsApp ordering channel.
 *
 * The order row is committed first; this handler only builds the deep link the
 * customer taps to send us a confirmation message. Crucially, nothing here can
 * or should mark the order confirmed — the browser cannot observe whether the
 * customer actually pressed Send in WhatsApp, so the order stays in
 * PENDING_CUSTOMER_CONFIRMATION until a human at the kitchen advances it.
 *
 * The message is built server-side rather than in the browser so that the
 * wording, the totals and the order number always match what we persisted.
 */

function rupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Builds the message the customer sends us.
 *
 * Formatted as plain text with blank-line separated blocks: WhatsApp renders
 * this cleanly on both mobile and desktop, and the kitchen can read an order
 * off a phone screen without scrolling past the important parts. Order ID,
 * name and total come first for exactly that reason.
 */
export function buildWhatsappMessage(order: OrderWithItems): string {
  const lines: string[] = [];

  lines.push(`Hello ${env.BUSINESS_NAME},`);
  lines.push("");
  lines.push(`Order ID: ${order.orderNumber}`);
  lines.push("");
  lines.push("Name:");
  lines.push(order.deliveryName);
  lines.push("");
  lines.push("Phone:");
  lines.push(order.deliveryPhone);
  lines.push("");

  lines.push("Items:");
  for (const item of order.items) {
    let line = `${item.quantity} × ${item.name}`;
    if (item.addOnLabels.length) line += ` (+ ${item.addOnLabels.join(", ")})`;
    if (item.isCustomTiffin && item.componentLabels.length) {
      line += ` — ${item.componentLabels.join(", ")}`;
    }
    lines.push(line);
    if (item.note) lines.push(`   ↳ ${item.note}`);
  }
  lines.push("");

  // Show the breakdown only when something was added or taken off, so a simple
  // order stays a three-line message rather than an invoice.
  if (order.discount > 0) {
    lines.push(`Item total: ${rupees(order.subtotal)}`);
    lines.push(`Discount${order.couponCode ? ` (${order.couponCode})` : ""}: -${rupees(order.discount)}`);
  }
  if (order.deliveryFee > 0) lines.push(`Delivery: ${rupees(order.deliveryFee)}`);

  lines.push(`Total: ${rupees(order.total)}`);
  lines.push("");

  lines.push("Delivery Address:");
  lines.push(order.deliveryLine1);
  if (order.deliveryLine2) lines.push(order.deliveryLine2);
  if (order.deliveryLandmark) lines.push(`Landmark: ${order.deliveryLandmark}`);
  lines.push(`${order.deliveryCity} - ${order.deliveryPincode}`);

  if (order.note) {
    lines.push("");
    lines.push("Special Instructions:");
    lines.push(order.note);
  }

  lines.push("");
  lines.push("Please confirm my order.");

  return lines.join("\n");
}

/** Strips formatting to the digits `wa.me` expects, applying the country code. */
function toWaNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Indian mobile numbers are stored as 10 digits; wa.me needs the country code.
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function buildWhatsappUrl(order: OrderWithItems): string {
  const target = toWaNumber(env.BUSINESS_WHATSAPP);
  return `https://wa.me/${target}?text=${encodeURIComponent(buildWhatsappMessage(order))}`;
}

export const whatsappChannel: OrderChannelHandler = {
  channel: "WHATSAPP",

  initialStatus: () => "PENDING_CUSTOMER_CONFIRMATION",
  initialPaymentStatus: () => "PENDING",
  paymentMethod: () => "WHATSAPP",

  initialEventNote: () => "Order created. Awaiting customer confirmation on WhatsApp.",

  async handoff(order): Promise<ChannelHandoff> {
    return {
      channel: "WHATSAPP",
      whatsappUrl: buildWhatsappUrl(order),
      text: buildWhatsappMessage(order),
    };
  },
};

export const codChannel: OrderChannelHandler = {
  channel: "COD",

  // Cash orders need no customer confirmation step — placing it IS the
  // confirmation, so they enter the kitchen queue immediately.
  initialStatus: () => "CONFIRMED",
  initialPaymentStatus: () => "PENDING",
  paymentMethod: () => "COD",

  initialEventNote: () => `Order confirmed. Cash on delivery, ${commerce.currency}.`,

  async handoff(): Promise<ChannelHandoff> {
    return { channel: "COD" };
  },
};

export const phoneChannel: OrderChannelHandler = {
  channel: "PHONE",

  initialStatus: () => "CONFIRMED",
  initialPaymentStatus: () => "PENDING",
  paymentMethod: () => "COD",

  initialEventNote: () => "Order taken over the phone by the kitchen.",

  async handoff(): Promise<ChannelHandoff> {
    return { channel: "PHONE" };
  },
};
