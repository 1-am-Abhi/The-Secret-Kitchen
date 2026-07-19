import { Section, SectionHeading } from "@/components/layout/section";
import { Parallax, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { FoodImage } from "@/components/ui/food-image";
import { ingredientPromises } from "@/data/content";

import { resolveIcon } from "./icons";

export function IngredientsSection() {
  return (
    <Section tone="cream">
      <div className="container-page">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="order-2 lg:order-1">
            <SectionHeading
              align="left"
              eyebrow="What goes in"
              title="A shorter ingredient list than you would expect"
              description="Good food is mostly good shopping. Four decisions we make before a single burner is lit."
            />

            <Stagger className="mt-10 space-y-4" stagger={0.09}>
              {ingredientPromises.map((promise) => {
                const Icon = resolveIcon(promise.icon);
                return (
                  <StaggerItem key={promise.title}>
                    <div className="flex gap-5 rounded-2xl bg-white/70 p-5 shadow-soft backdrop-blur-sm">
                      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-fresh-100 text-fresh-700">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-ink-900">{promise.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                          {promise.description}
                        </p>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>

          <div className="order-1 lg:order-2">
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              <Parallax speed={-0.06} className="mt-8">
                <Reveal animation="scale">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-lift">
                    <FoodImage
                      imageId="ingredients-1"
                      alt="Whole and ground spices laid out before the morning prep"
                      sizes="(max-width: 1024px) 45vw, 24vw"
                    />
                  </div>
                </Reveal>
              </Parallax>
              <Parallax speed={0.06}>
                <Reveal animation="scale" delay={0.12}>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-lift">
                    <FoodImage
                      imageId="salad-1"
                      alt="Fresh vegetables bought from the local mandi that morning"
                      sizes="(max-width: 1024px) 45vw, 24vw"
                    />
                  </div>
                </Reveal>
              </Parallax>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
