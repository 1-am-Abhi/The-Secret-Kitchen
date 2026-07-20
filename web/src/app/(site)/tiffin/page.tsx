import type { Metadata } from "next";
import { CalendarCheck, IndianRupee, Utensils } from "lucide-react";

import { Section, SectionHeading } from "@/components/layout/section";
import { Reveal } from "@/components/motion";
import { JsonLd } from "@/components/seo/json-ld";
import { PlanSelector } from "@/components/tiffin/plan-selector";
import { SubscriptionManager } from "@/components/tiffin/subscription-manager";
import { TiffinBuilder } from "@/components/tiffin/tiffin-builder";
import { WeeklyMenu } from "@/components/tiffin/weekly-menu";
import { siteConfig } from "@/config/site";
import { tiffinPlans } from "@/data/tiffin";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Monthly Tiffin Service — Plans from ₹89 a meal",
  description:
    "Freshly cooked vegetarian tiffins delivered daily across Patna. Student, Regular and Premium plans from ₹89 per meal. Pause, skip or cancel any time — meals never expire.",
  path: "/tiffin",
  keywords: [
    "monthly tiffin service noida",
    "tiffin subscription",
    "student tiffin plan",
    "veg tiffin delivery",
    "dabba service noida",
  ],
});

/** Product schema for the plan range so pricing can appear in search results. */
function planSchema() {
  const prices = tiffinPlans.map((plan) => plan.pricePerMeal.monthly);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${siteConfig.name} Monthly Tiffin Service`,
    description:
      "Freshly cooked pure-vegetarian tiffin meals delivered daily, with flexible pause, skip and rollover.",
    brand: { "@type": "Brand", name: siteConfig.name },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: tiffinPlans.length,
      availability: "https://schema.org/InStock",
    },
  };
}

/**
 * Facts about the plans themselves, not claims about how many people buy them.
 * The subscriber count was removed rather than shown as a guess — it lives in
 * Postgres and is surfaced on the home page from `getSiteStats()`.
 */
const HERO_STATS = [
  { icon: Utensils, value: "28-day", label: "Rotating menu" },
  { icon: CalendarCheck, value: "Pause anytime", label: "No lock-in" },
  {
    icon: IndianRupee,
    value: `₹${Math.min(...tiffinPlans.map((p) => p.pricePerMeal.monthly))}`,
    label: "Meals from",
  },
];

export default function TiffinPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden bg-cream pb-16 pt-32 lg:pt-40">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-24 size-[32rem] rounded-full bg-fresh-200/35 blur-[130px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-32 size-[30rem] rounded-full bg-brand-200/40 blur-[130px]"
        />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                <span className="size-1.5 rounded-full bg-current" />
                Monthly Tiffin Service
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-5 text-4xl leading-[1.08] text-ink-900 sm:text-5xl lg:text-6xl">
                Ghar ka khana,{" "}
                <span className="text-gradient-brand">every single day</span>
              </h1>
            </Reveal>

            <Reveal delay={0.14}>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
                A freshly cooked, nutritionist-balanced tiffin at your door — lunch,
                dinner or both. Pause when you travel, skip when you eat out, and
                never lose a meal you have paid for.
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <dl className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-4">
                {HERO_STATS.map(({ icon: Icon, value, label }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-ink-200/60 bg-white/70 px-3 py-4 backdrop-blur"
                  >
                    <Icon className="mx-auto size-5 text-brand-500" />
                    <dt className="mt-2 font-display text-xl font-semibold text-ink-900">
                      {value}
                    </dt>
                    <dd className="mt-0.5 text-[11px] text-ink-500">{label}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- Plans ---- */}
      <Section tone="default" id="plans">
        <div className="container-page">
          <SectionHeading
            eyebrow="Choose your plan"
            title="Three plans. No lock-in on any of them."
            description="Switch cycle or meal slot below and every price updates instantly — no fine print, no hidden delivery charge."
          />
          <div className="mt-12">
            <PlanSelector />
          </div>
        </div>
      </Section>

      {/* ---- Weekly menu ---- */}
      <Section tone="muted">
        <div className="container-page">
          <SectionHeading
            eyebrow="This week's menu"
            title="Know exactly what is coming"
            description="We publish the week ahead every Sunday, so you are never guessing what is in the box."
          />
          <div className="mt-12">
            <WeeklyMenu />
          </div>
        </div>
      </Section>

      {/* ---- Build your tiffin ---- */}
      <Section tone="default" id="build">
        <div className="container-page">
          <SectionHeading
            eyebrow="Build your tiffin"
            title="Or design the box yourself"
            description="Pick every component and watch the price, calories and protein update live. Bigger boxes unlock better rates."
          />
          <div className="mt-12">
            <TiffinBuilder />
          </div>
        </div>
      </Section>

      {/* ---- Manage ---- */}
      <Section tone="cream" id="manage">
        <div className="container-page">
          <SectionHeading
            eyebrow="Full control"
            title="Pause, skip, resume — in one tap"
            description="The flexibility our subscribers say they cannot live without. Try the controls below."
          />
          <div className="mt-12">
            <SubscriptionManager />
          </div>
        </div>
      </Section>

      <JsonLd
        data={[
          planSchema(),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Tiffin Service", path: "/tiffin" },
          ]),
        ]}
      />
    </>
  );
}
