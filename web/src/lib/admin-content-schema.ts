/**
 * Client-side mirrors of the server's editable content blocks.
 *
 * `server/src/modules/site-content/site-content.schema.ts` is the authority —
 * a PUT is re-validated there and rejected if it disagrees. These copies exist
 * so the admin panel can catch a too-long headline or an empty milestone title
 * before the round trip, and point at the exact field that is wrong.
 *
 * Keep the two files in step: a rule that is only here is advisory, and a rule
 * that is only on the server surfaces as a form-level error instead of an
 * inline one.
 */

import { z } from "zod";

import type { ContentKey } from "@/lib/admin-orders";
import type {
  BannersContent,
  ContentBlockMap,
  DeliveryInfoContent,
  FeaturedContent,
  HeroContent,
  MilestonesContent,
  StatsContent,
  StoryContent,
  TeamContent,
} from "@/lib/storefront-data";

const optionalText = (max: number) => z.string().trim().max(max).optional();
const href = z.string().trim().max(300).optional();

/**
 * Which live figures the homepage may surface. The admin controls the *label*
 * on a metric and whether the strip is shown — never the number itself, which
 * only ever comes from `/api/stats`.
 */
export const STAT_METRICS = [
  "mealsServed",
  "ordersDelivered",
  "customersServed",
  "activeSubscribers",
  "reviewCount",
  "averageRating",
] as const;

export const STAT_METRIC_LABEL: Record<(typeof STAT_METRICS)[number], string> = {
  mealsServed: "Meals served",
  ordersDelivered: "Orders delivered",
  customersServed: "Customers served",
  activeSubscribers: "Active subscribers",
  reviewCount: "Number of reviews",
  averageRating: "Average rating",
};

export const BANNER_TONES = ["brand", "fresh", "ink"] as const;

const heroSchema = z.object({
  eyebrow: optionalText(80),
  title: optionalText(160),
  subtitle: optionalText(400),
  primaryCtaLabel: optionalText(40),
  primaryCtaHref: href,
  secondaryCtaLabel: optionalText(40),
  secondaryCtaHref: href,
  imageId: optionalText(80),
});

const statsSchema = z.object({
  show: z.boolean(),
  items: z
    .array(
      z.object({
        metric: z.enum(STAT_METRICS),
        label: z.string().trim().min(1, "Give this figure a label").max(60),
      }),
    )
    .max(6, "At most six figures fit on the hero"),
});

const bannersSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1, "An identifier is required").max(60),
        title: z.string().trim().min(1, "A title is required").max(120),
        subtitle: optionalText(240),
        ctaLabel: optionalText(40),
        ctaHref: href,
        tone: z.enum(BANNER_TONES),
        active: z.boolean(),
      }),
    )
    .max(8, "At most eight banners"),
});

const featuredSchema = z.object({
  dishCodes: z.array(z.string().trim().min(1).max(40)).max(12, "At most twelve dishes"),
  offerCodes: z.array(z.string().trim().min(1).max(40)).max(12, "At most twelve offers"),
});

const deliveryInfoSchema = z.object({
  title: optionalText(120),
  description: optionalText(400),
  note: optionalText(240),
});

const storySchema = z.object({
  eyebrow: optionalText(80),
  title: optionalText(160),
  paragraphs: z
    .array(z.string().trim().min(1, "An empty paragraph cannot be saved").max(1200))
    .max(8, "At most eight paragraphs"),
  signature: optionalText(80),
  signatureRole: optionalText(80),
});

const milestonesSchema = z.object({
  items: z
    .array(
      z.object({
        year: z.string().trim().min(4, "Use a four-digit year").max(9),
        title: z.string().trim().min(1, "A title is required").max(120),
        description: z.string().trim().max(400),
      }),
    )
    .max(20, "At most twenty milestones"),
});

const teamSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, "A name is required").max(80),
        role: z.string().trim().min(1, "A role is required").max(80),
        bio: optionalText(400),
        experience: optionalText(40),
        speciality: optionalText(80),
        imageId: optionalText(80),
        initials: optionalText(4),
      }),
    )
    .max(24, "At most twenty-four people"),
});

/**
 * Every editable block, keyed exactly as the API keys them. The key registry
 * itself lives in the API client, since it is part of the wire contract.
 */
export const CONTENT_SCHEMAS: { [K in ContentKey]: z.ZodType } = {
  "home.hero": heroSchema,
  "home.stats": statsSchema,
  "home.banners": bannersSchema,
  "home.featured": featuredSchema,
  "home.deliveryInfo": deliveryInfoSchema,
  "about.story": storySchema,
  "about.milestones": milestonesSchema,
  "about.team": teamSchema,
};

export const CONTENT_LABEL: Record<ContentKey, string> = {
  "home.hero": "Hero banner",
  "home.stats": "Homepage statistics",
  "home.banners": "Promo banners",
  "home.featured": "Featured items",
  "home.deliveryInfo": "Delivery info",
  "about.story": "Our story",
  "about.milestones": "Milestones",
  "about.team": "Team",
};

export const CONTENT_DESCRIPTION: Record<ContentKey, string> = {
  "home.hero": "The headline, sub-heading and the two call-to-action buttons at the top of the homepage.",
  "home.stats":
    "Which live figures the hero shows and how they are worded. The numbers themselves come from the database and cannot be typed here.",
  "home.banners": "The promotional strips below the hero. Switch one off to hide it without deleting it.",
  "home.featured": "Dish codes and coupon codes the homepage pulls forward. Codes must already exist in the catalogue.",
  "home.deliveryInfo": "The wording of the delivery-areas block on the homepage.",
  "about.story": "The opening narrative on the About page.",
  "about.milestones": "The dated timeline on the About page.",
  "about.team": "The people shown on the About page.",
};

/* ========================================================================== */
/*  Blank drafts                                                              */
/* ========================================================================== */

/**
 * What a block that nobody has authored looks like in the editor.
 *
 * Every field is empty on purpose. A block with no row in the database renders
 * nothing on the storefront, so seeding the form with sample copy would invite
 * an operator to publish words they never wrote.
 */
export const BLANK_CONTENT: { [K in ContentKey]: ContentBlockMap[K] } = {
  "home.hero": {},
  "home.stats": { show: true, items: [] },
  "home.banners": { items: [] },
  "home.featured": { dishCodes: [], offerCodes: [] },
  "home.deliveryInfo": {},
  "about.story": { paragraphs: [] },
  "about.milestones": { items: [] },
  "about.team": { items: [] },
};

/* ========================================================================== */
/*  Reading an unknown payload back into a draft                              */
/* ========================================================================== */

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optional(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function toHero(raw: unknown): HeroContent {
  const value = asRecord(raw);
  return {
    eyebrow: optional(value.eyebrow),
    title: optional(value.title),
    subtitle: optional(value.subtitle),
    primaryCtaLabel: optional(value.primaryCtaLabel),
    primaryCtaHref: optional(value.primaryCtaHref),
    secondaryCtaLabel: optional(value.secondaryCtaLabel),
    secondaryCtaHref: optional(value.secondaryCtaHref),
    imageId: optional(value.imageId),
  };
}

function toStats(raw: unknown): StatsContent {
  const value = asRecord(raw);
  return {
    show: value.show !== false,
    items: list(value.items).map((entry) => {
      const item = asRecord(entry);
      return {
        metric: oneOf(item.metric, STAT_METRICS, "mealsServed"),
        label: text(item.label),
      };
    }),
  };
}

function toBanners(raw: unknown): BannersContent {
  return {
    items: list(asRecord(raw).items).map((entry) => {
      const item = asRecord(entry);
      return {
        id: text(item.id),
        title: text(item.title),
        subtitle: optional(item.subtitle),
        ctaLabel: optional(item.ctaLabel),
        ctaHref: optional(item.ctaHref),
        tone: oneOf(item.tone, BANNER_TONES, "brand"),
        active: item.active !== false,
      };
    }),
  };
}

function toFeatured(raw: unknown): FeaturedContent {
  const value = asRecord(raw);
  return {
    dishCodes: list(value.dishCodes).map(text).filter(Boolean),
    offerCodes: list(value.offerCodes).map(text).filter(Boolean),
  };
}

function toDeliveryInfo(raw: unknown): DeliveryInfoContent {
  const value = asRecord(raw);
  return {
    title: optional(value.title),
    description: optional(value.description),
    note: optional(value.note),
  };
}

function toStory(raw: unknown): StoryContent {
  const value = asRecord(raw);
  return {
    eyebrow: optional(value.eyebrow),
    title: optional(value.title),
    paragraphs: list(value.paragraphs).map(text),
    signature: optional(value.signature),
    signatureRole: optional(value.signatureRole),
  };
}

function toMilestones(raw: unknown): MilestonesContent {
  return {
    items: list(asRecord(raw).items).map((entry) => {
      const item = asRecord(entry);
      return { year: text(item.year), title: text(item.title), description: text(item.description) };
    }),
  };
}

function toTeam(raw: unknown): TeamContent {
  return {
    items: list(asRecord(raw).items).map((entry) => {
      const item = asRecord(entry);
      return {
        name: text(item.name),
        role: text(item.role),
        bio: optional(item.bio),
        experience: optional(item.experience),
        speciality: optional(item.speciality),
        imageId: optional(item.imageId),
        initials: optional(item.initials),
      };
    }),
  };
}

/**
 * Turn whatever the API returned for a key into a fully-shaped draft.
 *
 * The panel and the API deploy separately, so a stored block may predate a
 * field or carry one that has since been dropped. Every value is rebuilt field
 * by field rather than cast, so a surprise on the wire costs one empty input
 * instead of a crashed form.
 */
export function toContentDraft<K extends ContentKey>(key: K, raw: unknown): ContentBlockMap[K] {
  const readers: { [P in ContentKey]: (input: unknown) => ContentBlockMap[P] } = {
    "home.hero": toHero,
    "home.stats": toStats,
    "home.banners": toBanners,
    "home.featured": toFeatured,
    "home.deliveryInfo": toDeliveryInfo,
    "about.story": toStory,
    "about.milestones": toMilestones,
    "about.team": toTeam,
  };
  return readers[key](raw);
}

/* ========================================================================== */
/*  Validation                                                                */
/* ========================================================================== */

export type ContentValidation =
  | { ok: true; value: unknown }
  | { ok: false; errors: Record<string, string[]> };

/** `["items", 0, "label"]` → `"items.0.label"`, the key the form fields use. */
export function fieldPath(path: readonly PropertyKey[]): string {
  return path.map((part) => String(part)).join(".");
}

/**
 * Validate a draft against its block's shape.
 *
 * The draft is checked exactly as typed — so a blank required field reports
 * "a title is required" against that row rather than a type error — and only
 * the accepted result has its empty optional strings dropped. The storefront
 * treats a missing field as "render nothing", and an empty string would
 * otherwise reserve space for a headline that does not exist.
 */
export function validateContent(key: ContentKey, draft: unknown): ContentValidation {
  const parsed = CONTENT_SCHEMAS[key].safeParse(draft);
  if (parsed.success) return { ok: true, value: stripEmpty(parsed.data) };

  const errors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const path = fieldPath(issue.path) || "_";
    errors[path] = [...(errors[path] ?? []), issue.message];
  }
  return { ok: false, errors };
}

/** Recursively removes `""` and `undefined` object entries. Arrays are kept as-is. */
function stripEmpty(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripEmpty);
  if (typeof value !== "object" || value === null) return value;

  const result: Record<string, unknown> = {};
  for (const [field, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry === undefined) continue;
    if (typeof entry === "string" && entry.trim().length === 0) continue;
    result[field] = stripEmpty(entry);
  }
  return result;
}
