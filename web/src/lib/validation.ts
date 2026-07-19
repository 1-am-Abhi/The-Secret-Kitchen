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
