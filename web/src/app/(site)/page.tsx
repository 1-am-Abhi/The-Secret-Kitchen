import type { Metadata } from "next";

import { BestSellers } from "@/components/home/best-sellers";
import { DeliveryAreas } from "@/components/home/delivery-areas";
import { FaqPreview } from "@/components/home/faq-preview";
import { FinalCta } from "@/components/home/final-cta";
import { GalleryPreview } from "@/components/home/gallery-preview";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { PopularCategories } from "@/components/home/popular-categories";
import { Testimonials } from "@/components/home/testimonials";
import { TiffinTeaser } from "@/components/home/tiffin-teaser";
import { TodaysSpecial } from "@/components/home/todays-special";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { getHomepageFaqs } from "@/data/faq";
import { buildMetadata, faqSchema } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  path: "/",
  keywords: ["pure veg cloud kitchen", "monthly tiffin noida", "homemade food delivery"],
});

/**
 * Home page.
 *
 * Composed of server components so the page streams as HTML; only the genuinely
 * interactive leaves (dish cards, pincode checker) ship JavaScript. Section
 * order follows the funnel: hook → prove → tempt → convert.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <TodaysSpecial />
      <PopularCategories />
      <BestSellers />
      <TiffinTeaser />
      <WhyChooseUs />
      <HowItWorks />
      <Testimonials />
      <GalleryPreview />
      <DeliveryAreas />
      <FaqPreview />
      <FinalCta />

      {/* The condensed home FAQ is eligible for rich results on its own. */}
      <JsonLd
        data={faqSchema(
          getHomepageFaqs().map(({ question, answer }) => ({ question, answer })),
        )}
      />
    </>
  );
}
