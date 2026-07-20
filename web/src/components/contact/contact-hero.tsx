import { MessageCircle } from "lucide-react";

import { Reveal } from "@/components/motion";
import { siteConfig } from "@/config/site";

export function ContactHero() {
  return (
    <section className="relative overflow-hidden bg-cream pb-14 pt-32 lg:pb-16 lg:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 size-[34rem] rounded-full bg-brand-100/60 blur-3xl"
      />
      <div className="container-page relative">
        <div className="max-w-3xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 shadow-soft backdrop-blur">
              <MessageCircle className="size-3.5" />
              We reply within 2 hours, {siteConfig.hours.display.toLowerCase()}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 text-4xl leading-[1.05] text-ink-900 sm:text-5xl lg:text-6xl">
              Talk to the people who <span className="text-gradient-brand">cook your food</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
              Bulk order for an office lunch, a question about a tiffin plan, an allergy we should
              know about, or something that went wrong — it reaches a real person at our Patna
              kitchen, not a ticketing queue.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
