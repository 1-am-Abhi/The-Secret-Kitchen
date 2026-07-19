import { Bike, Truck } from "lucide-react";

import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";
import { getDeliveryAreas } from "@/lib/storefront-data";
import { cn, formatPrice } from "@/lib/utils";

/**
 * Coverage grid.
 *
 * Zones are `DeliveryArea` rows attached to an outlet in the admin panel, so
 * opening a new kitchen is a form submission rather than a code change. With
 * nothing configured the section states that plainly instead of listing places
 * we may not actually reach.
 */
export async function DeliveryCoverage() {
  const deliveryAreas = await getDeliveryAreas();

  return (
    <Section>
      <div className="container-page">
        <SectionHeading
          eyebrow="Where we deliver"
          title={
            deliveryAreas.length > 0
              ? `${deliveryAreas.length} ${deliveryAreas.length === 1 ? "neighbourhood" : "neighbourhoods"}, hot food in every one`
              : "Delivery areas are being set up"
          }
          description={`Free delivery above ${formatPrice(siteConfig.commerce.freeDeliveryAbove)} everywhere, and always free on tiffin subscriptions. Not on the list? Message us — we add sectors every quarter based on requests.`}
        />

        <Stagger
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          stagger={0.05}
        >
          {deliveryAreas.map((area) => (
            <StaggerItem key={`${area.name}-${area.pincode}`}>
              <div
                className={cn(
                  "flex h-full flex-col justify-between gap-4 rounded-2xl border p-5 transition-colors duration-300",
                  area.freeDelivery
                    ? "border-fresh-200 bg-fresh-50/50 hover:border-fresh-400"
                    : "border-ink-200/70 bg-white hover:border-brand-200",
                )}
              >
                <div>
                  <p className="font-semibold text-ink-900">{area.name}</p>
                  <p className="mt-0.5 text-sm text-ink-500">PIN {area.pincode}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" size="sm">
                    <Bike aria-hidden />
                    ~{area.etaMinutes} min
                  </Badge>
                  {area.freeDelivery && (
                    <Badge variant="success" size="sm">
                      <Truck aria-hidden />
                      Free zone
                    </Badge>
                  )}
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
