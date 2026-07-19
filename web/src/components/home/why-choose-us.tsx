import {
  Droplets,
  Flame,
  IndianRupee,
  Leaf,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";

import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { valueProps } from "@/data/content";

const ICONS: Record<string, LucideIcon> = {
  Flame,
  Leaf,
  ShieldCheck,
  Droplets,
  Timer,
  IndianRupee,
};

/** The trust section — the six reasons a customer should pick us over Swiggy. */
export function WhyChooseUs() {
  return (
    <Section tone="dark" className="overflow-hidden">
      {/* Warm ambient glows so the dark band still feels like our brand. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-0 size-[30rem] rounded-full bg-brand-500/20 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-20 size-[26rem] rounded-full bg-fresh-500/12 blur-[130px]"
      />

      <div className="container-page relative">
        <SectionHeading
          tone="dark"
          eyebrow="Why choose us"
          title="The difference is in what we refuse to do"
          description="No reheated gravies. No reused oil. No shrinking portions when demand grows. Six commitments we hold ourselves to, every single service."
        />

        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {valueProps.map((prop) => {
            const Icon = ICONS[prop.icon] ?? Leaf;
            return (
              <StaggerItem key={prop.id} className="h-full">
                <article className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:border-brand-400/40 hover:bg-white/[0.07]">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400 transition-colors duration-500 group-hover:bg-brand-500 group-hover:text-white">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-right">
                      <span className="block font-display text-2xl font-semibold text-white">
                        {prop.stat}
                      </span>
                      <span className="block text-[11px] uppercase tracking-wide text-ink-500">
                        {prop.statLabel}
                      </span>
                    </span>
                  </div>

                  <h3 className="mt-6 font-display text-xl text-white">{prop.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-400">
                    {prop.description}
                  </p>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </Section>
  );
}
