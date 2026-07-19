import { z } from "zod";

/** 24h "HH:MM" — the same shape JSON-LD's openingHoursSpecification expects. */
const timeOfDay = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM, e.g. 08:30");

/** Indian PIN codes are exactly six digits and never start with zero. */
const pincode = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code");

const slug = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens");

export const listOutletsQuerySchema = z.object({
  /** Admins pass "true" to see disabled outlets; the storefront never does. */
  includeInactive: z.enum(["true", "false"]).default("false"),
});

export const coverageQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
});

export const createOutletSchema = z.object({
  slug: slug,
  name: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(2).max(160),
  line2: z.string().trim().max(160).nullable().optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: pincode,
  country: z.string().trim().length(2).default("IN"),
  phone: z.string().trim().max(24).nullable().optional(),
  email: z.string().trim().email().max(160).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  deliveryRadiusKm: z.number().min(0).max(100).nullable().optional(),
  deliveryMinutes: z.number().int().min(1).max(600).nullable().optional(),
  opensAt: timeOfDay.nullable().optional(),
  closesAt: timeOfDay.nullable().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const updateOutletSchema = createOutletSchema.partial();

export const createDeliveryAreaSchema = z.object({
  name: z.string().trim().min(2).max(120),
  pincode: pincode,
  etaMinutes: z.number().int().min(1).max(600),
  freeDelivery: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const updateDeliveryAreaSchema = createDeliveryAreaSchema.partial();

export const outletIdParamSchema = z.object({ id: z.string().trim().min(1) });
export const areaIdParamSchema = z.object({
  id: z.string().trim().min(1),
  areaId: z.string().trim().min(1),
});

export type ListOutletsQuery = z.infer<typeof listOutletsQuerySchema>;
export type CoverageQuery = z.infer<typeof coverageQuerySchema>;
export type CreateOutletInput = z.infer<typeof createOutletSchema>;
export type UpdateOutletInput = z.infer<typeof updateOutletSchema>;
export type CreateDeliveryAreaInput = z.infer<typeof createDeliveryAreaSchema>;
export type UpdateDeliveryAreaInput = z.infer<typeof updateDeliveryAreaSchema>;
