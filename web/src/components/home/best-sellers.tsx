import { DishCard } from "@/components/menu/dish-card";
import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { getBestSellers } from "@/data/menu";

/**
 * Best sellers, ranked by review volume.
 *
 * Renders as a horizontal snap-scroll rail on mobile — far better than a
 * cramped two-column grid — and settles into a four-up grid from `lg`.
 */
export function BestSellers() {
  const items = getBestSellers(8);

  return (
    <Section tone="default">
      <div className="container-page">
        <SectionHeading
          eyebrow="Loved by thousands"
          title="Our best sellers"
          description="The dishes our customers reorder most — ranked by genuine review volume, not by what we want to sell."
          align="left"
          action={{ label: "View all dishes", href: "/menu" }}
        />
      </div>

      {/* Rail on small screens: full-bleed so cards can peek off the edge. */}
      <Stagger className="mt-12 lg:hidden">
        <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:px-8">
          {items.map((item) => (
            <StaggerItem
              key={item.id}
              className="w-[78vw] max-w-xs shrink-0 snap-start sm:w-[46vw]"
            >
              <DishCard item={item} className="h-full" />
            </StaggerItem>
          ))}
        </div>
      </Stagger>

      <div className="container-page hidden lg:block">
        <Stagger className="mt-12 grid grid-cols-4 gap-6">
          {items.map((item) => (
            <StaggerItem key={item.id} className="h-full">
              <DishCard item={item} className="h-full" />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
