import Link from "next/link";
import { ArrowRight, CalendarX, CheckCircle2, PauseCircle, RefreshCw } from "lucide-react";

import { Section } from "@/components/layout/section";
import { Parallax, Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/ui/food-image";
import { tiffinPlans } from "@/data/tiffin";
import { formatPrice } from "@/lib/utils";

const FLEXIBILITY = [
  { icon: PauseCircle, label: "Pause anytime" },
  { icon: CalendarX, label: "Skip a meal" },
  { icon: RefreshCw, label: "Meals roll over" },
];

/**
 * Tiffin subscription teaser — the highest-value conversion on the site, so it
 * gets a full-width band rather than sitting inside a card grid.
 */
export function TiffinTeaser() {
  const cheapest = Math.min(...tiffinPlans.map((plan) => plan.pricePerMeal.monthly));

  return (
    <Section tone="default" className="overflow-hidden">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-ink-900">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-500/25 blur-[120px]"
          />

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="relative p-8 sm:p-12 lg:p-16">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
                  <span className="size-1.5 rounded-full bg-current" />
                  Monthly tiffin service
                </span>
              </Reveal>

              <Reveal delay={0.08}>
                <h2 className="mt-6 text-3xl leading-tight text-white sm:text-4xl lg:text-[2.6rem]">
                  Never think about dinner again
                </h2>
              </Reveal>

              <Reveal delay={0.14}>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-400">
                  A freshly cooked, nutritionist-balanced tiffin at your door
                  every day — from {formatPrice(cheapest)} a meal. No dish repeats
                  within a fortnight, and you keep full control of the schedule.
                </p>
              </Reveal>

              <Reveal delay={0.2}>
                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                  {FLEXIBILITY.map(({ icon: Icon, label }) => (
                    <li
                      key={label}
                      className="flex items-center gap-2 text-sm font-medium text-ink-300"
                    >
                      <Icon className="size-4 text-fresh-400" />
                      {label}
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={0.26}>
                <ul className="mt-8 grid gap-2.5">
                  {tiffinPlans.map((plan) => (
                    <li key={plan.tier} className="flex items-center gap-3">
                      <CheckCircle2 className="size-4 shrink-0 text-brand-400" />
                      <span className="text-sm text-ink-300">
                        <strong className="font-semibold text-white">{plan.name}</strong>
                        {" — "}
                        {plan.headline} · from {formatPrice(plan.pricePerMeal.monthly)}/meal
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={0.32}>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link href="/tiffin">
                      See tiffin plans
                      <ArrowRight />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="glass"
                    size="lg"
                    className="border-white/15 bg-white/10 text-white hover:bg-white/20"
                  >
                    <Link href="/tiffin#build">Build your own tiffin</Link>
                  </Button>
                </div>
              </Reveal>
            </div>

            {/* Image column — parallax keeps the band feeling alive on scroll. */}
            <div className="relative h-72 lg:h-[34rem]">
              <Parallax speed={-0.12} className="absolute inset-0">
                <div className="relative h-full w-full">
                  <FoodImage
                    imageId="tiffin-regular"
                    alt="A full vegetarian tiffin thali with curries, rice, roti and salad"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/40 to-transparent lg:bg-gradient-to-r" />
                </div>
              </Parallax>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
