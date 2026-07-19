import { z } from "zod";

/**
 * The editable storefront content blocks.
 *
 * Each key is validated against its own shape, so the admin panel cannot store
 * a payload the storefront then has to defend against at render time — and no
 * key outside this registry can be created at all.
 *
 * Note what is NOT here: any statistic. Numbers come from the operational
 * tables via /api/stats. What an administrator controls is the *label* on a
 * figure and whether it is shown, never the figure itself.
 */

const optionalText = (max: number) => z.string().trim().max(max).optional();
const href = z.string().trim().max(300);

const heroSchema = z.object({
  eyebrow: optionalText(80),
  title: optionalText(160),
  subtitle: optionalText(400),
  primaryCtaLabel: optionalText(40),
  primaryCtaHref: href.optional(),
  secondaryCtaLabel: optionalText(40),
  secondaryCtaHref: href.optional(),
  imageId: optionalText(80),
});

/**
 * Which live metrics the homepage surfaces, and under what wording. `metric`
 * names a field of the /api/stats payload; the value is never authored here.
 */
const statsSchema = z.object({
  show: z.boolean().default(true),
  items: z
    .array(
      z.object({
        metric: z.enum([
          "mealsServed",
          "ordersDelivered",
          "customersServed",
          "activeSubscribers",
          "reviewCount",
          "averageRating",
        ]),
        label: z.string().trim().min(1).max(60),
      }),
    )
    .max(6)
    .default([]),
});

const bannersSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(60),
        title: z.string().trim().min(1).max(120),
        subtitle: optionalText(240),
        ctaLabel: optionalText(40),
        ctaHref: href.optional(),
        tone: z.enum(["brand", "fresh", "ink"]).default("brand"),
        active: z.boolean().default(true),
      }),
    )
    .max(8)
    .default([]),
});

/** Featured dishes and offers, referenced by their catalogue codes. */
const featuredSchema = z.object({
  dishCodes: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  offerCodes: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

const deliveryInfoSchema = z.object({
  title: optionalText(120),
  description: optionalText(400),
  note: optionalText(240),
});

const storySchema = z.object({
  eyebrow: optionalText(80),
  title: optionalText(160),
  paragraphs: z.array(z.string().trim().min(1).max(1200)).max(8).default([]),
  signature: optionalText(80),
  signatureRole: optionalText(80),
});

const milestonesSchema = z.object({
  items: z
    .array(
      z.object({
        year: z.string().trim().min(4).max(9),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().max(400).default(""),
      }),
    )
    .max(20)
    .default([]),
});

const teamSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        role: z.string().trim().min(1).max(80),
        bio: optionalText(400),
        experience: optionalText(40),
        speciality: optionalText(80),
        imageId: optionalText(80),
        initials: optionalText(4),
      }),
    )
    .max(24)
    .default([]),
});

export const CONTENT_BLOCKS = {
  "home.hero": heroSchema,
  "home.stats": statsSchema,
  "home.banners": bannersSchema,
  "home.featured": featuredSchema,
  "home.deliveryInfo": deliveryInfoSchema,
  "about.story": storySchema,
  "about.milestones": milestonesSchema,
  "about.team": teamSchema,
} as const;

export type ContentKey = keyof typeof CONTENT_BLOCKS;

export const CONTENT_KEYS = Object.keys(CONTENT_BLOCKS) as ContentKey[];

export const contentKeyParamSchema = z.object({
  key: z.enum(CONTENT_KEYS as [ContentKey, ...ContentKey[]]),
});

export const listContentQuerySchema = z.object({
  includeUnpublished: z.enum(["true", "false"]).default("false"),
});

export const upsertContentSchema = z.object({
  value: z.unknown(),
  published: z.boolean().default(true),
});

export type UpsertContentInput = z.infer<typeof upsertContentSchema>;
