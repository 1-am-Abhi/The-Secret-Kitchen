"use client";

import * as React from "react";
import { SearchX } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  visibleGalleryCategories,
  getGalleryImages,
  type GalleryCategoryId,
} from "@/data/gallery";

import { GalleryLightbox } from "./gallery-lightbox";
import { GalleryTile } from "./gallery-tile";

/**
 * Client island for the gallery: filter chips, the masonry canvas and the
 * lightbox. Everything else on the page stays a server component.
 */
export function GalleryExplorer() {
  const [category, setCategory] = React.useState<GalleryCategoryId>("all");
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const images = React.useMemo(() => getGalleryImages(category), [category]);

  function selectCategory(next: GalleryCategoryId) {
    setCategory(next);
    // The lightbox indexes into the *visible* list, so a stale index would point
    // at the wrong photograph once the filter changes. Close it instead.
    setOpenIndex(null);
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Filter photographs by subject"
        className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
      >
        {visibleGalleryCategories().map((chip) => {
          const active = chip.id === category;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => selectCategory(chip.id)}
              aria-pressed={active}
              className={cn(
                "shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-300 ease-[var(--ease-out-expo)]",
                active
                  ? "border-transparent bg-ink-900 text-white shadow-lift"
                  : "border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "ml-2 text-xs tabular-nums",
                  active ? "text-white/60" : "text-ink-400",
                )}
              >
                {getGalleryImages(chip.id).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* TRUE MASONRY, not a grid: CSS multi-column lets every tile keep its own
          height (driven by the `aspect` field in src/data/gallery.ts) and packs
          the next tile straight underneath it. A CSS grid would force uniform
          rows and defeat the point. */}
      {images.length > 0 ? (
        <div
          // Re-keying on the filter remounts the column flow, so the new set
          // fades in rather than shuffling tiles between columns mid-transition.
          key={category}
          className="mt-10 columns-1 gap-4 animate-in fade-in-0 duration-500 sm:columns-2 sm:gap-5 lg:columns-3 xl:columns-4"
        >
          {images.map((image, index) => (
            <GalleryTile key={image.id} image={image} onOpen={() => setOpenIndex(index)} />
          ))}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <SearchX className="size-8 text-ink-300" aria-hidden />
          <p className="text-ink-500">No photographs in this collection yet — check back soon.</p>
        </div>
      )}

      <GalleryLightbox images={images} index={openIndex} onIndexChange={setOpenIndex} />
    </div>
  );
}
