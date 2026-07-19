import Image, { type ImageProps } from "next/image";

import { BLUR_DATA_URL, getImage } from "@/config/images";
import { cn } from "@/lib/utils";

type FoodImageProps = Omit<ImageProps, "src" | "alt" | "placeholder" | "blurDataURL"> & {
  /** Registry key from src/config/images.ts. */
  imageId: string;
  /** Overrides the registry alt text — use when context makes it more specific. */
  alt?: string;
  className?: string;
};

/**
 * Every food photo on the site renders through this component.
 *
 * Centralising it means the registry indirection, blur placeholder and
 * responsive `sizes` hints are applied consistently — and swapping the whole
 * photo set later touches one data file rather than dozens of components.
 */
export function FoodImage({
  imageId,
  alt,
  className,
  fill = true,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  ...props
}: FoodImageProps) {
  const asset = getImage(imageId);

  return (
    <Image
      src={asset.src}
      alt={alt ?? asset.alt}
      fill={fill}
      sizes={sizes}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      className={cn("object-cover", className)}
      {...props}
    />
  );
}
