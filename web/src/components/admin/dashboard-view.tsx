"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, CircleSlash, TriangleAlert, UtensilsCrossed } from "lucide-react";

import { ApiErrorNotice, LoadingBlock, useAdminQuery } from "@/components/admin/admin-data";
import { BarChart } from "@/components/admin/bar-chart";
import { ChartCard, ChartLegend } from "@/components/admin/chart-card";
import { AwaitingConfirmationTile, NewOrdersFeed } from "@/components/admin/dashboard-live";
import { DonutChart } from "@/components/admin/donut-chart";
import { EmptyState } from "@/components/admin/empty-state";
import { useOrderNotifications } from "@/components/admin/order-notifications";
import { PageHeader } from "@/components/admin/page-header";
import { AreaChart, SparkLine } from "@/components/admin/spark-line";
import { StatCard } from "@/components/admin/stat-card";
import { StatusPill } from "@/components/admin/status-pill";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FoodImage } from "@/components/ui/food-image";
import {
  DASHBOARD_STATUS_HEX,
  DASHBOARD_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  formatOrderClock,
  getAnalyticsDashboard,
  listAdminMenuItems,
  listAdminOrders,
  orderItemCount,
  type AnalyticsDashboard,
  type DashboardStatusKey,
} from "@/lib/admin-orders";
import { formatPrice, formatPriceCompact } from "@/lib/utils";

/** The window every figure on this screen describes. */
const WINDOW_DAYS = 30;
const TOP_DISH_COUNT = 8;
/** How many tickets the "recent orders" rail shows. */
const RECENT_ORDER_COUNT = 8;

/**
 * The statuses the board calls out by name, in the order the kitchen works
 * through them. `PENDING_PAYMENT` leads because an unpaid order is the one
 * state where nothing should start.
 */
const BOARD_STATUSES: DashboardStatusKey[] = [
  "PENDING_PAYMENT",
  "PENDING_CUSTOMER_CONFIRMATION",
  "CONFIRMED",
  "PREPARING",
  "COOKING",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

export function DashboardView() {
  const { revision } = useOrderNotifications();

  const loadDashboard = React.useCallback(
    (signal: AbortSignal) =>
      getAnalyticsDashboard({ days: WINDOW_DAYS, topDishes: TOP_DISH_COUNT, signal }),
    [],
  );
  const loadRecent = React.useCallback(
    (signal: AbortSignal) =>
      listAdminOrders({ limit: RECENT_ORDER_COUNT, signal }).then((result) =>
        result.ok ? ({ ok: true, data: result.orders } as const) : result,
      ),
    [],
  );
  const loadMenu = React.useCallback((signal: AbortSignal) => listAdminMenuItems(signal), []);

  const dashboard = useAdminQuery(loadDashboard, revision);
  const recent = useAdminQuery(loadRecent, revision);
  // The catalogue only changes when someone edits the menu, so it does not
  // follow the order stream.
  const menu = useAdminQuery(loadMenu);

  const itemsById = React.useMemo(
    () => new Map((menu.data ?? []).map((item) => [item.id, item])),
    [menu.data],
  );

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

      {dashboard.failure && (
        <ApiErrorNotice failure={dashboard.failure} onRetry={dashboard.reload} />
      )}

      {dashboard.data ? (
        <DashboardFigures data={dashboard.data} />
      ) : (
        dashboard.loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <LoadingBlock key={index} className="h-44" label="Loading today's figures" />
            ))}
          </div>
        )
      )}

      {/* ---- Live new-order feed ------------------------------------------- */}
      {/* Client component: it subscribes to the shared SSE/polling stream that
          also drives the topbar bell and the new-order popup. */}
      <Reveal>
        <NewOrdersFeed />
      </Reveal>

      {dashboard.data && (
        <>
          {/* ---- Revenue + status mix ------------------------------------- */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Reveal className="xl:col-span-2">
              <RevenueCard data={dashboard.data} />
            </Reveal>

            <Reveal delay={0.08}>
              <StatusMixCard data={dashboard.data} />
            </Reveal>
          </div>

          {/* ---- Recent orders + top dishes ------------------------------- */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Reveal className="xl:col-span-2">
              <ChartCard
                title="Recent orders"
                description="Newest first, straight from the orders table."
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
                {recent.failure ? (
                  <div className="p-5 sm:p-6">
                    <ApiErrorNotice failure={recent.failure} onRetry={recent.reload} />
                  </div>
                ) : recent.data && recent.data.length > 0 ? (
                  <ul className="divide-y divide-ink-100">
                    {recent.data.map((order) => (
                      <li key={order.id}>
                        <Link
                          href="/admin/orders"
                          className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brand-50/40 sm:px-6"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-xs font-semibold text-ink-700">
                            {initialsOf(order.customerName)}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="truncate text-sm font-medium text-ink-900">
                                {order.customerName}
                              </span>
                              <span className="font-mono text-[11px] text-ink-400">
                                {order.orderNumber}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-ink-500">
                              {orderItemCount(order)} item
                              {orderItemCount(order) === 1 ? "" : "s"}
                              {order.delivery.city ? ` · ${order.delivery.city}` : ""} ·{" "}
                              {order.paymentMethod}
                            </span>
                          </span>

                          <span className="hidden shrink-0 sm:block">
                            <StatusPill
                              tone={ORDER_STATUS_TONE[order.status]}
                              label={ORDER_STATUS_LABEL[order.status]}
                              pulse={
                                order.status === "PENDING_CUSTOMER_CONFIRMATION" ||
                                order.status === "COOKING"
                              }
                            />
                          </span>

                          <span className="shrink-0 text-right">
                            <span className="block text-sm font-semibold tabular-nums text-ink-900">
                              {formatPrice(order.bill.total)}
                            </span>
                            <span className="block text-[11px] tabular-nums text-ink-400">
                              {formatOrderClock(order.placedAt)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-5 sm:p-6">
                    <EmptyState
                      icon={CircleSlash}
                      title="No orders yet"
                      description="The database has not recorded a single order. The moment one lands it appears here."
                    />
                  </div>
                )}
              </ChartCard>
            </Reveal>

            <Reveal delay={0.08}>
              <ChartCard
                title="Top-selling dishes"
                description={`Units sold across the last ${WINDOW_DAYS} days.`}
                className="h-full"
                bodyClassName="p-0 sm:p-0"
              >
                {dashboard.data.topDishes.length === 0 ? (
                  <div className="p-5 sm:p-6">
                    <EmptyState
                      icon={UtensilsCrossed}
                      title="Nothing sold yet"
                      description="Rankings appear once dishes start moving out of the kitchen."
                    />
                  </div>
                ) : (
                  <ol className="divide-y divide-ink-100">
                    {dashboard.data.topDishes.slice(0, 6).map((dish, index) => (
                      <li
                        key={dish.menuItemId}
                        className="flex items-center gap-3 px-5 py-3 sm:px-6"
                      >
                        <span className="w-4 shrink-0 text-sm font-semibold tabular-nums text-ink-300">
                          {index + 1}
                        </span>
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                          <FoodImage
                            imageId={itemsById.get(dish.menuItemId)?.imageId ?? "hero-1"}
                            alt={dish.name}
                            sizes="44px"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink-900">
                            {dish.name}
                          </span>
                          <span className="block text-xs tabular-nums text-ink-500">
                            {dish.quantity} sold · {formatPriceCompact(dish.revenue)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </ChartCard>
            </Reveal>
          </div>

          {/* ---- Order timeline + alerts ---------------------------------- */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Reveal className="xl:col-span-2">
              <OrderTimelineCard data={dashboard.data} />
            </Reveal>

            <Reveal delay={0.08}>
              <NeedsAttentionCard
                data={dashboard.data}
                unavailable={(menu.data ?? []).filter((item) => !item.available)}
              />
            </Reveal>
          </div>
        </>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  KPI tiles                                                                 */
/* ========================================================================== */

/**
 * Icon *names*, not components — StatCard resolves them from the admin icon
 * map, which keeps this module free of icon imports it never renders itself.
 */
const KPI_ICONS = {
  orders: "ReceiptText",
  revenue: "IndianRupee",
  month: "TrendingUp",
  aov: "PackageCheck",
} as const;

function DashboardFigures({ data }: { data: AnalyticsDashboard }) {
  const daily = data.series.daily;
  // The series ends today, so the last point *is* today — no clock reading and
  // no timezone guess required.
  const today = daily.at(-1) ?? { date: "", revenue: 0, orders: 0 };
  const yesterday = daily.at(-2) ?? { date: "", revenue: 0, orders: 0 };
  const last14 = daily.slice(-14);

  return (
    <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <StaggerItem>
        <AwaitingConfirmationTile fallback={data.orders.awaitingConfirmation} />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Today's orders"
          value={today.orders}
          change={percentChange(today.orders, yesterday.orders)}
          icon={KPI_ICONS.orders}
          hint="against yesterday"
          visual={
            <SparkLine
              label="Orders per day over the last 14 days"
              values={last14.map((point) => point.orders)}
              color="#ff6b00"
              showLast
            />
          }
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Today's revenue"
          value={today.revenue}
          format="currency"
          change={percentChange(today.revenue, yesterday.revenue)}
          icon={KPI_ICONS.revenue}
          hint="delivered orders, inclusive of GST"
          visual={
            <SparkLine
              label="Revenue per day over the last 14 days"
              values={last14.map((point) => point.revenue)}
              color="#22c55e"
              showLast
            />
          }
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Monthly revenue"
          value={data.revenue.total}
          format="currency"
          change={data.revenue.changePercent}
          icon={KPI_ICONS.month}
          hint={`last ${data.range.days} days`}
          visual={
            <SparkLine
              label={`Revenue across the last ${data.range.days} days`}
              values={daily.map((point) => point.revenue)}
              color="#22c55e"
            />
          }
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Average order value"
          value={data.revenue.averageOrderValue}
          format="currency"
          icon={KPI_ICONS.aov}
          hint={`across ${data.orders.delivered} delivered order${
            data.orders.delivered === 1 ? "" : "s"
          }`}
        />
      </StaggerItem>
    </Stagger>
  );
}

/* ========================================================================== */
/*  Charts                                                                    */
/* ========================================================================== */

function RevenueCard({ data }: { data: AnalyticsDashboard }) {
  const daily = data.series.daily;
  const peak = daily.reduce((best, point) => (point.revenue > best ? point.revenue : best), 0);

  return (
    <ChartCard
      title={`Revenue, last ${data.range.days} days`}
      description="Delivered order revenue, day by day."
      value={formatPrice(data.revenue.total)}
      actions={<ChartLegend items={[{ label: "Order revenue", color: "#ff6b00" }]} />}
      footer={
        peak > 0 ? (
          <span>
            Peak day so far:{" "}
            <span className="font-medium text-ink-900">{formatPrice(peak)}</span>
          </span>
        ) : (
          <span>No revenue recorded in this window yet.</span>
        )
      }
    >
      <AreaChart
        label={`Daily revenue over the last ${data.range.days} days`}
        points={daily.map((point) => ({
          label: point.date.slice(8, 10),
          value: point.revenue,
        }))}
        formatValue={(value) => formatPriceCompact(Math.round(value))}
      />
    </ChartCard>
  );
}

function StatusMixCard({ data }: { data: AnalyticsDashboard }) {
  const segments = BOARD_STATUSES.map((status) => ({
    label: DASHBOARD_STATUS_LABEL[status],
    value: data.orders.byStatus[status],
    color: DASHBOARD_STATUS_HEX[status],
  }));
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <ChartCard
      title="Orders by status"
      description={`Every ticket in the last ${data.range.days} days.`}
      className="h-full"
    >
      <div className="flex flex-col items-center gap-6">
        <DonutChart
          label="Orders broken down by status"
          segments={segments.filter((segment) => segment.value > 0)}
          centerValue={String(total)}
          centerLabel={total === 1 ? "order" : "orders"}
        />
        {/* The legend lists every state, including the empty ones — an operator
            needs to see that "0 cancelled" is a fact, not a missing row. */}
        <ChartLegend
          className="justify-center"
          items={segments.map((segment) => ({
            label: segment.label,
            color: segment.color,
            value: String(segment.value),
          }))}
        />
      </div>
    </ChartCard>
  );
}

function OrderTimelineCard({ data }: { data: AnalyticsDashboard }) {
  const daily = data.series.daily;
  const busiest = daily.reduce(
    (best, point) => (point.orders > best.orders ? point : best),
    { date: "", revenue: 0, orders: 0 },
  );

  return (
    <ChartCard
      title="Order timeline"
      description={`Orders placed each day across the last ${data.range.days} days.`}
      value={String(data.orders.total)}
      footer={
        busiest.orders > 0 ? (
          <span>
            Busiest day:{" "}
            <span className="font-medium text-ink-900">{formatDay(busiest.date)}</span> with{" "}
            {busiest.orders} order{busiest.orders === 1 ? "" : "s"}.
          </span>
        ) : (
          <span>No orders have been placed in this window.</span>
        )
      }
    >
      <BarChart
        orientation="vertical"
        label={`Orders per day over the last ${data.range.days} days`}
        data={daily.map((point) => ({ label: point.date.slice(8, 10), value: point.orders }))}
        emphasiseMax
      />
    </ChartCard>
  );
}

/* ========================================================================== */
/*  Needs attention                                                           */
/* ========================================================================== */

interface UnavailableDish {
  id: string;
  name: string;
}

function NeedsAttentionCard({
  data,
  unavailable,
}: {
  data: AnalyticsDashboard;
  unavailable: UnavailableDish[];
}) {
  const alerts: { id: string; title: string; note: string; tone: "danger" | "progress" }[] = [];

  if (data.orders.awaitingConfirmation > 0) {
    alerts.push({
      id: "awaiting",
      title: `${data.orders.awaitingConfirmation} order${
        data.orders.awaitingConfirmation === 1 ? "" : "s"
      } awaiting confirmation`,
      note: "Saved in the database, but the customer may never have pressed Send on WhatsApp.",
      tone: "danger",
    });
  }
  if (data.operations.openEnquiries > 0) {
    alerts.push({
      id: "enquiries",
      title: `${data.operations.openEnquiries} open enquir${
        data.operations.openEnquiries === 1 ? "y" : "ies"
      }`,
      note: "Waiting on a reply from the kitchen.",
      tone: "progress",
    });
  }
  for (const dish of unavailable) {
    alerts.push({
      id: `dish-${dish.id}`,
      title: dish.name,
      note: "Switched off in the menu — the storefront is not selling it.",
      tone: "danger",
    });
  }

  return (
    <Card className="h-full rounded-3xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg leading-tight text-ink-900">Needs attention</h2>
          <p className="mt-1 text-sm text-ink-500">
            {unavailable.length} dish{unavailable.length === 1 ? "" : "es"} unavailable ·{" "}
            {data.orders.awaitingConfirmation} unconfirmed
          </p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-sm leading-relaxed text-ink-500">
          Nothing needs attention. Every dish is available and no order is waiting on a
          confirmation.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {alerts.map((alert) => (
            <li key={alert.id} className="rounded-2xl border border-ink-200/70 bg-ink-50/50 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-ink-900">{alert.title}</p>
                <StatusPill
                  size="sm"
                  tone={alert.tone}
                  label={alert.tone === "danger" ? "Action" : "Open"}
                />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{alert.note}</p>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" size="md" className="mt-5 w-full" asChild>
        <Link href="/admin/menu">Manage availability</Link>
      </Button>
    </Card>
  );
}

/* ========================================================================== */
/*  Helpers                                                                   */
/* ========================================================================== */

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

/** Growth against the previous period. Undefined when there is no base to compare. */
function percentChange(current: number, previous: number): number | undefined {
  if (previous === 0) return current === 0 ? 0 : undefined;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "12 Jul" from a plain YYYY-MM-DD string — no timezone maths involved. */
function formatDay(iso: string): string {
  if (iso.length < 10) return "—";
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}
