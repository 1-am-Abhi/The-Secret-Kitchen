import { AboutHero } from "@/components/about/about-hero";
import { BrandStory } from "@/components/about/brand-story";
import { ClosingCta } from "@/components/about/closing-cta";
import { HygieneGrid } from "@/components/about/hygiene-grid";
import { IngredientsSection } from "@/components/about/ingredients-section";
import { MissionVision } from "@/components/about/mission-vision";
import { StatsBand } from "@/components/about/stats-band";
import { TeamGrid } from "@/components/about/team-grid";
import { Timeline } from "@/components/about/timeline";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "About Us — Our Story, Kitchen & Chefs",
  description:
    "The Secret Kitchen started in 2019 with eighteen tiffins a night from a home kitchen in Patna. Meet the chefs, see our FSSAI-licensed hygiene practices, and read why we grind our own masalas and never reuse frying oil.",
  path: "/about",
  keywords: [
    "about The Secret Kitchen",
    "pure veg cloud kitchen Patna",
    "FSSAI licensed kitchen",
    "hygienic tiffin service",
    "Meenakshi Rawat chef",
    "kitchen hygiene standards",
  ],
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />

      <AboutHero />
      <BrandStory />
      <MissionVision />
      <Timeline />
      <HygieneGrid />
      <IngredientsSection />
      <TeamGrid />
      <StatsBand />
      <ClosingCta />
    </>
  );
}
