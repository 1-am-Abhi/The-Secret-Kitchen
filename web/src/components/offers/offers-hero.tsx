import { BadgePercent } from "lucide-react";

import { Reveal } from "@/components/motion";
import { offers } from "@/data/offers";

export function OffersHero() {
  return (
    <section className="relative overflow-hidden bg-cream pb-14 pt-32 lg:pb-16 lg:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 size-[34rem] rounded-full bg-brand-100/60 blur-3xl"
      />
      <div className="container-page relative">
        <div className="max-w-3xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 shadow-soft backdrop-blur">
              <BadgePercent className="size-3.5" />
              {offers.length} live offers
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 text-4xl leading-[1.05] text-ink-900 sm:text-5xl lg:text-6xl">
              Real discounts, <span className="text-gradient-brand">no inflated menu price</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
              We do not mark a dish up to ₹400 so we can call it half price. Menu prices stay flat
              all year, and these codes come off the top of them. Copy one, paste it at checkout,
              done.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
