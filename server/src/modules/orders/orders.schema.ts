import { z } from "zod";

import { paginationSchema } from "../../utils/pagination";

/** Indian mobile number, with or without a +91 / 0 prefix. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .refine((value) => /^(?:\+91|0)?[6-9]\d{9}$/.test(value), "Enter a valid 10-digit mobile number.")
  .transform((value) => value.replace(/^(?:\+91|0)/, ""));

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter a valid 6-digit pincode.");

export const paymentMethodSchema = z.enum([
  "UPI",
  "CARD",
  "NETBANKING",
  "WALLET",
  "COD",
  "WHATSAPP",
]);

/** How the order reached us. The channel decides its starting state. */
export const orderChannelSchema = z.enum(["WHATSAPP", "RAZORPAY", "COD", "PHONE"]);

export const orderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PENDING_CUSTOMER_CONFIRMATION",
  "CONFIRMED",
  "PREPARING",
  "COOKING",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

export const paymentStatusSchema = z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]);

const orderLineSchema = z
  .object({
    /** Menu item id, slug or catalogue code. Omitted for custom tiffin boxes. */
    itemId: z.string().trim().min(1).optional(),
    quantity: z.number().int().min(1).max(50),
    /** Add-on `code`s as exposed by GET /api/menu (`addOns[].id`). */
    addOnIds: z.array(z.string().trim().min(1)).max(12).default([]),
    note: z.string().trim().max(280).optional(),

    /* Custom "Build Your Tiffin" line */
    isCustomTiffin: z.boolean().default(false),
    name: z.string().trim().min(1).max(120).optional(),
    componentIds: z.array(z.string().trim().min(1)).max(20).default([]),
  })
  .refine((line) => Boolean(line.itemId) || line.isCustomTiffin, {
    message: "Each line needs either an itemId or isCustomTiffin: true.",
  });

export const createOrderSchema = z.object({
  /**
   * Defaults to WHATSAPP: it is the live ordering channel. Sending
   * `channel: "RAZORPAY"` is all the storefront will need to change when online
   * payment is switched on.
   */
  channel: orderChannelSchema.default("WHATSAPP"),

  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: phoneSchema,
    /** Only sent when it differs from the delivery phone. */
    whatsappPhone: phoneSchema.nullish(),
    email: z.string().email().toLowerCase().trim().optional(),
  }),
  address: z.object({
    label: z.string().trim().max(40).default("Home"),
    line1: z.string().trim().min(3).max(160),
    line2: z.string().trim().max(160).optional(),
    landmark: z.string().trim().max(120).optional(),
    city: z.string().trim().min(2).max(60).default("Noida"),
    state: z.string().trim().min(2).max(60).default("Uttar Pradesh"),
    pincode: pincodeSchema,
    save: z.boolean().default(true),
  }),
  items: z.array(orderLineSchema).min(1, "Add at least one dish to your order.").max(50),
  couponCode: z.string().trim().max(40).nullish(),
  /**
   * The payment method is derived from the channel, not accepted from the
   * client — otherwise a caller could claim a WhatsApp order was already paid.
   * Kept optional purely so the admin's phone-order form can override it.
   */
  paymentMethod: paymentMethodSchema.optional(),
  paymentRef: z.string().trim().max(120).optional(),
  /** Notes for the kitchen. `note` is accepted as a legacy alias. */
  kitchenNote: z.string().trim().max(500).nullish(),
  note: z.string().trim().max(500).nullish(),
  scheduledFor: z.coerce.date().optional(),
});

export const orderNumberParamSchema = z.object({
  orderNumber: z.string().trim().min(4).max(40),
});

export const orderIdParamSchema = z.object({ id: z.string().trim().min(1) });

export const listOrdersQuerySchema = paginationSchema.extend({
  status: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  search: z.string().trim().min(1).max(80).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.enum(["newest", "oldest", "total-desc"]).default("newest"),
});

export const updateOrderSchema = z
  .object({
    status: orderStatusSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    paymentRef: z.string().trim().max(120).optional(),
    cancelReason: z.string().trim().max(280).optional(),
    note: z.string().trim().max(500).optional(),
    /** Operator note attached to this specific transition in the timeline. */
    statusNote: z.string().trim().max(280).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update." });

/** Customer-initiated cancellation, keyed by the public order number. */
export const cancelOrderSchema = z.object({
  phone: phoneSchema,
  reason: z.string().trim().max(280).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
