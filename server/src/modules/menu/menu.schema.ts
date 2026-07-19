import { z } from "zod";

import { paginationSchema } from "../../utils/pagination";

/**
 * The storefront speaks kebab-case unions ("chef-special", "mild"); the
 * database speaks Postgres enums. Every inbound enum is translated here so the
 * public API contract matches web/src/types/index.ts exactly.
 */

export const spiceLevelSchema = z
  .enum(["mild", "medium", "spicy"])
  .transform((value) => value.toUpperCase() as "MILD" | "MEDIUM" | "SPICY");

const TAG_MAP = {
  bestseller: "BESTSELLER",
  new: "NEW",
  "chef-special": "CHEF_SPECIAL",
  healthy: "HEALTHY",
  "high-protein": "HIGH_PROTEIN",
  "jain-available": "JAIN_AVAILABLE",
  "kids-favourite": "KIDS_FAVOURITE",
  value: "VALUE",
} as const;

export type PrismaDishTag = (typeof TAG_MAP)[keyof typeof TAG_MAP];

export const dishTagSchema = z
  .enum(Object.keys(TAG_MAP) as [keyof typeof TAG_MAP, ...Array<keyof typeof TAG_MAP>])
  .transform((value) => TAG_MAP[value]);

/** Accepts `?tags=bestseller,healthy` or a repeated `?tags=` parameter. */
const tagListSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : value.split(",")))
  .transform((values) => values.map((value) => value.trim()).filter(Boolean))
  .pipe(z.array(dishTagSchema));

export const listMenuQuerySchema = paginationSchema.extend({
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(80).optional(),
  tags: tagListSchema.optional(),
  spiceLevel: spiceLevelSchema.optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  isJain: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  available: z.enum(["true", "false", "all"]).default("true"),
  sort: z.enum(["popular", "price-asc", "price-desc", "rating", "newest"]).default("popular"),
  /** Admin listings need every dish, grouped output is storefront-only. */
  grouped: z.enum(["true", "false"]).default("false"),
});

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1),
});

export const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

const addOnSchema = z.object({
  code: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(10_000),
});

export const createMenuItemSchema = z.object({
  code: z.string().trim().min(1).max(40),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase and hyphen-separated."),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  /** Either the category's own id or its slug — whichever the admin UI has. */
  category: z.string().trim().min(1),
  price: z.number().int().min(1).max(100_000),
  compareAtPrice: z.number().int().min(1).max(100_000).nullable().optional(),
  imageId: z.string().trim().min(1).max(120),
  imageUrl: z.string().url().nullable().optional(),
  isJain: z.boolean().default(false),
  spiceLevel: spiceLevelSchema.default("mild"),
  prepTime: z.number().int().min(1).max(240),
  calories: z.number().int().min(0).max(5000),
  protein: z.number().int().min(0).max(500).nullable().optional(),
  serves: z.string().trim().min(1).max(60),
  rating: z.number().min(0).max(5).default(0),
  ratingCount: z.number().int().min(0).default(0),
  tags: z.array(dishTagSchema).default([]),
  addOns: z.array(addOnSchema).max(12).default([]),
  available: z.boolean().default(true),
});

/** Partial update; `addOns` when present replaces the whole set. */
export const updateMenuItemSchema = createMenuItemSchema.partial();

export const createCategorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase and hyphen-separated."),
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().min(1).max(160),
  icon: z.string().trim().min(1).max(60),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export type ListMenuQuery = z.infer<typeof listMenuQuerySchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
