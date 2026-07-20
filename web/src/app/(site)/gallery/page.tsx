import { Section } from "@/components/layout/section";
import { GalleryCta } from "@/components/gallery/gallery-cta";
import { GalleryExplorer } from "@/components/gallery/gallery-explorer";
import { GalleryHero } from "@/components/gallery/gallery-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Gallery — Our Food, Kitchen & Team in Photos",
  description:
    "Unstyled photographs from The Secret Kitchen: our pure-veg dishes, the FSSAI-licensed kitchen they are cooked in, the chefs behind them and the insulated packaging they travel in. Updated weekly.",
  path: "/gallery",
  keywords: [
    "The Secret Kitchen gallery",
    "cloud kitchen photos",
    "veg food photos Patna",
    "tiffin packaging",
    "kitchen hygiene photos",
  ],
});

export default function GalleryPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Gallery", path: "/gallery" },
        ])}
      />

      <GalleryHero />

      <Section size="sm" className="pt-4 lg:pt-6">
        <div className="container-page">
          <GalleryExplorer />
        </div>
      </Section>

      <GalleryCta />
    </>
  );
}
