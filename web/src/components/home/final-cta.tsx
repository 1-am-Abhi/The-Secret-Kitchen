import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/ui/food-image";
import { siteConfig, whatsappLink } from "@/config/site";

/** Closing conversion band — the last thing before the footer. */
export function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <FoodImage
          imageId="hero-1"
          alt=""
          aria-hidden
          sizes="100vw"
          className="scale-105"
        />
        <div className="absolute inset-0 bg-ink-900/85" />
      </div>

      <div className="container-page relative py-24 lg:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <h2 className="text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
              Your next home-cooked meal is 32 minutes away
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-ink-300">
              Order a single dish or set up a month of tiffins. Either way, it is
              cooked fresh today — never reheated, never yesterday&apos;s.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/menu">
                  Order Now
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                variant="glass"
                size="xl"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                  <MessageCircle />
                  Order on WhatsApp
                </a>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.26}>
            <p className="mt-8 text-sm text-ink-400">
              Free delivery above ₹349 · Minimum order ₹99 · {siteConfig.hours.display}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
