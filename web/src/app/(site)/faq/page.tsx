import { FaqCta } from "@/components/faq/faq-cta";
import { FaqExplorer } from "@/components/faq/faq-explorer";
import { FaqHero } from "@/components/faq/faq-hero";
import { Section } from "@/components/layout/section";
import { JsonLd } from "@/components/seo/json-ld";
import { faqs } from "@/data/faq";
import { breadcrumbSchema, buildMetadata, faqSchema } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "FAQ — Delivery, Tiffin Plans, Hygiene & Refunds",
  description:
    "Answers to the 22 questions we get asked most: delivery times and coverage, how the monthly tiffin pause and skip works, our FSSAI hygiene standards, Jain and no-onion options, payment methods and the refund policy.",
  path: "/faq",
  keywords: [
    "The Secret Kitchen FAQ",
    "tiffin subscription questions",
    "food delivery refund policy",
    "Jain food delivery Noida",
    "cloud kitchen hygiene FAQ",
    "pause tiffin subscription",
  ],
});

export default function FaqPage() {
  return (
    <>
      {/* FAQPage structured data lets Google expand these answers directly in
          the results page — the highest-leverage schema on the whole site. */}
      <JsonLd
        data={[
          faqSchema(faqs),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
        ]}
      />

      <FaqHero />

      <Section size="sm" className="pt-2 lg:pt-4">
        <div className="container-page">
          <FaqExplorer />
        </div>
      </Section>

      <FaqCta />
    </>
  );
}
