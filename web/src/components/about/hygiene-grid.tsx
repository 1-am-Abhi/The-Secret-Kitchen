import { ShieldCheck } from "lucide-react";

import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { hygienePractices } from "@/data/content";
import { siteConfig } from "@/config/site";

import { resolveIcon } from "./icons";

/**
 * Hygiene is the single biggest objection people have to cloud kitchens, so it
 * gets a dark section of its own — visually the most serious block on the page.
 */
export function HygieneGrid() {
  return (
    <Section tone="dark">
      <div className="container-page">
        <SectionHeading
          tone="dark"
          eyebrow="Behind the pass"
          title="Six things we do every single day"
          description="Cloud kitchens are invisible by design. These are the practices we would want to see if we were the ones ordering."
        />

        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
          {hygienePractices.map((practice) => {
            const Icon = resolveIcon(practice.icon);
            return (
              <StaggerItem key={practice.title}>
                <article className="group h-full rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition-colors duration-500 hover:border-brand-500/40 hover:bg-white/[0.07]">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300 transition-colors duration-500 group-hover:bg-brand-500 group-hover:text-white">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg text-white">{practice.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-400">
                    {practice.description}
                  </p>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:flex-row sm:items-center sm:gap-6">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-fresh-500/15 text-fresh-400">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-ink-300">
            <span className="font-semibold text-white">FSSAI licence no. {siteConfig.fssaiLicense}</span>{" "}
            — displayed in our kitchen and printed on every bill. Ask us for the latest audit
            report on WhatsApp and we will send it to you, unedited.
          </p>
        </div>
      </div>
    </Section>
  );
}
