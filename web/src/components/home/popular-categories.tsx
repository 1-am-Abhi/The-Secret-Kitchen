import Link from "next/link";
import {
  Beef,
  ChefHat,
  CircleDot,
  CookingPot,
  CupSoda,
  IceCreamCone,
  Popcorn,
  Sandwich,
  Soup,
  Wheat,
  type LucideIcon,
} from "lucide-react";

import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import {
  countInCategory,
  getMenuCatalogue,
  startingPriceInCategory,
} from "@/lib/menu-data";
import { formatPrice } from "@/lib/utils";

/**
 * Maps the icon names stored in the menu data to real components. Keeping the
 * data layer free of JSX means it can be shared with the API and the seed
 * script without dragging React along.
 */
const ICONS: Record<string, LucideIcon> = {
  Soup,
  Wheat,
  CircleDot,
  CookingPot,
  ChefHat,
  Sandwich,
  Beef,
  Popcorn,
  IceCreamCone,
  CupSoda,
};

export async function PopularCategories() {
  const { items, categories } = await getMenuCatalogue();
  return (
    <Section tone="muted">
      <div className="container-page">
        <SectionHeading
          eyebrow="Browse by craving"
          title="Popular categories"
          description="Eleven kitchens under one roof — from midnight Maggi to a full North Indian thali."
        />

        <Stagger
          className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          stagger={0.06}
        >
          {categories.map((category) => {
            const Icon = ICONS[category.icon] ?? Soup;
            return (
              <StaggerItem key={category.slug}>
                <Link
                  href={`/menu?category=${category.slug}`}
                  className="group flex h-full flex-col items-center gap-3 rounded-3xl border border-ink-200/60 bg-white p-6 text-center transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift"
                >
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 transition-all duration-500 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white">
                    <Icon className="size-6" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-display text-base font-semibold text-ink-900">
                      {category.name}
                    </span>
                    <span className="text-[11px] leading-snug text-ink-400">
                      {countInCategory(items, category.slug)} dishes · from{" "}
                      {formatPrice(startingPriceInCategory(items, category.slug))}
                    </span>
                  </span>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </Section>
  );
}
