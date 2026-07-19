import { getImage } from "@/config/images";
import type { GalleryImage } from "@/types";

/**
 * GALLERY CONTENT
 *
 * Each entry pairs a registry key from `src/config/images.ts` with an `aspect`
 * that declares the shape the tile should occupy in the masonry layout.
 *
 * IMPORTANT — why `aspect` lives here and not in the layout:
 * the gallery grid reads this field and nothing else to decide tile height.
 * When the real food photography lands, swapping `imageId` targets in the image
 * registry (and, if the crop differs, the `aspect` value on the row below) is
 * the entire change. No component, no CSS and no grid definition has to move.
 * That is the whole point of keeping shape as data rather than as markup.
 *
 * Captions are written as real captions — what is happening, when, and why it
 * matters — because they are read aloud by screen readers and shown on hover.
 */
export const galleryImages: GalleryImage[] = [
  /* ---- Dishes ---------------------------------------------------------- */
  {
    id: "gal-01",
    imageId: "north-indian-4",
    caption: "Paneer butter masala, finished in the copper kadai it is served from",
    category: "dishes",
    aspect: "portrait",
  },
  {
    id: "gal-02",
    imageId: "north-indian-2",
    caption: "Paneer tikka off the grill — capsicum, onion and a squeeze of lime",
    category: "dishes",
    aspect: "landscape",
  },
  {
    id: "gal-03",
    imageId: "north-indian-3",
    caption: "Amritsari chole with kulcha, simmered for three hours before service",
    category: "dishes",
    aspect: "landscape",
  },
  {
    id: "gal-04",
    imageId: "north-indian-1",
    caption: "The house mixed-vegetable sabzi, coriander added off the heat",
    category: "dishes",
    aspect: "portrait",
  },
  {
    id: "gal-05",
    imageId: "pasta-3",
    caption: "Penne in our slow-cooked red sauce, eleven recipe attempts in the making",
    category: "dishes",
    aspect: "square",
  },
  {
    id: "gal-06",
    imageId: "maggi-1",
    caption: "Midnight masala maggi — the order that never stops coming in",
    category: "dishes",
    aspect: "landscape",
  },
  {
    id: "gal-07",
    imageId: "idli-1",
    caption: "Idli from batter fermented overnight, with coconut chutney ground at 6 AM",
    category: "dishes",
    aspect: "landscape",
  },
  {
    id: "gal-08",
    imageId: "snacks-2",
    caption: "Samosas folded by hand every morning, fried once in fresh oil",
    category: "dishes",
    aspect: "landscape",
  },
  {
    id: "gal-09",
    imageId: "dessert-3",
    caption: "Weekend dessert special, cut to order rather than pre-portioned",
    category: "dishes",
    aspect: "portrait",
  },
  {
    id: "gal-10",
    imageId: "salad-1",
    caption: "The salad that rides along with every Premium tiffin box",
    category: "dishes",
    aspect: "portrait",
  },

  /* ---- Kitchen --------------------------------------------------------- */
  {
    id: "gal-11",
    imageId: "kitchen-1",
    caption: "The pass at 12:10 PM, mid lunch dispatch",
    category: "kitchen",
    aspect: "landscape",
  },
  {
    id: "gal-12",
    imageId: "ingredients-1",
    caption: "Whole spices ground in small batches every week, never bought pre-mixed",
    category: "kitchen",
    aspect: "landscape",
  },
  {
    id: "gal-13",
    imageId: "kitchen-2",
    caption: "Colour-coded boards — raw vegetables, cut fruit, dairy and cooked food never meet",
    category: "kitchen",
    aspect: "portrait",
  },
  {
    id: "gal-14",
    imageId: "kitchen-3",
    caption: "The post-service deep clean, logged and signed off by the shift lead",
    category: "kitchen",
    aspect: "square",
  },


  /* ---- Packaging ------------------------------------------------------- */
  {
    id: "gal-19",
    imageId: "packaging-1",
    caption: "Leak-proof, food-grade containers sealed at the pass",
    category: "packaging",
    aspect: "square",
  },
  {
    id: "gal-20",
    imageId: "packaging-2",
    caption: "Double-walled steel tiffin boxes that hold above 60°C for three hours",
    category: "packaging",
    aspect: "portrait",
  },
  {
    id: "gal-21",
    imageId: "packaging-3",
    caption: "Insulated thermal bags loaded for the Sector 62 run",
    category: "packaging",
    aspect: "landscape",
  },

  /* ---- Moments --------------------------------------------------------- */
  {
    id: "gal-22",
    imageId: "ambience-1",
    caption: "Our Sector 62 pickup counter, open for walk-in collection",
    category: "moments",
    aspect: "landscape",
  },
  {
    id: "gal-23",
    imageId: "ambience-2",
    caption: "The 9 PM wind-down after the last dinner tiffin goes out",
    category: "moments",
    aspect: "landscape",
  },
  {
    id: "gal-24",
    imageId: "beverage-3",
    caption: "Summer nimbu pudina on the house, through April to July",
    category: "moments",
    aspect: "portrait",
  },
];

export const galleryCategories = [
  { id: "all", label: "Everything" },
  { id: "dishes", label: "Dishes" },
  { id: "kitchen", label: "Our Kitchen" },
  { id: "team", label: "The Team" },
  { id: "packaging", label: "Packaging" },
  { id: "moments", label: "Moments" },
] as const;

export type GalleryCategoryId = (typeof galleryCategories)[number]["id"];

/**
 * Categories that actually have photographs behind them.
 *
 * A chip that filters to an empty grid looks broken; "The Team" in particular
 * stays hidden until real portraits are uploaded, rather than advertising a
 * section with nothing in it.
 */
export function visibleGalleryCategories(): { id: GalleryCategoryId; label: string }[] {
  return galleryCategories.filter(
    (category) => category.id === "all" || countByCategory(category.id) > 0,
  );
}

/**
 * Guards against two entries resolving to the SAME photograph.
 *
 * The registry maps several keys onto one file (a hero shot doubles as an offer
 * banner, which is fine), but two of those keys landing in the same grid reads
 * as a mistake — it previously put the same portrait on screen twice. Runs in
 * development only; a duplicate is a content bug to fix, not a reason to break
 * a production render.
 */
if (process.env.NODE_ENV !== "production") {
  const bySource = new Map<string, string[]>();
  for (const image of galleryImages) {
    const source = getImage(image.imageId).src;
    bySource.set(source, [...(bySource.get(source) ?? []), image.imageId]);
  }
  for (const [source, keys] of bySource) {
    if (keys.length > 1) {
      console.warn(
        `[gallery] ${keys.length} entries share one photograph (${keys.join(", ")}) — ${source.slice(0, 80)}`,
      );
    }
  }
}

/** `all` is a pseudo-category, so it short-circuits rather than filtering. */
export function getGalleryImages(category: GalleryCategoryId): GalleryImage[] {
  if (category === "all") return galleryImages;
  return galleryImages.filter((image) => image.category === category);
}

export function countByCategory(category: GalleryCategoryId): number {
  return getGalleryImages(category).length;
}
