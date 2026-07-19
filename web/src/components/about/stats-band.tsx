import { CountUp, Stagger, StaggerItem } from "@/components/motion";
import { siteConfig } from "@/config/site";

/**
 * siteConfig stores these as display strings ("1,20,000+") for the hero and
 * footer, but CountUp animates a real number and formats with toFixed — which
 * has no Indian digit grouping. Large figures are therefore expressed in lakh /
 * thousand so the ticking number stays legible at every frame.
 */
const stats = [
  { value: 1.2, decimals: 1, suffix: "L+", label: "Meals served since 2019" },
  { value: 8.5, decimals: 1, suffix: "K+", label: "Households we cook for" },
  { value: 1200, decimals: 0, suffix: "+", label: "Active tiffin subscribers" },
  { value: siteConfig.stats.rating, decimals: 1, suffix: "/5", label: "Average customer rating" },
];

export function StatsBand() {
  return (
    <section
      aria-label="The Secret Kitchen by the numbers"
      className="relative overflow-hidden bg-brand-500 py-16 lg:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(255_255_255/0.18),transparent_55%)]"
      />
      <div className="container-page relative">
        <Stagger className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
          {stats.map((stat) => (
            <StaggerItem key={stat.label} className="text-center">
              <p className="font-display text-4xl text-white sm:text-5xl">
                <CountUp
                  value={stat.value}
                  decimals={stat.decimals}
                  suffix={stat.suffix}
                />
              </p>
              <p className="mt-2 text-sm font-medium text-white/80">{stat.label}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
