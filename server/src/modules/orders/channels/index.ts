import type { OrderChannel } from "@prisma/client";

import { AppError } from "../../../utils/AppError";
import { razorpayChannel } from "./razorpay";
import { codChannel, phoneChannel, whatsappChannel } from "./whatsapp";
import type { OrderChannelHandler } from "./types";

/**
 * Channel registry.
 *
 * Adding a payment provider means adding one entry here — no caller needs to
 * know which channels exist.
 */
const HANDLERS: Record<OrderChannel, OrderChannelHandler> = {
  WHATSAPP: whatsappChannel,
  RAZORPAY: razorpayChannel,
  COD: codChannel,
  PHONE: phoneChannel,
};

export function getChannelHandler(channel: OrderChannel): OrderChannelHandler {
  const handler = HANDLERS[channel];
  if (!handler) {
    throw AppError.badRequest(`Unsupported order channel "${channel}".`);
  }
  return handler;
}

export * from "./types";
export { buildWhatsappMessage, buildWhatsappUrl } from "./whatsapp";
