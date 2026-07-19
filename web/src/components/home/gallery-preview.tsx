import Link from "next/link";

import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { FoodImage } from "@/components/ui/food-image";
import { cn } from "@/lib/utils";

/**
 * Gallery preview — an asymmetric editorial mosaic rather than a uniform grid,
 * so it reads as a magazine spread. `span` classes drive the layout, which
 * means swapping the photos later needs no layout change.
 */
const TILES: { imageId: string; caption: string; span: string }[] = [
  {
    imageId: "hero-1",
    caption: "The full thali spread",
    span: "col-span-2 row-span-2",
  },
  { imageId: "kitchen-1", caption: "Our kitchen, every morning", span: "col-span-2" },
  { imageId: "paratha-3", caption: "Aloo paratha, straight off the tawa", span: "" },
  { imageId: "dessert-1", caption: "Gulab jamun in rose syrup", span: "" },
  { imageId: "north-indian-2", caption: "Paneer on the grill", span: "col-span-2" },
  { imageId: "beverage-3", caption: "Rose lassi in a kulhad", span: "" },
  { imageId: "team-1", caption: "Chef Meenakshi at the pass", span: "" },
];

export function GalleryPreview() {
  return (
    <Section tone="muted">
      <div className="container-page">
        <SectionHeading
          eyebrow="Inside the kitchen"
          title="No filters, no stock photos of someone else's food"
          description="We photograph our own dishes and post kitchen shots every week. What you see is what arrives."
          align="left"
          action={{ label: "View full gallery", href: "/gallery" }}
        />

        <Stagger
          className="mt-12 grid auto-rows-[10rem] grid-cols-2 gap-3 sm:auto-rows-[11rem] sm:grid-cols-4 lg:auto-rows-[13rem]"
          stagger={0.07}
        >
          {TILES.map((tile) => (
            <StaggerItem key={tile.imageId + tile.caption} className={cn(tile.span)}>
              <Link
                href="/gallery"
                className="group relative block h-full w-full overflow-hidden rounded-2xl bg-ink-100"
              >
                <FoodImage
                  imageId={tile.imageId}
                  alt={tile.caption}
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-ink-900/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="absolute inset-x-4 bottom-4 translate-y-2 text-sm font-medium text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  {tile.caption}
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
