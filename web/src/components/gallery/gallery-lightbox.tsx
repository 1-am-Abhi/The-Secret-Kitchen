"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FoodImage } from "@/components/ui/food-image";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/types";

import { LIGHTBOX_ASPECT_CLASS } from "./aspect";

interface GalleryLightboxProps {
  /** The filtered set currently on screen — arrow keys walk this, not the full set. */
  images: GalleryImage[];
  /** Index into `images`, or null when closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

/**
 * Full-screen viewer.
 *
 * Built on the Radix Dialog primitive, which already supplies the two hardest
 * accessibility requirements: a focus trap while open and Escape-to-close with
 * focus restored to the tile that opened it. We add arrow-key paging on top.
 */
export function GalleryLightbox({ images, index, onIndexChange }: GalleryLightboxProps) {
  const open = index !== null;
  const image = index !== null ? images[index] : undefined;

  // Wrap-around paging so the viewer never dead-ends at either edge.
  const step = React.useCallback(
    (delta: number) => {
      if (index === null || images.length === 0) return;
      onIndexChange((index + delta + images.length) % images.length);
    },
    [index, images.length, onIndexChange],
  );

  // Bound to the window rather than the dialog node: Radix moves focus to the
  // close button, and a keydown handler on the content would miss keys pressed
  // while focus sits on the portalled overlay.
  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, step]);

  if (!image) return null;

  const position = (index ?? 0) + 1;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogContent
        hideClose
        className="max-w-5xl border-none bg-transparent p-0 shadow-none"
      >
        {/* Title/description are required by Radix for the dialog's a11y contract;
            the caption doubles as both, so the description is visually hidden. */}
        <DialogTitle className="sr-only">{image.caption}</DialogTitle>
        <DialogDescription className="sr-only">
          Photograph {position} of {images.length}. Use the left and right arrow keys to move
          between photographs, or Escape to close.
        </DialogDescription>

        <div className="relative">
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-3xl bg-ink-900 shadow-float",
              LIGHTBOX_ASPECT_CLASS[image.aspect],
            )}
          >
            <FoodImage
              imageId={image.imageId}
              alt={image.caption}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-contain"
              priority
            />
          </div>

          <div className="mt-4 flex items-start justify-between gap-6 px-1">
            <div>
              <p className="text-sm font-medium leading-relaxed text-white sm:text-base">
                {image.caption}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/50">
                {image.category} · {position} / {images.length}
              </p>
            </div>
          </div>

          {/* Controls sit outside the photo on desktop, over it on small screens. */}
          <DialogClose
            aria-label="Close photograph"
            className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-ink-900/70 text-white backdrop-blur transition-colors hover:bg-brand-500"
          >
            <X className="size-5" />
          </DialogClose>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photograph"
                className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink-900/70 text-white backdrop-blur transition-colors hover:bg-brand-500 lg:-left-16"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photograph"
                className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink-900/70 text-white backdrop-blur transition-colors hover:bg-brand-500 lg:-right-16"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
