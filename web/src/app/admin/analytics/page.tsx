import { BarChart } from "@/components/admin/bar-chart";
import { ChartCard, ChartLegend, chartColor } from "@/components/admin/chart-card";
import { DonutChart } from "@/components/admin/donut-chart";
import { Heatmap } from "@/components/admin/heatmap";
import { PageHeader } from "@/components/admin/page-header";
import { AreaChart } from "@/components/admin/spark-line";
import { StatCard } from "@/components/admin/stat-card";
import { Reveal } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  WEEKDAYS,
  categoryPerformance,
  hourlyOrders,
  peakHoursHeatmap,
  retentionCohorts,
  revenueSeries,
  subscriberGrowth,
} from "@/data/admin-mock";
import { formatPrice, formatPriceCompact } from "@/lib/utils";

export const metadata = { title: "Analytics" };

export default function AdminAnalyticsPage() {
  const totalRevenue = revenueSeries.reduce((sum, point) => sum + point.revenue, 0);
  const totalOrders = revenueSeries.reduce((sum, point) => sum + point.orders, 0);
  const avgTicket = Math.round(totalRevenue / totalOrders);

  const previousWindow = revenueSeries.slice(0, 15).reduce((sum, p) => sum + p.revenue, 0);
  const currentWindow = revenueSeries.slice(15).reduce((sum, p) => sum + p.revenue, 0);
  const windowChange = Number(
    (((currentWindow - previousWindow) / previousWindow) * 100).toFixed(1),
  );

  const latestGrowth = subscriberGrowth[subscriberGrowth.length - 1];
  const priorGrowth = subscriberGrowth[subscriberGrowth.length - 2];
  const churnRate = Number(
    ((latestGrowth.churned / priorGrowth.active) * 100).toFixed(1),
  );

  const hours = hourlyOrders.map((entry) => `${entry.hour}`);
  const heatValues = WEEKDAYS.map((day) =>
    hourlyOrders.map(
      (entry) =>
        peakHoursHeatmap.find((cell) => cell.day === day && cell.hour === entry.hour)
          ?.orders ?? 0,
    ),
  );

  const busiestHour = hourlyOrders.reduce((best, entry) =>
    entry.orders > best.orders ? entry : best,
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Insight"
        title="Analytics"
        description="Thirty days of trading, broken down by time, category and cohort. Everything here updates with the kitchen's live figures."
        actions={
          <Badge variant="outline" size="lg">
            Last 30 days
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={totalRevenue} format="currency" change={windowChange} />
        <StatCard label="Orders" value={totalOrders} change={9.7} />
        <StatCard label="Average ticket" value={avgTicket} format="currency" change={3.4} />
        <StatCard
          label="Monthly churn"
          value={churnRate}
          format="percent"
          change={0.6}
          invertTrend
          hint="Subscribers lost against prior active base"
        />
      </div>

      {/* ---- Revenue over time -------------------------------------------- */}
      <Reveal>
        <ChartCard
          title="Revenue over time"
          description="Daily order revenue with the tiffin subscription line underneath."
          value={formatPrice(totalRevenue)}
          actions={
            <ChartLegend
              items={[
                { label: "Orders", color: "#ff6b00" },
                { label: "Subscriptions", color: "#1f2937" },
              ]}
            />
          }
          footer={
            <span>
              The second half of the window is{" "}
              <span className="font-medium text-ink-900">{windowChange}%</span> ahead of the
              first — weekend dinner volume is doing most of the work.
            </span>
          }
        >
          <AreaChart
            label="Daily revenue across the last 30 days"
            points={revenueSeries.map((point) => ({
              label: point.date.slice(8, 10),
              value: point.revenue,
              secondary: point.subscriptionRevenue,
            }))}
            formatValue={(value) => formatPriceCompact(Math.round(value))}
          />
        </ChartCard>
      </Reveal>

      {/* ---- Category performance ----------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <ChartCard
            title="Category performance"
            description="Revenue per menu category, with the 30-day change."
          >
            <BarChart
              label="Revenue by menu category"
              data={categoryPerformance.map((entry, index) => ({
                label: entry.name,
                value: entry.revenue,
                color: chartColor(index),
                meta: `${entry.change >= 0 ? "+" : ""}${entry.change}% · ${entry.orders} orders`,
              }))}
              formatValue={(value) => formatPriceCompact(value)}
            />
          </ChartCard>
        </Reveal>

        <Reveal delay={0.08}>
          <ChartCard
            title="Revenue mix"
            description="Share of takings by category."
            className="h-full"
          >
            <div className="flex flex-col items-center gap-6">
              <DonutChart
                label="Share of revenue by menu category"
                segments={categoryPerformance.slice(0, 6).map((entry, index) => ({
                  label: entry.name,
                  value: entry.revenue,
                  color: chartColor(index),
                }))}
                centerValue={formatPriceCompact(
                  categoryPerformance.reduce((sum, entry) => sum + entry.revenue, 0),
                )}
                centerLabel="total revenue"
              />
              <ChartLegend
                className="justify-center"
                items={categoryPerformance.slice(0, 6).map((entry, index) => ({
                  label: entry.name,
                  color: chartColor(index),
                }))}
              />
            </div>
          </ChartCard>
        </Reveal>
      </div>

      {/* ---- Peak hours ---------------------------------------------------- */}
      <Reveal>
        <ChartCard
          title="Peak hours"
          description="Orders by weekday and hour of the service day."
          footer={
            <span>
              Busiest slot is{" "}
              <span className="font-medium text-ink-900">
                {busiestHour.hour}:00 – {busiestHour.hour + 1}:00
              </span>{" "}
              — staff the pass fifteen minutes ahead of it.
            </span>
          }
        >
          <div className="flex flex-col gap-6">
            <Heatmap
              label="Orders by weekday and hour"
              rows={[...WEEKDAYS]}
              columns={hours}
              values={heatValues}
            />

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Combined hourly volume
              </p>
              <BarChart
                orientation="vertical"
                label="Total orders per hour of the day"
                data={hourlyOrders.map((entry) => ({
                  label: `${entry.hour}`,
                  value: entry.orders,
                }))}
                emphasiseMax
              />
            </div>
          </div>
        </ChartCard>
      </Reveal>

      {/* ---- Subscriber growth + retention --------------------------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Reveal>
          <ChartCard
            title="Subscriber growth"
            description="Active tiffin plans at the close of each month."
            value={String(latestGrowth.active)}
            className="h-full"
            footer={
              <span>
                {latestGrowth.newSignups} signed up and {latestGrowth.churned} lapsed last month
                — a net gain of {latestGrowth.newSignups - latestGrowth.churned}.
              </span>
            }
          >
            <AreaChart
              label="Active subscribers by month"
              points={subscriberGrowth.map((point) => ({
                label: point.month.slice(0, 3),
                value: point.active,
              }))}
              color="#22c55e"
              formatValue={(value) => String(Math.round(value))}
              xTicks={6}
            />
          </ChartCard>
        </Reveal>

        <Reveal delay={0.08}>
          <ChartCard
            title="Retention by cohort"
            description="Share of each month's new customers still ordering."
            className="h-full"
            footer={
              <span>
                Month-1 retention has climbed from 66% to 77% since the tiffin trial pack
                launched.
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] border-separate border-spacing-1 text-xs">
                <caption className="sr-only">
                  Customer retention by signup cohort, month zero to month five
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="pb-1 text-left text-[11px] text-ink-400">
                      Cohort
                    </th>
                    <th scope="col" className="pb-1 text-right text-[11px] text-ink-400">
                      Size
                    </th>
                    {["M0", "M1", "M2", "M3", "M4", "M5"].map((month) => (
                      <th
                        key={month}
                        scope="col"
                        className="pb-1 text-center text-[11px] text-ink-400"
                      >
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {retentionCohorts.map((cohort) => (
                    <tr key={cohort.cohort}>
                      <th
                        scope="row"
                        className="pr-2 text-left text-[11px] font-medium text-ink-700"
                      >
                        {cohort.cohort}
                      </th>
                      <td className="pr-2 text-right text-[11px] tabular-nums text-ink-500">
                        {cohort.size}
                      </td>
                      {Array.from({ length: 6 }, (_, index) => {
                        const value = cohort.months[index];
                        return (
                          <td key={index} className="p-0">
                            {value === undefined ? (
                              <div className="h-8 rounded-lg bg-ink-50" />
                            ) : (
                              <div
                                className="flex h-8 items-center justify-center rounded-lg text-[10px] font-medium tabular-nums"
                                style={{
                                  backgroundColor: `rgb(34 197 94 / ${(0.08 + (value / 100) * 0.8).toFixed(3)})`,
                                  color: value > 60 ? "#fff" : "#4b5563",
                                }}
                              >
                                {value}%
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </Reveal>
      </div>

      {/* ---- Signup vs churn ----------------------------------------------- */}
      <Reveal>
        <Card className="rounded-3xl p-5 sm:p-6">
          <h2 className="font-display text-lg text-ink-900">Signups against churn</h2>
          <p className="mt-1 text-sm text-ink-500">
            Every month of the last year. A widening gap is the healthiest signal the tiffin
            business produces.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fresh-700">
                New signups
              </p>
              <BarChart
                orientation="vertical"
                label="New subscriber signups per month"
                data={subscriberGrowth.map((point) => ({
                  label: point.month.slice(0, 3),
                  value: point.newSignups,
                }))}
                color="#22c55e"
              />
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Churned
              </p>
              <BarChart
                orientation="vertical"
                label="Churned subscribers per month"
                data={subscriberGrowth.map((point) => ({
                  label: point.month.slice(0, 3),
                  value: point.churned,
                }))}
                color="#9ca3af"
              />
            </div>
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
