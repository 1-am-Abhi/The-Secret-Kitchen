import Link from "next/link";
import { ArrowRight, Leaf, ShieldCheck } from "lucide-react";

import { Floating, Parallax, Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/ui/food-image";
import { siteConfig } from "@/config/site";

/**
 * Editorial opener. `pt-32 lg:pt-40` clears the fixed navbar — every storefront
 * page uses the same first-section padding so the crown of the page lines up.
 */
export function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-cream pb-20 pt-32 lg:pb-28 lg:pt-40">
      {/* Decorative wash. aria-hidden because it carries no meaning. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 size-[38rem] rounded-full bg-brand-100/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 -left-40 size-[32rem] rounded-full bg-fresh-100/50 blur-3xl"
      />

      <div className="container-page relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 shadow-soft backdrop-blur">
                <Leaf className="size-3.5" />
                {siteConfig.address.line2}
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-6 text-4xl leading-[1.05] text-ink-900 sm:text-5xl lg:text-6xl">
                There is no secret.{" "}
                <span className="text-gradient-brand">Just care, repeated daily.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
                Pure vegetarian food made the way a home kitchen makes it — measured
                oil, vegetables bought that morning, and portions that actually fill
                you up. Nothing reheated, nothing from yesterday.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/menu">
                    Explore the menu
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/gallery">See inside our kitchen</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.32}>
              <p className="mt-8 inline-flex items-center gap-2 text-sm text-ink-500">
                <ShieldCheck className="size-4 text-fresh-600" />
                FSSAI licensed · No. {siteConfig.fssaiLicense}
              </p>
            </Reveal>
          </div>

          {/* Two offset frames read as a spread rather than a single stock shot. */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <Parallax speed={-0.08}>
              <Reveal animation="scale">
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-float">
                  <FoodImage
                    imageId="kitchen-1"
                    alt="The Secret Kitchen team plating a lunch service at the pass"
                    sizes="(max-width: 1024px) 90vw, 40vw"
                  />
                </div>
              </Reveal>
            </Parallax>

            <Floating className="absolute -bottom-8 -left-6 w-40 sm:-left-10 sm:w-52" delay={0.6}>
              <div className="relative aspect-square overflow-hidden rounded-2xl border-4 border-white shadow-lift">
                <FoodImage
                  imageId="ingredients-1"
                  alt="Whole spices ground fresh in the kitchen every week"
                  sizes="200px"
                />
              </div>
            </Floating>
          </div>
        </div>
      </div>
    </section>
  );
}
