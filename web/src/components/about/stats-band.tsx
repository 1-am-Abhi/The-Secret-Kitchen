import { CountUp, Stagger, StaggerItem } from "@/components/motion";
import { formatStat, getSiteStats } from "@/lib/storefront-data";

/**
 * "By the numbers" band.
 *
 * Every figure is counted in Postgres — meals served, customers, subscribers,
 * average rating — and the band renders nothing at all when there is nothing to
 * count. A kitchen that has just opened has no numbers, and launch-day figures
 * invented to fill the space are the lie a customer is most likely to believe.
 */

/**
 * CountUp animates a real number and formats with `toFixed`, which has no
 * Indian digit grouping — a raw 120000 ticking upward is unreadable at speed.
 * Large values are therefore shown in lakh / thousand form.
 */
function toCounter(value: number): { value: number; decimals: number; suffix: string } {
  if (value >= 100_000) return { value: value / 100_000, decimals: 1, suffix: "L+" };
  if (value >= 1_000) return { value: value / 1_000, decimals: 1, suffix: "K+" };
  return { value, decimals: 0, suffix: "" };
}

export async function StatsBand() {
  const stats = await getSiteStats();
  if (!stats) return null;

  const tiles: { value: number; decimals: number; suffix: string; label: string }[] = [];

  if (stats.mealsServed > 0) {
    tiles.push({ ...toCounter(stats.mealsServed), label: "Meals served" });
  }
  if (stats.customersServed > 0) {
    tiles.push({ ...toCounter(stats.customersServed), label: "Households we cook for" });
  }
  if (stats.activeSubscribers > 0) {
    tiles.push({ ...toCounter(stats.activeSubscribers), label: "Active tiffin subscribers" });
  }
  if (stats.averageRating !== null && stats.reviewCount > 0) {
    tiles.push({
      value: stats.averageRating,
      decimals: 1,
      suffix: "/5",
      label: `Average rating · ${formatStat(stats.reviewCount)} reviews`,
    });
  }

  // Nothing true to show yet — omit the band rather than print a row of zeroes.
  if (tiles.length === 0) return null;

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
          {tiles.map((stat) => (
            <StaggerItem key={stat.label} className="text-center">
              <p className="font-display text-4xl text-white sm:text-5xl">
                <CountUp value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-sm font-medium text-white/80">{stat.label}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
