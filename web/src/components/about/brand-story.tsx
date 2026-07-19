import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion";
import { FoodImage } from "@/components/ui/food-image";
import { getImage, FALLBACK_IMAGE } from "@/config/images";
import { getContentBlock } from "@/lib/storefront-data";

/**
 * The founder's story — an admin-authored content block.
 *
 * This used to be a paragraph array in source control naming a founder, a
 * founding year and a subscriber count. None of that could be verified from
 * here, so the copy now belongs to whoever actually runs the kitchen: they
 * write it in the admin panel, and until they do the section does not render.
 */
export async function BrandStory() {
  const story = await getContentBlock("about.story");
  if (!story || story.paragraphs.length === 0) return null;

  const [opening, ...rest] = story.paragraphs;
  const hasPortrait = getImage("team-1").src !== FALLBACK_IMAGE.src;

  return (
    <Section size="lg">
      <div className="container-page">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* Sticky portrait keeps the author in frame while the story scrolls.
              Omitted when no real portrait has been uploaded — a stock photo of
              food under a person's name reads as a fabrication. */}
          {hasPortrait && (
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Reveal animation="left">
                <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-lift">
                  <FoodImage
                    imageId="team-1"
                    alt={story.signature ?? "Inside our kitchen"}
                    sizes="(max-width: 1024px) 90vw, 34vw"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink-900/80 to-transparent"
                  />
                  {story.signature && (
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <p className="font-display text-2xl text-white">{story.signature}</p>
                      {story.signatureRole && (
                        <p className="text-sm text-white/75">{story.signatureRole}</p>
                      )}
                    </div>
                  )}
                </div>
              </Reveal>
            </div>
          )}

          <div className={hasPortrait ? undefined : "lg:col-span-2"}>
            <Reveal>
              {story.eyebrow && (
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                  <span className="size-1.5 rounded-full bg-current" />
                  {story.eyebrow}
                </span>
              )}
              {story.title && (
                <h2 className="mt-5 text-3xl leading-[1.1] text-ink-900 sm:text-4xl lg:text-[2.75rem]">
                  {story.title}
                </h2>
              )}
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

            {story.signature && (
              <Reveal delay={0.1}>
                <p className="mt-10 flex items-center gap-4">
                  <span className="font-display text-2xl italic text-brand-600">
                    {story.signature}
                  </span>
                  <span className="h-px flex-1 bg-brand-200" aria-hidden />
                  {story.signatureRole && (
                    <span className="text-sm text-ink-500">{story.signatureRole}</span>
                  )}
                </p>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
