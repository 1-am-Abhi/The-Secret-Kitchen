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
import { buildMetadata, faqSchema, localBusinessSchema } from "@/lib/seo";
import { getContentBlock, getPublishedReviews, getSiteStats } from "@/lib/storefront-data";

export const metadata: Metadata = buildMetadata({
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  path: "/",
  keywords: ["pure veg cloud kitchen", "monthly tiffin noida", "homemade food delivery"],
});

/**
 * Home page.
 *
 * Server component: the live figures are read here and passed down, so the
 * interactive leaves stay client components without any of them fetching.
 * Section order follows the funnel: hook → prove → tempt → convert.
 */
export default async function HomePage() {
  const [stats, statsContent, reviewFeed] = await Promise.all([
    getSiteStats(),
    getContentBlock("home.stats"),
    getPublishedReviews(12),
  ]);

  return (
    <>
      <Hero stats={stats} statsContent={statsContent} />
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
        data={localBusinessSchema(
          reviewFeed.count > 0 && reviewFeed.average !== null
            ? { value: reviewFeed.average, count: reviewFeed.count }
            : null,
        )}
      />

      <JsonLd
        data={faqSchema(
          getHomepageFaqs().map(({ question, answer }) => ({ question, answer })),
        )}
      />
    </>
  );
}
