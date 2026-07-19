import { z } from "zod";

export const discountTypeSchema = z
  .enum(["percentage", "flat", "freebie"])
  .transform((value) => value.toUpperCase() as "PERCENTAGE" | "FLAT" | "FREEBIE");

export const offerScopeSchema = z
  .enum(["order", "subscription"])
  .transform((value) => value.toUpperCase() as "ORDER" | "SUBSCRIPTION");

export const listOffersQuerySchema = z.object({
  featured: z.enum(["true", "false"]).optional(),
  appliesTo: offerScopeSchema.optional(),
  /** Admin listings want expired/inactive rows too. */
  includeInactive: z.enum(["true", "false"]).default("false"),
});

export const validateCouponSchema = z.object({
  code: z.string().trim().min(2).max(40),
  subtotal: z.number().int().min(0).max(1_000_000),
  context: offerScopeSchema.default("order"),
});

export const createOfferSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, "Codes may only contain letters, digits, hyphens and underscores."),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1000),
  discountType: discountTypeSchema,
  discountValue: z.number().int().min(0).max(100_000),
  minOrder: z.number().int().min(0).max(1_000_000).default(0),
  maxDiscount: z.number().int().min(0).max(1_000_000).nullable().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date(),
  terms: z.array(z.string().trim().min(1).max(240)).max(12).default([]),
  imageId: z.string().trim().min(1).max(120),
  imageUrl: z.string().url().nullable().optional(),
  featured: z.boolean().default(false),
  appliesTo: offerScopeSchema.default("order"),
  active: z.boolean().default(true),
  usageLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
});

export const updateOfferSchema = createOfferSchema.partial();

export const offerIdParamSchema = z.object({ id: z.string().trim().min(1) });

export type ListOffersQuery = z.infer<typeof listOffersQuerySchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
