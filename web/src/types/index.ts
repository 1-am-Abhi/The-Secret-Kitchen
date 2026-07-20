/** Shared domain types. Mirrors the Prisma models in ../../server/prisma. */

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
  /** Short line shown under the category name on cards and rails. */
  tagline: string;
  /** Lucide icon name resolved through the icon map in the UI layer. */
  icon: string;
  /** Display order across menu page, home rail and admin. */
  order: number;
}

export interface MenuItem {
  id: string;
  /** Kitchen-facing short code (e.g. "nin-06"). Required by the API on create. */
  code?: string;
  slug: string;
  name: string;
  description: string;
  category: CategorySlug;
  price: number;
  /** Original price when the item is discounted — renders as a struck-through. */
  compareAtPrice?: number;
  imageId: string;
  /** Every dish is vegetarian; the flag keeps the badge logic explicit. */
  isVeg: true;
  /** Contains no onion or garlic — relevant to a large share of our customers. */
  isJain?: boolean;
  spiceLevel: SpiceLevel;
  /** Kitchen-to-doorstep estimate in minutes. */
  prepTime: number;
  calories: number;
  /** Grams of protein per serving — surfaced on the healthy/high-protein filter. */
  protein?: number;
  serves: string;
  rating: number;
  ratingCount: number;
  tags: DishTag[];
  /** Optional add-ons offered in the quick-view dialog. */
  addOns?: { id: string; label: string; price: number }[];
  available: boolean;
}

export interface CartLine {
  itemId: string;
  slug: string;
  name: string;
  price: number;
  imageId: string;
  quantity: number;
  /** Chosen add-on ids, priced on top of the base item. */
  addOnIds?: string[];
  addOnTotal?: number;
  note?: string;
}

/* ---- Tiffin subscription ------------------------------------------------ */

export type PlanTier = "student" | "regular" | "premium";
export type BillingCycle = "weekly" | "monthly" | "custom";
export type MealSlot = "lunch" | "dinner" | "both";

export interface TiffinPlan {
  tier: PlanTier;
  name: string;
  headline: string;
  description: string;
  /** Price per meal for each billing cycle, in rupees. */
  pricePerMeal: Record<Exclude<BillingCycle, "custom">, number>;
  /** Meals included in one billing period, per cycle. */
  mealsPerCycle: Record<Exclude<BillingCycle, "custom">, number>;
  includes: string[];
  excludes?: string[];
  highlight?: boolean;
  badge?: string;
  imageId: string;
}

export type SubscriptionStatus = "active" | "paused" | "cancelled" | "pending";

export interface Subscription {
  id: string;
  planTier: PlanTier;
  cycle: BillingCycle;
  slot: MealSlot;
  status: SubscriptionStatus;
  startDate: string;
  nextDeliveryDate: string;
  mealsRemaining: number;
  /** ISO dates the customer has chosen to skip. */
  skippedDates: string[];
  addressLabel: string;
}

/** One row of the published sample weekly menu. */
export interface WeeklyMenuDay {
  day: string;
  lunch: string[];
  dinner: string[];
  sweet?: string;
}

/* ---- Build-your-tiffin -------------------------------------------------- */

export type TiffinComponentGroup =
  | "chapati"
  | "rice"
  | "dal"
  | "sabzi"
  | "paneer"
  | "sweet"
  | "salad";

export interface TiffinComponent {
  id: string;
  group: TiffinComponentGroup;
  label: string;
  description: string;
  price: number;
  calories: number;
  protein: number;
  /** Marks the option preselected when the builder first mounts. */
  default?: boolean;
}

/* ---- Marketing content -------------------------------------------------- */

export interface Review {
  id: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  quote: string;
  /** Initials rendered in the avatar when no photo exists. */
  initials: string;
  date: string;
  verified: boolean;
}

export interface Offer {
  id: string;
  code: string;
  title: string;
  description: string;
  /** Percentage (0-100) or flat rupee amount, per `type`. */
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

export interface GalleryImage {
  id: string;
  imageId: string;
  caption: string;
  category: "dishes" | "kitchen" | "team" | "packaging" | "moments";
  /** Drives masonry row-span so the grid reads as an editorial layout. */
  aspect: "portrait" | "landscape" | "square";
}

export interface DeliveryArea {
  name: string;
  pincode: string;
  etaMinutes: number;
  /** Free-delivery zones are highlighted in the coverage grid. */
  freeDelivery: boolean;
}
