import Link from "next/link";
import { ArrowRight, CalendarCheck, PauseCircle, Truck } from "lucide-react";

import { Section } from "@/components/layout/section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/ui/food-image";
import { offerByCode } from "@/data/offers";
import { formatPrice } from "@/lib/utils";

const perks = [
  { icon: Truck, label: "Free delivery on every meal, no minimum" },
  { icon: PauseCircle, label: "Pause or skip any day — unused meals roll over" },
  { icon: CalendarCheck, label: "28-day rotating menu, nothing repeats in a fortnight" },
];

/**
 * Cross-sell band. Pulls the live TIFFIN15 offer straight from the data file so
 * the headline discount can never drift from what the checkout will honour.
 */
export function TiffinCrossSell() {
  const offer = offerByCode.get("TIFFIN15");

  return (
    <Section tone="cream" size="sm">
      <div className="container-page">
        <Reveal animation="scale">
          <div className="grid overflow-hidden rounded-3xl bg-white shadow-lift lg:grid-cols-[1.1fr_0.9fr]">
            <div className="order-2 p-8 sm:p-11 lg:order-1 lg:p-14">
              <span className="inline-flex items-center gap-2 rounded-full bg-fresh-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-fresh-700">
                <span className="size-1.5 rounded-full bg-current" />
                Best value
              </span>

              <h2 className="mt-5 text-3xl leading-tight text-ink-900 sm:text-4xl">
                The biggest saving is not a coupon at all
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-ink-600">
                A monthly tiffin works out cheaper per meal than any one-off discount, from{" "}
                <span className="font-semibold text-ink-900">₹89 a meal</span>. Stack{" "}
                {offer ? (
                  <span className="font-mono font-semibold text-brand-600">{offer.code}</span>
                ) : (
                  "our plan code"
                )}{" "}
                on top and your first cycle drops another {offer?.discountValue ?? 15}%
                {offer?.maxDiscount ? ` — up to ${formatPrice(offer.maxDiscount)} off` : ""}.
              </p>

              <Stagger className="mt-8 space-y-3.5" stagger={0.08}>
                {perks.map((perk) => (
                  <StaggerItem key={perk.label} className="flex items-center gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <perk.icon className="size-4" aria-hidden />
                    </span>
                    <span className="text-sm text-ink-700">{perk.label}</span>
                  </StaggerItem>
                ))}
              </Stagger>

              <Button asChild size="lg" className="mt-9">
                <Link href="/tiffin">
                  Compare tiffin plans
                  <ArrowRight />
                </Link>
              </Button>
            </div>

            <div className="relative order-1 min-h-64 lg:order-2 lg:min-h-full">
              <FoodImage
                imageId="hero-1"
                alt="A packed monthly tiffin box with dal, sabzi, chapati and rice"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
