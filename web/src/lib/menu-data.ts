/**
 * The live catalogue, read from PostgreSQL through the API.
 *
 * This is the storefront's source of truth for what is on the menu. The
 * hardcoded catalogue in `@/data/menu` is no longer what customers see: it
 * could not be, because nothing an admin did in the panel could change it. A
 * dish switched off stayed on sale and a dish added never appeared.
 *
 * `GET /api/menu` already excludes unavailable dishes — its `available` query
 * parameter defaults to `"true"` server-side — so filtering is enforced by the
 * API rather than re-implemented here, where it could drift.
 */
import { categories as fallbackCategories, menuItems as fallbackItems } from "@/data/menu";
import type { CategorySlug, DishTag, MenuCategory, MenuItem, SpiceLevel } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * How stale the menu may be.
 *
 * An availability change reaches customers within this window without anyone
 * redeploying. The admin panel also asks for an immediate refresh after every
 * edit (see `/api/revalidate-menu`), so this is the backstop rather than the
 * mechanism.
 */
export const MENU_REVALIDATE_SECONDS = 60;

/**
 * Bounded, because this runs during static generation and Vercel kills a page
 * that takes longer than 60s to render. Browser and Node `fetch` have no
 * response timeout of their own — a backend that accepts the connection and
 * then stalls would hang the build. Same reasoning as `storefront-data.ts`.
 */
const REQUEST_TIMEOUT_MS = 6_000;

export interface ApiMenuItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  imageId: string;
  isVeg: boolean;
  isJain: boolean;
  spiceLevel: string;
  prepTime: number;
  calories: number;
  protein: number | null;
  serves: string;
  rating: number;
  ratingCount: number;
  tags: string[];
  addOns: { id: string; label: string; price: number }[];
  available: boolean;
}

interface ApiGroup {
  category: MenuCategory & { id: string };
  items: ApiMenuItem[];
}

export interface MenuCatalogue {
  items: MenuItem[];
  categories: MenuCategory[];
  /** False when the API could not be reached and the bundled copy is standing in. */
  live: boolean;
}

/** Shared with the admin panel, which renders the same rich MenuItem type. */
export function toMenuItem(raw: ApiMenuItem): MenuItem {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    category: raw.category as CategorySlug,
    price: raw.price,
    ...(raw.compareAtPrice != null ? { compareAtPrice: raw.compareAtPrice } : {}),
    imageId: raw.imageId,
    isVeg: true,
    isJain: raw.isJain,
    spiceLevel: raw.spiceLevel as SpiceLevel,
    prepTime: raw.prepTime,
    calories: raw.calories,
    ...(raw.protein != null ? { protein: raw.protein } : {}),
    serves: raw.serves,
    rating: raw.rating,
    ratingCount: raw.ratingCount,
    tags: raw.tags as DishTag[],
    addOns: raw.addOns ?? [],
    available: raw.available,
  };
}

/**
 * Every dish a customer may order, with its categories.
 *
 * On failure this falls back to the bundled catalogue rather than returning
 * nothing. An empty menu is the worst possible outcome for a restaurant, and
 * the fallback is self-correcting: the next successful revalidation replaces
 * it. The trade-off is that during an outage a dish switched off may still be
 * listed, which is why the failure is logged rather than swallowed.
 */
export async function getMenuCatalogue(): Promise<MenuCatalogue> {
  const fallback: MenuCatalogue = {
    items: fallbackItems.filter((item) => item.available),
    categories: fallbackCategories,
    live: false,
  };

  if (!API_URL) {
    console.warn("[menu-data] NEXT_PUBLIC_API_URL is unset; serving the bundled catalogue");
    return fallback;
  }

  try {
    const response = await fetch(`${API_URL}/menu?grouped=true`, {
      next: { revalidate: MENU_REVALIDATE_SECONDS, tags: ["menu"] },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = (await response.json()) as { data?: ApiGroup[] };
    const groups = payload.data ?? [];
    if (groups.length === 0) throw new Error("empty catalogue");

    const items = groups.flatMap((group) => group.items.map(toMenuItem));
    if (items.length === 0) throw new Error("no dishes returned");

    return {
      items,
      // Only categories that actually have something to sell.
      categories: groups
        .filter((group) => group.items.length > 0)
        .map(({ category }) => ({
          slug: category.slug,
          name: category.name,
          tagline: category.tagline,
          icon: category.icon,
          order: category.order,
        })),
      live: true,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.warn(`[menu-data] live catalogue unavailable (${reason}); serving the bundled copy`);
    return fallback;
  }
}

/* ========================================================================== */
/*  Selections over the live catalogue                                        */
/* ========================================================================== */

/*
 * These mirror the helpers in `@/data/menu`, but take the catalogue as an
 * argument instead of closing over the bundled array. That is the whole point:
 * the same selection logic, applied to what is actually on sale right now.
 */

export function pickBestSellers(items: MenuItem[], limit = 8): MenuItem[] {
  return items
    .filter((item) => item.tags.includes("bestseller"))
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .slice(0, limit);
}

/**
 * A stable daily rotation — the same dishes all day, a different set tomorrow.
 * Derived from the day of the year so it needs no stored state, and guarded
 * against an empty pool (`% 0` is NaN, which would slice nothing).
 */
export function pickTodaysSpecial(items: MenuItem[], limit = 4, today = new Date()): MenuItem[] {
  const pool = items.filter(
    (item) => item.tags.includes("chef-special") || item.tags.includes("bestseller"),
  );
  if (pool.length === 0) return [];

  const start = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  const offset = dayOfYear % pool.length;
  return [...pool.slice(offset), ...pool.slice(0, offset)].slice(0, limit);
}

export function countInCategory(items: MenuItem[], slug: string): number {
  return items.filter((item) => item.category === slug).length;
}

export function startingPriceInCategory(items: MenuItem[], slug: string): number {
  const prices = items.filter((item) => item.category === slug).map((item) => item.price);
  return prices.length ? Math.min(...prices) : 0;
}
