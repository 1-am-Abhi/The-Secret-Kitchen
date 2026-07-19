import { Bike, ChefHat, SlidersHorizontal, UtensilsCrossed, type LucideIcon } from "lucide-react";

import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { howItWorks } from "@/data/content";

const ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed,
  SlidersHorizontal,
  ChefHat,
  Bike,
};

export function HowItWorks() {
  return (
    <Section tone="cream">
      <div className="container-page">
        <SectionHeading
          eyebrow="How it works"
          title="From craving to doorstep in four steps"
          description="No app to download, no minimum commitment. Order once or subscribe for the month."
        />

        <Stagger className="relative mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connector line threading the steps together on desktop. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent lg:block"
          />

          {howItWorks.map((step) => {
            const Icon = ICONS[step.icon] ?? UtensilsCrossed;
            return (
              <StaggerItem key={step.step} className="relative">
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                  <span className="relative flex size-16 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-lift ring-1 ring-ink-200/60">
                    <Icon className="size-7" />
                    <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white ring-4 ring-cream">
                      {step.step}
                    </span>
                  </span>

                  <h3 className="mt-6 font-display text-xl text-ink-900">{step.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-500">
                    {step.description}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </Section>
  );
}
