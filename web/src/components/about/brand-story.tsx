import { Quote } from "lucide-react";

import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion";
import { FoodImage } from "@/components/ui/food-image";
import { brandStory } from "@/data/content";

/**
 * The founder's story. Set at a narrow measure with a serif drop-cap so it
 * reads like a magazine feature rather than another marketing card grid.
 */
export function BrandStory() {
  const [opening, ...rest] = brandStory.paragraphs;

  return (
    <Section size="lg">
      <div className="container-page">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* Sticky portrait keeps the founder in frame while the story scrolls. */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal animation="left">
              <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-lift">
                <FoodImage
                  imageId="team-1"
                  alt="Meenakshi Rawat, founder and head chef of The Secret Kitchen"
                  sizes="(max-width: 1024px) 90vw, 34vw"
                />
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink-900/80 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="font-display text-2xl text-white">{brandStory.signature}</p>
                  <p className="text-sm text-white/75">{brandStory.signatureRole}</p>
                </div>
              </div>
            </Reveal>
          </div>

          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                <span className="size-1.5 rounded-full bg-current" />
                {brandStory.eyebrow}
              </span>
              <h2 className="mt-5 text-3xl leading-[1.1] text-ink-900 sm:text-4xl lg:text-[2.75rem]">
                {brandStory.title}
              </h2>
            </Reveal>

            <Reveal delay={0.1}>
              {/* first-letter drop-cap: an editorial cue, purely presentational. */}
              <p className="mt-8 text-lg leading-relaxed text-ink-600 first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-6xl first-letter:leading-[0.82] first-letter:text-brand-500">
                {opening}
              </p>
            </Reveal>

            {rest.map((paragraph, index) => (
              <Reveal key={paragraph.slice(0, 24)} delay={0.08 * (index + 1)}>
                <p className="mt-6 text-lg leading-relaxed text-ink-600">{paragraph}</p>
              </Reveal>
            ))}

            <Reveal delay={0.1}>
              <figure className="mt-10 rounded-3xl border border-brand-100 bg-brand-50/60 p-8">
                <Quote className="size-7 text-brand-400" aria-hidden />
                <blockquote className="mt-4 font-display text-2xl leading-snug text-ink-900">
                  If I would not serve it to my own son at the end of a long day, it does not
                  leave this kitchen.
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-4">
                  {/* Handwritten-feel signature: italic display face, brand ink. */}
                  <span className="font-display text-2xl italic text-brand-600">
                    {brandStory.signature}
                  </span>
                  <span className="h-px flex-1 bg-brand-200" aria-hidden />
                  <span className="text-sm text-ink-500">{brandStory.signatureRole}</span>
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </div>
    </Section>
  );
}
