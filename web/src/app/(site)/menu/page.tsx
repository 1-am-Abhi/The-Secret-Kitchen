import { Suspense } from "react";
import type { Metadata } from "next";
import { Leaf, Timer, Truck } from "lucide-react";

import { MenuBrowser } from "@/components/menu/menu-browser";
import { Reveal } from "@/components/motion";
import { JsonLd } from "@/components/seo/json-ld";
import { Skeleton } from "@/components/ui/form-controls";
import { categories, menuItems } from "@/data/menu";
import { siteConfig } from "@/config/site";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Menu — 58 Pure Veg Dishes",
  description:
    "Browse The Secret Kitchen's full pure-veg menu: North Indian gravies, pasta, maggi, parathas, rice bowls, momos, desserts and beverages. Freshly cooked and delivered in under 45 minutes.",
  path: "/menu",
  keywords: [
    "veg menu noida",
    "paneer butter masala delivery",
    "maggi delivery",
    "pure veg restaurant menu",
  ],
});

/** Schema.org Menu so Google can render the dish list directly in results. */
function menuSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `${siteConfig.name} Menu`,
    url: `${siteConfig.url}/menu`,
    hasMenuSection: categories.map((category) => ({
      "@type": "MenuSection",
      name: category.name,
      description: category.tagline,
      hasMenuItem: menuItems
        .filter((item) => item.category === category.slug)
        .map((item) => ({
          "@type": "MenuItem",
          name: item.name,
          description: item.description,
          offers: {
            "@type": "Offer",
            price: item.price,
            priceCurrency: "INR",
          },
          suitableForDiet: "https://schema.org/VegetarianDiet",
          nutrition: {
            "@type": "NutritionInformation",
            calories: `${item.calories} calories`,
            proteinContent: item.protein ? `${item.protein} g` : undefined,
          },
        })),
    })),
  };
}

const HIGHLIGHTS = [
  { icon: Leaf, label: "100% pure veg", detail: "No meat, fish or egg — ever" },
  { icon: Timer, label: "Cooked to order", detail: "Nothing sits under a heat lamp" },
  { icon: Truck, label: "Free above ₹349", detail: "Flat ₹29 below that" },
];

export default function MenuPage() {
  return (
    <>
      {/* ---- Page hero ---- */}
      <section className="relative overflow-hidden bg-cream pb-10 pt-32 lg:pt-40">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[30rem] rounded-full bg-brand-200/40 blur-[130px]"
        />
        <div className="container-page relative">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
              <span className="size-1.5 rounded-full bg-current" />
              Our Menu
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-5 max-w-3xl text-4xl leading-[1.08] text-ink-900 sm:text-5xl lg:text-6xl">
              {menuItems.length} homestyle dishes,{" "}
              <span className="text-gradient-brand">cooked fresh today</span>
            </h1>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              Eleven kitchens under one roof — from a midnight bowl of masala Maggi
              to a twelve-hour dal makhani. Everything pure vegetarian, everything
              made after you order it.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <ul className="mt-9 grid gap-3 sm:grid-cols-3">
              {HIGHLIGHTS.map(({ icon: Icon, label, detail }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-ink-200/60 bg-white/70 px-4 py-3 backdrop-blur"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink-900">{label}</span>
                    <span className="block truncate text-xs text-ink-500">{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---- Browser ---- */}
      <section className="pb-24">
        <div className="container-page">
          {/* useSearchParams requires a Suspense boundary during prerender. */}
          <Suspense fallback={<MenuSkeleton />}>
            <MenuBrowser />
          </Suspense>
        </div>
      </section>

      <JsonLd
        data={[
          menuSchema(),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Menu", path: "/menu" },
          ]),
        ]}
      />
    </>
  );
}

function MenuSkeleton() {
  return (
    <div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="mt-3 flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-[26rem] rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
