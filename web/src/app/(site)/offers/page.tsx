import { FeaturedOffers } from "@/components/offers/featured-offers";
import { HowToRedeem } from "@/components/offers/how-to-redeem";
import { OffersGrid } from "@/components/offers/offers-grid";
import { OffersHero } from "@/components/offers/offers-hero";
import { TiffinCrossSell } from "@/components/offers/tiffin-cross-sell";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Offers & Coupon Codes — Save on Every Order",
  description:
    "Live coupon codes from The Secret Kitchen: 50% off your first order with SECRET50, 15% off monthly tiffin plans with TIFFIN15, a year-round student discount, free delivery and weekend savings. Copy a code and use it at checkout.",
  path: "/offers",
  keywords: [
    "The Secret Kitchen offers",
    "food delivery coupon Patna",
    "tiffin service discount",
    "student food discount",
    "SECRET50 coupon",
    "free delivery food code",
  ],
});

export default function OffersPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Offers", path: "/offers" },
        ])}
      />

      <OffersHero />

      {/* Featured cards sit in the hero's cream field so they read as one block. */}
      <div className="bg-cream pb-20 lg:pb-28">
        <FeaturedOffers />
      </div>

      <OffersGrid />
      <HowToRedeem />
      <TiffinCrossSell />
    </>
  );
}
