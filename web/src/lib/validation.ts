import { z } from "zod";

/**
 * Shared form schemas.
 *
 * Kept in one module so the same rules can be reused by the Express API — a
 * validation rule that exists in only one of the two layers is a bug waiting to
 * happen.
 */

/** Indian mobile numbers: 10 digits starting 6-9, tolerant of +91 and spaces. */
export const indianPhone = z
  .string()
  .min(1, "Phone number is required")
  .transform((value) => value.replace(/[\s\-()]/g, "").replace(/^(\+91|91|0)/, ""))
  .refine((value) => /^[6-9]\d{9}$/.test(value), {
    message: "Enter a valid 10-digit Indian mobile number",
  });

export const indianPincode = z
  .string()
  .min(1, "Pincode is required")
  .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode");

export const contactSchema = z.object({
  name: z
    .string()
    .min(2, "Please enter your name")
    .max(60, "That name looks too long"),
  email: z.email("Enter a valid email address"),
  phone: indianPhone,
  subject: z.string().min(1, "Please pick a subject"),
  message: z
    .string()
    .min(10, "Tell us a little more (at least 10 characters)")
    .max(1000, "Please keep it under 1000 characters"),
});

export type ContactValues = z.infer<typeof contactSchema>;

/* ==========================================================================
   Checkout
   ========================================================================== */

/**
 * The live checkout schema.
 *
 * Deliberately short: the order is placed over WhatsApp and priced entirely
 * server-side, so the form only collects what the kitchen and the rider
 * genuinely need. Anything else (payment method, delivery slot) is settled in
 * the WhatsApp conversation and has no field here.
 */
export const orderCheckoutSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Please enter your full name")
      .max(60, "That name looks a little too long"),
    phone: indianPhone,
    /** Checked by default — most people use one number for both. */
    sameWhatsapp: z.boolean(),
    whatsappPhone: z.string().trim().optional(),
    addressLine1: z
      .string()
      .trim()
      .min(8, "Please give the full address — flat, building and street")
      .max(200, "Please keep the address under 200 characters"),
    landmark: z.string().trim().max(80, "Please keep the landmark under 80 characters").optional(),
    pincode: indianPincode,
    kitchenNote: z
      .string()
      .trim()
      .max(300, "Please keep notes for the kitchen under 300 characters")
      .optional(),
  })
  .superRefine((values, ctx) => {
    // Only validate the WhatsApp number when it is actually being collected —
    // an untouched hidden field must never block a submit.
    if (values.sameWhatsapp) return;
    const digits = (values.whatsappPhone ?? "")
      .replace(/[\s\-()]/g, "")
      .replace(/^(\+91|91|0)/, "");
    if (!/^[6-9]\d{9}$/.test(digits)) {
      ctx.addIssue({
        code: "custom",
        path: ["whatsappPhone"],
        message: "Enter a valid 10-digit WhatsApp number",
      });
    }
  });

export type OrderCheckoutValues = z.infer<typeof orderCheckoutSchema>;

/** Order numbers are `TSK-YYYY-NNNNN`; lookup is case- and space-insensitive. */
export const orderLookupSchema = z.object({
  orderNumber: z
    .string()
    .min(1, "Enter your order ID")
    .transform((value) => value.trim().toUpperCase().replace(/\s+/g, ""))
    .refine((value) => /^TSK-\d{4}-\d{5}$/.test(value), {
      message: "Order IDs look like TSK-2026-00041",
    }),
});

export type OrderLookupValues = z.infer<typeof orderLookupSchema>;

/**
 * @deprecated Superseded by `orderCheckoutSchema`. Retained only so nothing
 * importing it breaks; delete once no consumer remains.
 */
export const checkoutSchema = z.object({
  // Step 1 — who
  name: z.string().min(2, "Please enter your full name").max(60),
  phone: indianPhone,
  // Email is optional at checkout — an empty string is explicitly allowed.
  email: z.email("Enter a valid email address").or(z.literal("")),

  // Step 2 — where
  addressLine1: z.string().min(5, "Flat, house or building is required").max(120),
  addressLine2: z.string().max(120).optional(),
  landmark: z.string().max(80).optional(),
  city: z.string().min(2, "City is required").max(60),
  pincode: indianPincode,
  addressType: z.enum(["home", "work", "other"]),

  // Step 3 — when & how
  deliverySlot: z.enum(["asap", "lunch", "dinner"]),
  paymentMethod: z.enum(["upi", "card", "netbanking", "wallet", "cod"]),
  instructions: z.string().max(300).optional(),
  contactlessDelivery: z.boolean(),
});

export type CheckoutValues = z.infer<typeof checkoutSchema>;

/** Field groups per wizard step — drives per-step validation before advancing. */
export const CHECKOUT_STEP_FIELDS = {
  1: ["name", "phone", "email"],
  2: ["addressLine1", "addressLine2", "landmark", "city", "pincode", "addressType"],
  3: ["deliverySlot", "paymentMethod", "instructions", "contactlessDelivery"],
} as const satisfies Record<number, readonly (keyof CheckoutValues)[]>;

/* ==========================================================================
   Admin sign-in
   ========================================================================== */

/**
 * Client-side gate for `/admin/login`.
 *
 * The server is the real authority — this only stops obviously pointless
 * requests reaching a rate-limited endpoint. The minimum length must stay in
 * step with the backend's password policy; it deliberately does not describe
 * the password's composition, since that would leak policy detail on a public
 * route for no usability gain.
 */
export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your admin email address")
    .pipe(z.email("Enter a valid email address")),
  password: z
    .string()
    .min(1, "Enter your password")
    .min(8, "Passwords are at least 8 characters"),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;
