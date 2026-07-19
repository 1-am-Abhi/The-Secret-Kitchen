import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { FoodImage } from "@/components/ui/food-image";
import { getImage, FALLBACK_IMAGE } from "@/config/images";
import { chefTeam } from "@/data/content";

/**
 * Team cards.
 *
 * Portraits are the last assets to arrive in a build like this, so each card
 * falls back to a typographic initials avatar when the registry has no real
 * entry for that person's key — `getImage` would otherwise hand us a photo of
 * food, which reads as a mistake on a person card.
 */
export function TeamGrid() {
  return (
    <Section>
      <div className="container-page">
        <SectionHeading
          eyebrow="The people cooking"
          title="Four chefs, seventy years between them"
          description="No rotating agency staff. The same team has cooked your food every day for years, and they are the reason the dal tastes the same in March as it did in November."
        />

        <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" stagger={0.09}>
          {chefTeam.map((chef) => {
            // A real portrait exists only when the registry resolves to something
            // other than the generic food fallback.
            const hasPortrait = getImage(chef.imageId).src !== FALLBACK_IMAGE.src;

            return (
              <StaggerItem key={chef.name}>
                <article className="group h-full overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-soft transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:shadow-lift">
                  <div className="relative aspect-[4/5] overflow-hidden bg-brand-50">
                    {hasPortrait ? (
                      <FoodImage
                        imageId={chef.imageId}
                        alt={`${chef.name}, ${chef.role} at The Secret Kitchen`}
                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
                        className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex size-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200"
                        role="img"
                        aria-label={`Portrait placeholder for ${chef.name}`}
                      >
                        <span className="font-display text-6xl text-brand-600">
                          {chef.initials}
                        </span>
                      </div>
                    )}

                    <Badge
                      variant="bestseller"
                      size="sm"
                      className="absolute left-4 top-4 backdrop-blur"
                    >
                      {chef.experience}
                    </Badge>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg text-ink-900">{chef.name}</h3>
                    <p className="mt-0.5 text-sm font-medium text-brand-600">{chef.role}</p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-600">{chef.bio}</p>
                    <p className="mt-4 border-t border-ink-100 pt-4 text-xs uppercase tracking-[0.12em] text-ink-400">
                      {chef.speciality}
                    </p>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </Section>
  );
}
