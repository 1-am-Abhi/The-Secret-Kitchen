import { Sparkles } from "lucide-react";

import { DishCard } from "@/components/menu/dish-card";
import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { getTodaysSpecial } from "@/data/menu";

/**
 * Today's Special.
 *
 * The selection rotates daily from a seeded offset (see getTodaysSpecial), so
 * the section stays fresh without needing a database or an editor to curate it.
 */
export function TodaysSpecial() {
  const specials = getTodaysSpecial(4);
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <Section tone="default">
      <div className="container-page">
        <SectionHeading
          eyebrow="Today's Special"
          title="What our chefs are excited about today"
          description={`Hand-picked for ${today}. Cooked in small batches — once they're gone, they're gone.`}
          align="left"
          action={{ label: "See full menu", href: "/menu" }}
        />

        <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {specials.map((item, index) => (
            <StaggerItem key={item.id} className="h-full">
              <DishCard item={item} priority={index < 2} className="h-full" />
            </StaggerItem>
          ))}
        </Stagger>

        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-400">
          <Sparkles className="size-4 text-brand-400" />
          The special rotates every morning at 6 AM
        </p>
      </div>
    </Section>
  );
}
