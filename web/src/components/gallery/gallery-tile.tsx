"use client";

import { Maximize2 } from "lucide-react";

import { FoodImage } from "@/components/ui/food-image";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/types";

import { ASPECT_CLASS } from "./aspect";

/**
 * One masonry cell. It is a <button> rather than a div-with-onClick so it is
 * reachable by Tab and activates on Enter and Space for free.
 */
export function GalleryTile({
  image,
  onOpen,
}: {
  image: GalleryImage;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      // break-inside-avoid is what stops a CSS-columns tile splitting across
      // two columns — without it the masonry looks torn at some viewport widths.
      className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-ink-100 text-left shadow-soft transition-shadow duration-500 hover:shadow-lift sm:mb-5"
      aria-label={`View larger: ${image.caption}`}
    >
      <div className={cn("relative w-full", ASPECT_CLASS[image.aspect])}>
        <FoodImage
          imageId={image.imageId}
          alt={image.caption}
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1280px) 31vw, 23vw"
          className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
        />
      </div>

      {/* Caption veil. Hidden until hover/focus on pointer devices, but always
          present in the DOM so screen readers and touch users get the text. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink-900/85 via-ink-900/25 to-transparent p-5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300">
          {image.category}
        </span>
        <span className="mt-1.5 text-sm leading-snug text-white">{image.caption}</span>
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-4 flex size-9 translate-y-1 items-center justify-center rounded-full bg-white/85 text-ink-800 opacity-0 backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
      >
        <Maximize2 className="size-4" />
      </span>
    </button>
  );
}
