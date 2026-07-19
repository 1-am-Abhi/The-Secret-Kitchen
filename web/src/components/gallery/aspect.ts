import type { GalleryImage } from "@/types";

/**
 * SINGLE SOURCE OF TRUTH FOR TILE SHAPE.
 *
 * The masonry layout and the lightbox both derive their geometry from the
 * `aspect` field on each GalleryImage — never from the photograph's own
 * dimensions and never from a hardcoded height in the markup.
 *
 * WHY: real photography is going to replace the current stock set later. As
 * long as each entry in `src/data/gallery.ts` declares the shape it wants, the
 * new files can be any pixel size at all and the grid will not shift, reflow or
 * need a single CSS change. Layout stays data-driven; only the data changes.
 */
export const ASPECT_CLASS: Record<GalleryImage["aspect"], string> = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
};

/** Lightbox frame ratios — wider than the tile so large photos fill the dialog. */
export const LIGHTBOX_ASPECT_CLASS: Record<GalleryImage["aspect"], string> = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[16/10]",
  square: "aspect-square",
};
