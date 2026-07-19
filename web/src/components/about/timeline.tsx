import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { milestones } from "@/data/content";
import { cn } from "@/lib/utils";

/**
 * Milestone timeline.
 *
 * One markup tree serves both breakpoints: below `lg` the rail sits on the left
 * of every entry, above `lg` entries alternate either side of a centre rail.
 * Rendering two separate trees would double the maintenance and duplicate the
 * content for screen readers.
 */
export function Timeline() {
  return (
    <Section>
      <div className="container-page">
        <SectionHeading
          eyebrow="How we got here"
          title="Eighteen tiffins to twelve hundred subscribers"
          description="No investors, no franchise playbook — just one more happy customer than the month before."
        />

        {/* role=list on a div: <Stagger> only renders div/ul/section, and a <ul>
            cannot legally hold the <div> children <StaggerItem> emits. */}
        <Stagger
          className="relative mt-16 space-y-10 lg:space-y-0"
          stagger={0.1}
          role="list"
        >
          {/* The rail: left-aligned on mobile, centred from lg upwards. */}
          <span
            aria-hidden
            className="absolute bottom-2 left-[11px] top-2 w-px bg-gradient-to-b from-brand-200 via-brand-300 to-transparent lg:left-1/2 lg:-translate-x-1/2"
          />

          {milestones.map((milestone, index) => {
            const isRight = index % 2 === 1;
            return (
              <StaggerItem
                key={milestone.year}
                role="listitem"
                animation={isRight ? "right" : "left"}
                className={cn(
                  "relative pl-10 lg:grid lg:w-full lg:grid-cols-2 lg:gap-16 lg:pb-14 lg:pl-0",
                )}
              >
                {/* Node marker sits on the rail at both breakpoints. */}
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 flex size-[23px] items-center justify-center rounded-full border-2 border-brand-300 bg-white lg:left-1/2 lg:-translate-x-1/2"
                >
                  <span className="size-2.5 rounded-full bg-brand-500" />
                </span>

                <div
                  className={cn(
                    "lg:col-span-1",
                    isRight ? "lg:col-start-2 lg:pl-6" : "lg:col-start-1 lg:pr-6 lg:text-right",
                  )}
                >
                  <p className="font-display text-3xl text-brand-500">{milestone.year}</p>
                  <h3 className="mt-2 text-xl text-ink-900">{milestone.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-600">{milestone.description}</p>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </Section>
  );
}
