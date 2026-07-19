import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/ui/food-image";
import { getFeaturedOffers } from "@/data/offers";
import { formatPrice } from "@/lib/utils";

import { CopyCodeButton } from "./copy-code-button";
import { OfferCountdown } from "./offer-countdown";
import { discountCaption, discountLabel } from "./offer-utils";

/**
 * The three headline offers, given oversized dark cards so they clearly outrank
 * the standard grid below. The first card spans two columns on desktop.
 */
export function FeaturedOffers() {
  const featured = getFeaturedOffers();

  return (
    <section aria-labelledby="featured-offers" className="container-page">
      <Reveal>
        <h2 id="featured-offers" className="sr-only">
          Featured offers
        </h2>
      </Reveal>

      <Stagger className="grid gap-5 lg:grid-cols-3" stagger={0.1}>
        {featured.map((offer, index) => (
          <StaggerItem
            key={offer.id}
            className={index === 0 ? "lg:col-span-2" : "lg:col-span-1"}
          >
            <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-ink-900 p-7 shadow-float sm:p-9">
              {/* Photo sits behind a heavy gradient — texture, not content. */}
              <div aria-hidden className="absolute inset-0 opacity-30">
                <FoodImage
                  imageId={offer.imageId}
                  alt=""
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-105"
                />
              </div>
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-900/92 to-ink-900/65"
              />

              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <Badge variant="bestseller" size="sm">
                    <Sparkles aria-hidden />
                    Featured
                  </Badge>
                  <div className="text-right">
                    <p className="font-display text-4xl leading-none text-brand-400 sm:text-5xl">
                      {discountLabel(offer)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/50">
                      {discountCaption(offer)}
                    </p>
                  </div>
                </div>

                <h3 className="mt-7 max-w-md text-2xl leading-snug text-white sm:text-[1.75rem]">
                  {offer.title}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-300">
                  {offer.description}
                </p>

                <div className="mt-auto pt-8">
                  <CopyCodeButton code={offer.code} tone="dark" />
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-white/60">
                      Min. order {formatPrice(offer.minOrder)}
                      {offer.maxDiscount ? ` · up to ${formatPrice(offer.maxDiscount)} off` : ""}
                    </p>
                    <OfferCountdown validUntil={offer.validUntil} tone="dark" />
                  </div>
                  <Button asChild variant="glass" size="sm" className="mt-5">
                    <Link href={offer.appliesTo === "subscription" ? "/tiffin" : "/menu"}>
                      {offer.appliesTo === "subscription" ? "Browse tiffin plans" : "Start an order"}
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
