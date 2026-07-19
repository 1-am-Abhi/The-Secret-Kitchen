"use client";

import Link from "next/link";
import { ArrowRight, CalendarHeart, Star, UtensilsCrossed } from "lucide-react";

import { Floating, motion, Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { VegMark } from "@/components/ui/badge";
import { FoodImage } from "@/components/ui/food-image";
import { trustBadges } from "@/data/content";
import { tiffinPlans } from "@/data/tiffin";
import type { SiteStats, StatsContent } from "@/lib/storefront-data";
import { formatStat } from "@/lib/storefront-data";

/** Cheapest advertised tiffin rate — read from the plan table, never typed in. */
const lowestTiffinRate = Math.min(...tiffinPlans.map((plan) => plan.pricePerMeal.monthly));

/** Default wording for the live figures when an admin has not chosen their own. */
const DEFAULT_STAT_LABELS: Record<keyof SiteStats, string> = {
  mealsServed: "Meals served",
  ordersDelivered: "Orders delivered",
  customersServed: "Customers served",
  activeSubscribers: "Tiffin subscribers",
  reviewCount: "Reviews",
  averageRating: "Average rating",
};

/**
 * Home hero.
 *
 * Split layout: editorial type on the left, a tall food image on the right with
 * a floating glass card. The right column collapses beneath the copy on mobile
 * so the headline and CTAs always land first.
 *
 * The social-proof row is driven entirely by `stats`, which the page reads from
 * Postgres. A kitchen that has not served anyone yet shows no row at all —
 * there is no launch-day placeholder to fall back to.
 */
export function Hero({
  stats,
  statsContent,
}: {
  stats: SiteStats | null;
  statsContent: StatsContent | null;
}) {
  const heroStats = selectHeroStats(stats, statsContent);

  return (
    <section className="relative overflow-hidden bg-cream pt-32 pb-16 lg:pt-40 lg:pb-24">
      {/* Ambient brand wash — keeps the cream background from reading flat. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 size-[36rem] rounded-full bg-brand-200/40 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-56 -left-40 size-[32rem] rounded-full bg-fresh-200/30 blur-[140px]"
      />

      <div className="container-page relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* ---- Copy ---- */}
          <div className="max-w-xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-4 py-2 text-xs font-semibold text-brand-700 backdrop-blur">
                <VegMark className="size-3.5" />
                100% Pure Veg Cloud Kitchen
                {/* Only shown once real customers have actually rated us. */}
                {stats?.averageRating !== null && stats?.averageRating !== undefined && (
                  <>
                    <span className="h-3 w-px bg-brand-200" />
                    <span className="flex items-center gap-1 text-fresh-700">
                      <Star className="size-3 fill-current" />
                      {stats.averageRating.toFixed(1)}
                    </span>
                  </>
                )}
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-6 text-[2.6rem] leading-[1.05] text-ink-900 sm:text-6xl lg:text-[4.1rem]">
                Homemade Happiness,{" "}
                <span className="relative inline-block">
                  <span className="text-gradient-brand">Delivered Fresh</span>
                  {/* Hand-drawn underline gives the headline a crafted feel. */}
                  <svg
                    aria-hidden
                    viewBox="0 0 300 12"
                    className="absolute -bottom-1 left-0 w-full text-brand-300"
                    preserveAspectRatio="none"
                  >
                    <motion.path
                      d="M2 8C60 3 140 2 298 6"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-7 text-lg leading-relaxed text-ink-600">
                Freshly cooked vegetarian meals and monthly tiffins from a kitchen
                that cooks the way home does — measured oil, vegetables bought
                that morning, and portions that actually fill you up.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg">
                  <Link href="/menu">
                    <UtensilsCrossed />
                    Order Now
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/menu">
                    Explore Menu
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/tiffin">
                    <CalendarHeart />
                    Subscribe Tiffin
                  </Link>
                </Button>
              </div>
            </Reveal>

            {/* Social proof — live figures only, hidden entirely when there are none. */}
            {heroStats.length > 0 && (
              <Reveal delay={0.32}>
                <dl className="mt-11 grid grid-cols-3 gap-4 border-t border-ink-200/70 pt-7">
                  {heroStats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
                        {stat.value}
                      </dt>
                      <dd className="mt-1 text-xs text-ink-500">{stat.label}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
          </div>

          {/* ---- Imagery ---- */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2.5rem] shadow-float lg:max-w-none"
            >
              <FoodImage
                imageId="hero-1"
                priority
                sizes="(max-width: 1024px) 90vw, 44vw"
                className="scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/25 via-transparent to-transparent" />
            </motion.div>

            {/* Floating: tiffin price */}
            <Floating
              delay={1.2}
              distance={10}
              className="absolute -bottom-4 right-0 hidden sm:block lg:-right-6"
            >
              <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lift">
                <span className="flex size-10 items-center justify-center rounded-full bg-fresh-500 text-white">
                  <CalendarHeart className="size-5" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-display text-lg font-semibold text-ink-900">
                    ₹{lowestTiffinRate}
                    <span className="text-sm font-normal text-ink-500">/meal</span>
                  </span>
                  <span className="text-[11px] text-ink-500">Monthly tiffin from</span>
                </span>
              </div>
            </Floating>
          </div>
        </div>

        {/* Trust strip */}
        <Reveal delay={0.4}>
          <ul className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-3xl border border-ink-200/60 bg-white/60 px-6 py-5 backdrop-blur lg:mt-20">
            {trustBadges.map((badge) => (
              <li
                key={badge.label}
                className="flex items-center gap-2 text-sm font-medium text-ink-600"
              >
                <span className="size-1.5 rounded-full bg-brand-400" />
                {badge.label}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Pairs the metrics an admin chose to show with their live values.
 *
 * A metric with no data yet (zero counts, or no rating because nobody has
 * reviewed us) is dropped rather than rendered as "0" beside a boast — the row
 * exists to state facts, and "we have served 0 meals" is not one worth making.
 */
function selectHeroStats(
  stats: SiteStats | null,
  content: StatsContent | null,
): { value: string; label: string }[] {
  if (!stats || content?.show === false) return [];

  const chosen: { metric: keyof SiteStats; label: string }[] =
    content?.items?.length
      ? content.items
      : [
          { metric: "mealsServed", label: DEFAULT_STAT_LABELS.mealsServed },
          { metric: "activeSubscribers", label: DEFAULT_STAT_LABELS.activeSubscribers },
          { metric: "reviewCount", label: DEFAULT_STAT_LABELS.reviewCount },
        ];

  return chosen
    .map(({ metric, label }) => {
      const raw = stats[metric];
      if (raw === null || raw === 0) return null;
      const value = metric === "averageRating" ? `${raw.toFixed(1)}★` : formatStat(raw);
      return { value, label: label || DEFAULT_STAT_LABELS[metric] };
    })
    .filter((entry): entry is { value: string; label: string } => entry !== null)
    .slice(0, 3);
}
