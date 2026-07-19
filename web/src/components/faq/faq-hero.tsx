import { HelpCircle } from "lucide-react";

import { Reveal } from "@/components/motion";
import { faqs } from "@/data/faq";

export function FaqHero() {
  return (
    <section className="relative overflow-hidden bg-cream pb-12 pt-32 lg:pb-14 lg:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-52 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-brand-100/50 blur-3xl"
      />
      <div className="container-page relative text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 shadow-soft backdrop-blur">
            <HelpCircle className="size-3.5" />
            {faqs.length} answers
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] text-ink-900 sm:text-5xl lg:text-6xl">
            Everything people ask us <span className="text-gradient-brand">before ordering</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
            Delivery times, how the tiffin pause works, what our hygiene checks actually involve
            and how refunds are handled. If your question is not here, one message gets a real
            answer from the kitchen.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
