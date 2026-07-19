import type {
  AddOn,
  Category,
  DishTag,
  GalleryImage,
  MenuItem,
  Offer,
  Review,
  SpiceLevel,
  TiffinPlan,
} from "@prisma/client";

/**
 * Prisma row → storefront DTO.
 *
 * The database uses SCREAMING_SNAKE enums (Postgres convention) while
 * web/src/types/index.ts uses kebab-case string unions. Translating here — in
 * one place, on the way out — means the Next.js app can swap its local data
 * modules for `fetch("/api/menu")` without touching a single component.
 */

const SPICE_OUT: Record<SpiceLevel, string> = {
  MILD: "mild",
  MEDIUM: "medium",
  SPICY: "spicy",
};

const TAG_OUT: Record<DishTag, string> = {
  BESTSELLER: "bestseller",
  NEW: "new",
  CHEF_SPECIAL: "chef-special",
  HEALTHY: "healthy",
  HIGH_PROTEIN: "high-protein",
  JAIN_AVAILABLE: "jain-available",
  KIDS_FAVOURITE: "kids-favourite",
  VALUE: "value",
};

export function toSpiceLevel(value: SpiceLevel): string {
  return SPICE_OUT[value];
}

export function toTag(value: DishTag): string {
  return TAG_OUT[value];
}

type MenuItemWithRelations = MenuItem & { addOns?: AddOn[]; category?: Category | null };

export function mapMenuItem(item: MenuItemWithRelations): Record<string, unknown> {
  return {
    id: item.id,
    code: item.code,
    slug: item.slug,
    name: item.name,
    description: item.description,
    category: item.category?.slug ?? null,
    categoryId: item.categoryId,
    price: item.price,
    compareAtPrice: item.compareAtPrice ?? undefined,
    imageId: item.imageId,
    imageUrl: item.imageUrl ?? undefined,
    isVeg: item.isVeg,
    isJain: item.isJain,
    spiceLevel: toSpiceLevel(item.spiceLevel),
    prepTime: item.prepTime,
    calories: item.calories,
    protein: item.protein ?? undefined,
    serves: item.serves,
    rating: item.rating,
    ratingCount: item.ratingCount,
    tags: item.tags.map(toTag),
    addOns: (item.addOns ?? []).map((addOn) => ({
      id: addOn.code,
      label: addOn.label,
      price: addOn.price,
    })),
    available: item.available,
  };
}

export function mapCategory(
  category: Category & { _count?: { items: number } },
): Record<string, unknown> {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    tagline: category.tagline,
    icon: category.icon,
    order: category.sortOrder,
    itemCount: category._count?.items,
  };
}

export function mapPlan(plan: TiffinPlan): Record<string, unknown> {
  return {
    id: plan.id,
    tier: plan.tier.toLowerCase(),
    name: plan.name,
    headline: plan.headline,
    description: plan.description,
    pricePerMeal: { weekly: plan.weeklyPricePerMeal, monthly: plan.monthlyPricePerMeal },
    mealsPerCycle: { weekly: plan.weeklyMeals, monthly: plan.monthlyMeals },
    includes: plan.includes,
    excludes: plan.excludes,
    badge: plan.badge ?? undefined,
    highlight: plan.highlight,
    imageId: plan.imageId,
    imageUrl: plan.imageUrl ?? undefined,
  };
}

export function mapOffer(offer: Offer): Record<string, unknown> {
  return {
    id: offer.id,
    code: offer.code,
    title: offer.title,
    description: offer.description,
    discountType: offer.discountType.toLowerCase(),
    discountValue: offer.discountValue,
    minOrder: offer.minOrder,
    maxDiscount: offer.maxDiscount ?? undefined,
    validUntil: offer.validUntil.toISOString().slice(0, 10),
    terms: offer.terms,
    imageId: offer.imageId,
    imageUrl: offer.imageUrl ?? undefined,
    featured: offer.featured,
    appliesTo: offer.appliesTo.toLowerCase(),
  };
}

export function mapReview(review: Review): Record<string, unknown> {
  return {
    id: review.id,
    name: review.name,
    role: review.role,
    location: review.location,
    rating: review.rating,
    quote: review.quote,
    initials: review.initials,
    date: review.reviewDate.toISOString().slice(0, 10),
    verified: review.verified,
  };
}

export function mapGalleryImage(image: GalleryImage): Record<string, unknown> {
  return {
    id: image.id,
    imageId: image.imageId,
    imageUrl: image.imageUrl ?? undefined,
    caption: image.caption,
    category: image.category.toLowerCase(),
    aspect: image.aspect.toLowerCase(),
    sortOrder: image.sortOrder,
  };
}
