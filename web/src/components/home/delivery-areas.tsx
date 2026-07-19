import { MapPin } from "lucide-react";

import { CoverageChecker } from "@/components/home/coverage-checker";
import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { getContentBlock, getDeliveryAreas } from "@/lib/storefront-data";
import { cn } from "@/lib/utils";

/**
 * Delivery coverage.
 *
 * Every zone shown here is a `DeliveryArea` row attached to an outlet an
 * administrator created. Opening a new kitchen or adding a pincode is a form
 * submission in the admin panel — this component holds no list of its own and
 * says so plainly when nothing has been configured yet.
 */
export async function DeliveryAreas() {
  const [areas, info] = await Promise.all([
    getDeliveryAreas(),
    getContentBlock("home.deliveryInfo"),
  ]);

  return (
    <Section tone="default" id="delivery-areas">
      <div className="container-page">
        <SectionHeading
          eyebrow="Delivery areas"
          title={info?.title || "Where we deliver"}
          description={
            info?.description ||
            (areas.length > 0
              ? `${areas.length} ${areas.length === 1 ? "neighbourhood" : "neighbourhoods"} currently served.`
              : "Delivery areas have not been published yet — message us and we will tell you if we reach you.")
          }
        />

        <CoverageChecker />

        {areas.length > 0 ? (
          <Stagger
            className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            stagger={0.05}
          >
            {areas.map((area) => (
              <StaggerItem key={area.id}>
                <div
                  className={cn(
                    "flex h-full flex-col gap-2 rounded-2xl border p-5 transition-colors",
                    area.freeDelivery
                      ? "border-fresh-200 bg-fresh-50/50"
                      : "border-ink-200/70 bg-white",
                  )}
                >
                  <span className="flex items-start gap-2">
                    <MapPin
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        area.freeDelivery ? "text-fresh-600" : "text-ink-400",
                      )}
                    />
                    <span className="text-sm font-semibold text-ink-900">{area.name}</span>
                  </span>
                  <span className="text-xs text-ink-400">
                    {area.pincode} · ~{area.etaMinutes} min
                  </span>
                  {area.freeDelivery && (
                    <Badge variant="success" size="sm" className="mt-auto w-fit">
                      Free delivery zone
                    </Badge>
                  )}
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <p className="mt-12 rounded-2xl border border-dashed border-ink-200 px-6 py-10 text-center text-sm text-ink-500">
            No delivery areas have been published yet.
          </p>
        )}

        {info?.note && <p className="mt-6 text-center text-xs text-ink-400">{info.note}</p>}
      </div>
    </Section>
  );
}
