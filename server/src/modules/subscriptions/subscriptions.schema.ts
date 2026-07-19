import { z } from "zod";

import { paginationSchema } from "../../utils/pagination";
import { paymentMethodSchema, phoneSchema, pincodeSchema } from "../orders/orders.schema";

export const planTierSchema = z
  .enum(["student", "regular", "premium"])
  .transform((value) => value.toUpperCase() as "STUDENT" | "REGULAR" | "PREMIUM");

export const billingCycleSchema = z
  .enum(["weekly", "monthly", "custom"])
  .transform((value) => value.toUpperCase() as "WEEKLY" | "MONTHLY" | "CUSTOM");

export const mealSlotSchema = z
  .enum(["lunch", "dinner", "both"])
  .transform((value) => value.toUpperCase() as "LUNCH" | "DINNER" | "BOTH");

export const subscriptionStatusSchema = z.enum(["PENDING", "ACTIVE", "PAUSED", "CANCELLED"]);

export const createSubscriptionSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: phoneSchema,
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
  }),
  planTier: planTierSchema,
  cycle: billingCycleSchema.default("monthly"),
  slot: mealSlotSchema.default("lunch"),
  /** Only honoured for CUSTOM cycles. */
  customMeals: z.number().int().min(1).max(120).optional(),
  startDate: z.coerce.date().optional(),
  couponCode: z.string().trim().max(40).optional(),
  paymentMethod: paymentMethodSchema.default("UPI"),
  preferences: z.string().trim().max(500).optional(),
});

export const subscriptionIdParamSchema = z.object({ id: z.string().trim().min(1) });

/**
 * Lifecycle actions are authenticated by the phone number on the subscription —
 * the same lightweight guest credential the order tracker uses. Admin requests
 * carry a JWT and bypass this check.
 */
export const lifecycleSchema = z.object({
  phone: phoneSchema.optional(),
  reason: z.string().trim().max(280).optional(),
});

export const skipSchema = z.object({
  phone: phoneSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  slot: mealSlotSchema.default("lunch"),
  reason: z.string().trim().max(280).optional(),
});

export const listSubscriptionsQuerySchema = paginationSchema.extend({
  status: subscriptionStatusSchema.optional(),
  planTier: planTierSchema.optional(),
  search: z.string().trim().min(1).max(80).optional(),
});

export const createPlanSchema = z.object({
  tier: planTierSchema,
  name: z.string().trim().min(1).max(80),
  headline: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1000),
  weeklyPricePerMeal: z.number().int().min(1).max(10_000),
  monthlyPricePerMeal: z.number().int().min(1).max(10_000),
  weeklyMeals: z.number().int().min(1).max(60),
  monthlyMeals: z.number().int().min(1).max(200),
  includes: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  excludes: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  badge: z.string().trim().max(60).nullable().optional(),
  highlight: z.boolean().default(false),
  imageId: z.string().trim().min(1).max(120),
  imageUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export const updatePlanSchema = createPlanSchema.partial();

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type LifecycleInput = z.infer<typeof lifecycleSchema>;
export type SkipInput = z.infer<typeof skipSchema>;
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
