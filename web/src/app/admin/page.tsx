import Link from "next/link";
import { ArrowUpRight, TriangleAlert } from "lucide-react";

import { BarChart } from "@/components/admin/bar-chart";
import { ChartCard, ChartLegend } from "@/components/admin/chart-card";
import { DonutChart } from "@/components/admin/donut-chart";
import { PageHeader } from "@/components/admin/page-header";
import { AreaChart, SparkLine } from "@/components/admin/spark-line";
import { StatCard } from "@/components/admin/stat-card";
import { StatusPill } from "@/components/admin/status-pill";
import {
  formatClock,
  orderStatusTone,
  paymentMethodLabel,
} from "@/components/admin/status-maps";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FoodImage } from "@/components/ui/food-image";
import {
  ORDER_STATUS_LABEL,
  dashboardKpis,
  liveOrderFeed,
  ordersByStatus,
  revenueSeries,
  stockAlerts,
  topDishes,
  type OrderStatus,
} from "@/data/admin-mock";
import { formatPrice, formatPriceCompact } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

/** Fixed hexes so the donut, the pills and the feed agree on every state. */
const STATUS_HEX: Record<OrderStatus, string> = {
  pending: "#9ca3af",
  confirmed: "#0ea5e9",
  preparing: "#f59e0b",
  "out-for-delivery": "#ff6b00",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

/**
 * Icon *names*, not components. This module is a Server Component and StatCard
 * is a Client Component — a function cannot be serialised across that boundary,
 * so the name travels as a string and StatCard resolves it via the icon map.
 */
const KPI_ICON_NAMES: Record<string, string> = {
  revenue: "IndianRupee",
  orders: "ReceiptText",
  subscribers: "Users",
  aov: "PackageCheck",
};

export default function AdminDashboardPage() {
  const last14 = revenueSeries.slice(-14);
  const monthRevenue = revenueSeries.reduce((sum, point) => sum + point.revenue, 0);
  const donutSegments = ordersByStatus
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      label: ORDER_STATUS_LABEL[entry.status],
      value: entry.count,
      color: STATUS_HEX[entry.status],
    }));
  const totalToday = donutSegments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Overview"
        title="Kitchen at a glance"
        description="Everything happening in the kitchen right now — today's takings, live orders and what needs attention before the dinner rush."
        actions={
          <>
            <Button variant="outline" size="md" asChild>
              <Link href="/admin/analytics">
                Full analytics
                <ArrowUpRight />
              </Link>
            </Button>
            <Button size="md" asChild>
              <Link href="/admin/orders">Open orders</Link>
            </Button>
          </>
        }
      />

      {/* ---- KPI tiles ---------------------------------------------------- */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((kpi, index) => (
          <StaggerItem key={kpi.id}>
            <StatCard
              label={kpi.label}
              value={kpi.value}
              change={kpi.change}
              format={kpi.format}
              hint={kpi.hint}
              icon={KPI_ICON_NAMES[kpi.id]}
              visual={
                <SparkLine
                  label={`${kpi.label} trend over the last 14 days`}
                  values={last14.map((point) =>
                    index === 1 ? point.orders : point.revenue,
                  )}
                  color={index % 2 === 0 ? "#ff6b00" : "#22c55e"}
                  showLast
                />
              }
            />
          </StaggerItem>
        ))}
      </Stagger>

      {/* ---- Revenue + status mix ----------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <ChartCard
            title="Revenue, last 30 days"
            description="Order revenue against tiffin subscription billing."
            value={formatPrice(monthRevenue)}
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
                Peak day so far:{" "}
                <span className="font-medium text-ink-900">
                  {formatPrice(Math.max(...revenueSeries.map((p) => p.revenue)))}
                </span>{" "}
                — driven by weekend dinner orders.
              </span>
            }
          >
            <AreaChart
              label="Daily revenue over the last 30 days"
              points={revenueSeries.map((point) => ({
                label: point.date.slice(8, 10),
                value: point.revenue,
                secondary: point.subscriptionRevenue,
              }))}
              formatValue={(value) => formatPriceCompact(Math.round(value))}
            />
          </ChartCard>
        </Reveal>

        <Reveal delay={0.08}>
          <ChartCard
            title="Orders by status"
            description="Today's board, live."
            className="h-full"
          >
            <div className="flex flex-col items-center gap-6">
              <DonutChart
                label="Today's orders broken down by status"
                segments={donutSegments}
                centerValue={String(totalToday)}
                centerLabel="orders today"
              />
              <ChartLegend
                className="justify-center"
                items={donutSegments.map((segment) => ({
                  label: segment.label,
                  color: segment.color,
                  value: String(segment.value),
                }))}
              />
            </div>
          </ChartCard>
        </Reveal>
      </div>

      {/* ---- Live feed + top dishes ---------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <ChartCard
            title="Live order feed"
            description="Newest first. Tap through for the full ticket."
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/orders">
                  View all
                  <ArrowUpRight />
                </Link>
              </Button>
            }
            bodyClassName="p-0 sm:p-0"
          >
            <ul className="divide-y divide-ink-100">
              {liveOrderFeed.map((order) => (
                <li key={order.id}>
                  <Link
                    href="/admin/orders"
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brand-50/40 sm:px-6"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-xs font-semibold text-ink-700">
                      {order.customerName
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-sm font-medium text-ink-900">
                          {order.customerName}
                        </span>
                        <span className="font-mono text-[11px] text-ink-400">{order.id}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-500">
                        {order.items.length} item{order.items.length > 1 ? "s" : ""} ·{" "}
                        {order.area} · {paymentMethodLabel[order.paymentMethod]}
                      </span>
                    </span>

                    <span className="hidden shrink-0 sm:block">
                      <StatusPill
                        tone={orderStatusTone[order.status]}
                        label={ORDER_STATUS_LABEL[order.status]}
                        pulse={order.status === "preparing" || order.status === "pending"}
                      />
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold tabular-nums text-ink-900">
                        {formatPrice(order.total)}
                      </span>
                      <span className="block text-[11px] tabular-nums text-ink-400">
                        {formatClock(order.placedAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </ChartCard>
        </Reveal>

        <Reveal delay={0.08}>
          <ChartCard
            title="Top-selling dishes"
            description="Units sold across the last 30 days."
            className="h-full"
            bodyClassName="p-0 sm:p-0"
          >
            <ol className="divide-y divide-ink-100">
              {topDishes.slice(0, 6).map((dish, index) => (
                <li key={dish.itemId} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                  <span className="w-4 shrink-0 text-sm font-semibold tabular-nums text-ink-300">
                    {index + 1}
                  </span>
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                    <FoodImage imageId={dish.imageId} alt={dish.name} sizes="44px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-900">
                      {dish.name}
                    </span>
                    <span className="block text-xs tabular-nums text-ink-500">
                      {dish.unitsSold} sold · {formatPriceCompact(dish.revenue)}
                    </span>
                  </span>
                  <Badge
                    variant={dish.change >= 0 ? "success" : "danger"}
                    size="sm"
                    className="shrink-0 tabular-nums"
                  >
                    {dish.change >= 0 ? "+" : ""}
                    {dish.change.toFixed(1)}%
                  </Badge>
                </li>
              ))}
            </ol>
          </ChartCard>
        </Reveal>
      </div>

      {/* ---- Alerts + hourly split ----------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2">
          <ChartCard
            title="Revenue by top category"
            description="Where this month's money actually came from."
          >
            <BarChart
              label="Revenue by menu category"
              data={topDishes.slice(0, 8).map((dish) => ({
                label: dish.name,
                value: dish.revenue,
                meta: `${dish.unitsSold} units`,
              }))}
              formatValue={(value) => formatPriceCompact(value)}
            />
          </ChartCard>
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="h-full rounded-3xl p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <TriangleAlert className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-lg leading-tight text-ink-900">
                  Needs attention
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  {stockAlerts.filter((alert) => alert.level === "sold-out").length} sold out ·{" "}
                  {stockAlerts.filter((alert) => alert.level === "low").length} running low
                </p>
              </div>
            </div>

            <ul className="mt-5 flex flex-col gap-3">
              {stockAlerts.map((alert) => (
                <li
                  key={alert.itemId}
                  className="rounded-2xl border border-ink-200/70 bg-ink-50/50 p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-ink-900">{alert.name}</p>
                    <StatusPill
                      size="sm"
                      tone={alert.level === "sold-out" ? "danger" : "progress"}
                      label={alert.level === "sold-out" ? "Sold out" : `${alert.portionsLeft} left`}
                    />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">{alert.note}</p>
                </li>
              ))}
            </ul>

            <Button variant="outline" size="md" className="mt-5 w-full" asChild>
              <Link href="/admin/menu">Manage availability</Link>
            </Button>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
