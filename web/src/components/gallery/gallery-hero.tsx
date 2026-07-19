import { Camera } from "lucide-react";

import { Reveal } from "@/components/motion";
import { galleryImages } from "@/data/gallery";

export function GalleryHero() {
  return (
    <section className="relative overflow-hidden bg-cream pb-14 pt-32 lg:pb-16 lg:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 size-[46rem] -translate-x-1/2 rounded-full bg-brand-100/50 blur-3xl"
      />
      <div className="container-page relative text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 shadow-soft backdrop-blur">
            <Camera className="size-3.5" />
            {galleryImages.length} photographs
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] text-ink-900 sm:text-5xl lg:text-6xl">
            Nothing here is a <span className="text-gradient-brand">stylist&rsquo;s plate</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
            The food, the kitchen it comes out of, the people who cook it and the boxes it
            travels in. We publish fresh kitchen shots every week — the same room, whether or not
            it happened to be tidy that morning.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
