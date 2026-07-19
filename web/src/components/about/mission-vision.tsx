import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { missionVision } from "@/data/content";

import { resolveIcon } from "./icons";

export function MissionVision() {
  return (
    <Section tone="muted">
      <div className="container-page">
        <SectionHeading
          eyebrow="What drives us"
          title="Two sentences we hold ourselves to"
          description="Everything from how we buy vegetables to how we price a tiffin is decided against these."
        />

        <Stagger className="mt-14 grid gap-6 md:grid-cols-2" stagger={0.12}>
          {missionVision.map((item) => {
            const Icon = resolveIcon(item.icon);
            return (
              <StaggerItem key={item.id}>
                <article className="group relative h-full overflow-hidden rounded-3xl border border-ink-200/70 bg-white p-8 shadow-soft transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-lift lg:p-10">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-50 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <div className="relative">
                    <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-[var(--shadow-glow)]">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                      {item.label}
                    </p>
                    <h3 className="mt-3 text-2xl leading-snug text-ink-900">{item.title}</h3>
                    <p className="mt-4 leading-relaxed text-ink-600">{item.description}</p>
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
