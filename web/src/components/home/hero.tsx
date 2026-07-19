"use client";

import Link from "next/link";
import { ArrowRight, CalendarHeart, Star, Timer, UtensilsCrossed } from "lucide-react";

import { Floating, motion, Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { VegMark } from "@/components/ui/badge";
import { FoodImage } from "@/components/ui/food-image";
import { siteConfig } from "@/config/site";
import { trustBadges } from "@/data/content";

/**
 * Home hero.
 *
 * Split layout: editorial type on the left, a tall food image on the right with
 * two floating glass cards that carry social proof. The right column collapses
 * beneath the copy on mobile so the headline and CTAs always land first.
 */
export function Hero() {
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
                <span className="h-3 w-px bg-brand-200" />
                <span className="flex items-center gap-1 text-fresh-700">
                  <Star className="size-3 fill-current" />
                  {siteConfig.stats.rating}
                </span>
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

            {/* Social proof */}
            <Reveal delay={0.32}>
              <dl className="mt-11 grid grid-cols-3 gap-4 border-t border-ink-200/70 pt-7">
                {[
                  { value: siteConfig.stats.mealsServed, label: "Meals served" },
                  { value: siteConfig.stats.tiffinSubscribers, label: "Tiffin subscribers" },
                  { value: `${siteConfig.stats.rating}★`, label: `${siteConfig.stats.reviewCount} reviews` },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
                      {stat.value}
                    </dt>
                    <dd className="mt-1 text-xs text-ink-500">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
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

            {/* Floating: delivery time */}
            <Floating
              delay={0.4}
              className="absolute -left-2 top-10 hidden sm:block lg:-left-10"
            >
              <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lift">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-500 text-white">
                  <Timer className="size-5" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-display text-lg font-semibold text-ink-900">
                    32 min
                  </span>
                  <span className="text-[11px] text-ink-500">Average delivery</span>
                </span>
              </div>
            </Floating>

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
                    ₹89<span className="text-sm font-normal text-ink-500">/meal</span>
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
