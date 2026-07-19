import { AppError } from "../../../utils/AppError";
import type { ChannelHandoff, OrderChannelHandler } from "./types";

/**
 * Razorpay channel — scaffolded, not yet enabled.
 *
 * This file exists to prove the abstraction holds. Switching the storefront
 * from WhatsApp ordering to online payment requires exactly three things:
 *
 *   1. `npm i razorpay` and fill in the two marked blocks below.
 *   2. Add a `POST /api/orders/:orderNumber/payment-webhook` route that
 *      verifies the signature and advances the order from PENDING_PAYMENT to
 *      CONFIRMED via the same `applyStatusChange` used everywhere else.
 *   3. Send `channel: "RAZORPAY"` from checkout.
 *
 * Nothing else changes. The order model, the status machine, the admin panel,
 * the SSE feed and the tracking page are all channel-blind by design.
 *
 * Note the initial status: PENDING_PAYMENT, not PENDING_CUSTOMER_CONFIRMATION.
 * The order row is still written BEFORE the gateway is contacted, for the same
 * reason it is written before WhatsApp opens — if we only created orders after
 * a successful callback, every abandoned or failed payment would be an order we
 * have no record of.
 */

export const razorpayChannel: OrderChannelHandler = {
  channel: "RAZORPAY",

  initialStatus: () => "PENDING_PAYMENT",
  initialPaymentStatus: () => "PENDING",
  paymentMethod: () => "UPI",

  initialEventNote: () => "Order created. Awaiting online payment.",

  async handoff(): Promise<ChannelHandoff> {
    // ── Replace this block when enabling Razorpay ──────────────────────────
    // const client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: … });
    // const providerOrder = await client.orders.create({
    //   amount: order.total * 100,      // gateway works in paise
    //   currency: commerce.currency,
    //   receipt: order.orderNumber,
    // });
    // return {
    //   channel: "RAZORPAY",
    //   providerOrderId: providerOrder.id,
    //   amount: order.total,
    //   currency: commerce.currency,
    //   keyId: env.RAZORPAY_KEY_ID,
    // };
    // ──────────────────────────────────────────────────────────────────────
    throw AppError.badRequest(
      "Online payment is not enabled yet. Please place your order over WhatsApp.",
      { code: "CHANNEL_NOT_ENABLED" },
    );
  },
};
