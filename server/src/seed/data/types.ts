/**
 * Seed-time domain types.
 *
 * Copied from web/src/types/index.ts so the seed data modules below can be
 * lifted verbatim from the storefront's `src/data/*` files with only their
 * import path changed. Keeping them byte-identical is the point: it makes
 * re-syncing the catalogue a copy-paste rather than a translation exercise.
 */

export type CategorySlug =
  | "maggi"
  | "pasta"
  | "idli"
  | "paratha"
  | "north-indian"
  | "rice"
  | "sandwich"
  | "burgers"
  | "snacks"
  | "desserts"
  | "beverages";

export type SpiceLevel = "mild" | "medium" | "spicy";

export type DishTag =
  | "bestseller"
  | "new"
  | "chef-special"
  | "healthy"
  | "high-protein"
  | "jain-available"
  | "kids-favourite"
  | "value";

export interface MenuCategory {
  slug: CategorySlug;
  name: string;
  tagline: string;
  icon: string;
  order: number;
}

export interface MenuItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CategorySlug;
  price: number;
  compareAtPrice?: number;
  imageId: string;
  isVeg: true;
  isJain?: boolean;
  spiceLevel: SpiceLevel;
  prepTime: number;
  calories: number;
  protein?: number;
  serves: string;
  rating: number;
  ratingCount: number;
  tags: DishTag[];
  addOns?: { id: string; label: string; price: number }[];
  available: boolean;
}

export type PlanTier = "student" | "regular" | "premium";
export type BillingCycle = "weekly" | "monthly" | "custom";
export type MealSlot = "lunch" | "dinner" | "both";

export interface TiffinPlan {
  tier: PlanTier;
  name: string;
  headline: string;
  description: string;
  pricePerMeal: Record<Exclude<BillingCycle, "custom">, number>;
  mealsPerCycle: Record<Exclude<BillingCycle, "custom">, number>;
  includes: string[];
  excludes?: string[];
  highlight?: boolean;
  badge?: string;
  imageId: string;
}

export interface Review {
  id: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  quote: string;
  initials: string;
  date: string;
  verified: boolean;
}

export interface Offer {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: "percentage" | "flat" | "freebie";
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  validUntil: string;
  terms: string[];
  imageId: string;
  featured?: boolean;
  appliesTo?: "order" | "subscription";
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: "ordering" | "delivery" | "tiffin" | "food" | "payments";
}

export interface GalleryRow {
  id: string;
  imageId: string;
  caption: string;
  category: "dishes" | "kitchen" | "team" | "packaging" | "moments";
  aspect: "portrait" | "landscape" | "square";
}
