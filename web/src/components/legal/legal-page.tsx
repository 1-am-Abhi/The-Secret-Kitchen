import { Reveal } from "@/components/motion";
import { formatDate } from "@/lib/utils";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

/**
 * Shared layout for the three policy pages. Keeping the chrome here means each
 * policy file contains nothing but its actual content.
 */
export function LegalPage({
  title,
  intro,
  updatedAt,
  sections,
}: {
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <section className="pb-24 pt-32 lg:pt-40">
      <div className="container-page">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
              Legal
            </p>
            <h1 className="mt-3 text-4xl leading-tight text-ink-900 sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-600">{intro}</p>
            <p className="mt-4 text-sm text-ink-400">
              Last updated {formatDate(updatedAt)}
            </p>
          </Reveal>

          <div className="mt-12 flex flex-col gap-10">
            {sections.map((section, index) => (
              <Reveal key={section.heading} delay={Math.min(index * 0.04, 0.2)}>
                <article>
                  <h2 className="font-display text-2xl text-ink-900">
                    {section.heading}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-4 leading-relaxed text-ink-600">
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="mt-4 flex flex-col gap-2.5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-ink-600">
                          <span
                            aria-hidden
                            className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-400"
                          />
                          <span className="leading-relaxed">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
