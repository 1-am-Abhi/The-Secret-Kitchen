import type { OrderChannel, OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

import type { OrderWithItems } from "../orders.types";

/**
 * Order channel abstraction.
 *
 * A "channel" is how an order reaches us and how it gets confirmed. Each one
 * owns three decisions — the status an order starts in, the payment status it
 * starts in, and what the client must do next to complete the handoff.
 *
 * Everything downstream of order creation (the admin panel, the status machine,
 * tracking, analytics) reads the Order row and is deliberately channel-blind.
 * That is what makes adding Razorpay a matter of registering one more handler
 * rather than reworking the order architecture.
 */

/** Returned to the client so it can finish whatever the channel requires. */
export type ChannelHandoff =
  | {
      channel: "WHATSAPP";
      /** wa.me deep link, fully pre-filled. */
      whatsappUrl: string;
      /** The raw message, so the UI can show or copy it if the link is blocked. */
      text: string;
    }
  | {
      channel: "RAZORPAY";
      /** Gateway order id the client hands to the Razorpay SDK. */
      providerOrderId: string;
      amount: number;
      currency: string;
      keyId: string;
    }
  | { channel: "COD" }
  | { channel: "PHONE" };

export interface OrderChannelHandler {
  readonly channel: OrderChannel;

  /** Status a freshly created order enters. */
  initialStatus(): OrderStatus;

  /** Payment status a freshly created order enters. */
  initialPaymentStatus(): PaymentStatus;

  /** Payment method recorded against the order. */
  paymentMethod(): PaymentMethod;

  /**
   * Whatever the client needs to complete the handoff. Runs AFTER the order row
   * is committed — never before, because the database is the source of truth
   * and a handoff for an order that does not exist is worse than no handoff.
   */
  handoff(order: OrderWithItems): Promise<ChannelHandoff>;

  /**
   * Human-readable first line of the order's status history, e.g.
   * "Awaiting customer confirmation on WhatsApp".
   */
  initialEventNote(): string;
}
