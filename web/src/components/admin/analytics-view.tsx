"use client";

import * as React from "react";
import { ChartNoAxesColumn, UsersRound, UtensilsCrossed } from "lucide-react";

import {
  ApiErrorNotice,
  LoadingBlock,
  useAdminQuery,
  type AdminQuery,
} from "@/components/admin/admin-data";
import { BarChart } from "@/components/admin/bar-chart";
import { ChartCard, ChartLegend, chartColor } from "@/components/admin/chart-card";
import { DonutChart } from "@/components/admin/donut-chart";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { AreaChart } from "@/components/admin/spark-line";
import { StatCard } from "@/components/admin/stat-card";
import { Reveal } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import {
  getAnalyticsDashboard,
  listAdminCustomers,
  listAdminMenuCategories,
  listAdminMenuItems,
  type AdminCustomerSummary,
  type AdminMenuCategory,
  type AdminMenuItem,
  type AdminPage,
  type AnalyticsDashboard,
  type DashboardSeriesPoint,
} from "@/lib/admin-orders";
import { formatPrice, formatPriceCompact } from "@/lib/utils";

/** The headline window. Everything on this page describes it unless labelled. */
const WINDOW_DAYS = 30;
/** The API caps `topDishes` at 25; taking the cap makes the category split as complete as it can be. */
const TOP_DISH_COUNT = 25;
/** A year of daily points, bucketed into calendar months below. */
const YEAR_DAYS = 365;
/** One page of customers is enough to split repeat from one-off honestly, and we say so when it is not. */
const CUSTOMER_PAGE = 100;

export function AnalyticsView() {
  const loadWindow = React.useCallback(
    (signal: AbortSignal) =>
      getAnalyticsDashboard({ days: WINDOW_DAYS, topDishes: TOP_DISH_COUNT, signal }),
    [],
  );
  const loadYear = React.useCallback(
    (signal: AbortSignal) => getAnalyticsDashboard({ days: YEAR_DAYS, topDishes: 1, signal }),
    [],
  );
  const loadCategories = React.useCallback(
    (signal: AbortSignal) => listAdminMenuCategories(signal),
    [],
  );
  const loadItems = React.useCallback((signal: AbortSignal) => listAdminMenuItems(signal), []);
  const loadCustomers = React.useCallback(
    (signal: AbortSignal) => listAdminCustomers({ limit: CUSTOMER_PAGE, sort: "orders", signal }),
    [],
  );

  const windowed = useAdminQuery(loadWindow);
  const year = useAdminQuery(loadYear);
  const categories = useAdminQuery(loadCategories);
  const items = useAdminQuery(loadItems);
  const customers = useAdminQuery(loadCustomers);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Insight"
        title="Analytics"
        description="Trading broken down by day, week, month, dish and customer. Every figure is read from the kitchen's database — nothing here is modelled or estimated."
        actions={
          <Badge variant="outline" size="lg">
            Last {WINDOW_DAYS} days
          </Badge>
        }
      />

      {windowed.failure && (
        <ApiErrorNotice failure={windowed.failure} onRetry={windowed.reload} />
      )}

      {!windowed.data ? (
        windowed.loading && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <LoadingBlock key={index} className="h-36" label="Loading analytics" />
              ))}
            </div>
            <LoadingBlock className="h-80" label="Loading the revenue chart" />
          </div>
        )
      ) : (
        <>
          <HeadlineStats data={windowed.data} customerTotal={windowed.data.customers.total} />

          <Reveal>
            <DailySalesCard data={windowed.data} />
          </Reveal>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Reveal className="xl:col-span-2">
              <CategoryPerformanceCard
                data={windowed.data}
                items={items.data}
                categories={categories.data}
              />
            </Reveal>
            <Reveal delay={0.08}>
              <CategoryMixCard
                data={windowed.data}
                items={items.data}
                categories={categories.data}
              />
            </Reveal>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Reveal>
              <WeeklySalesCard data={windowed.data} />
            </Reveal>
            <Reveal delay={0.08}>
              <MonthlySalesCard query={year} />
            </Reveal>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Reveal>
              <TopItemsCard data={windowed.data} />
            </Reveal>
            <Reveal delay={0.08}>
              <CustomerMixCard
                newInWindow={windowed.data.customers.new}
                page={customers.data}
                loading={customers.loading}
                failureNode={
                  customers.failure ? (
                    <ApiErrorNotice failure={customers.failure} onRetry={customers.reload} />
                  ) : null
                }
              />
            </Reveal>
          </div>
        </>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  Headline stats                                                            */
/* ========================================================================== */

function HeadlineStats({
  data,
  customerTotal,
}: {
  data: AnalyticsDashboard;
  customerTotal: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Revenue"
        value={data.revenue.total}
        format="currency"
        change={data.revenue.changePercent}
        hint={`against the previous ${data.range.days} days`}
      />
      <StatCard
        label="Delivered orders"
        value={data.orders.delivered}
        change={data.orders.changePercent}
        hint={`${data.orders.total} placed in total`}
      />
      <StatCard
        label="Average order value"
        value={data.revenue.averageOrderValue}
        format="currency"
        hint="revenue ÷ delivered orders"
      />
      <StatCard
        label="Customers"
        value={customerTotal}
        hint={`${data.customers.new} joined in this window`}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Sales over time                                                           */
/* ========================================================================== */

function DailySalesCard({ data }: { data: AnalyticsDashboard }) {
  const daily = data.series.daily;
  const hasRevenue = daily.some((point) => point.revenue > 0);

  return (
    <ChartCard
      title="Daily sales"
      description="Revenue from delivered orders, day by day."
      value={formatPrice(data.revenue.total)}
      actions={<ChartLegend items={[{ label: "Order revenue", color: "#ff6b00" }]} />}
      footer={
        hasRevenue ? (
          <span>
            Discounts given:{" "}
            <span className="font-medium text-ink-900">
              {formatPrice(data.revenue.discountGiven)}
            </span>{" "}
            · GST collected:{" "}
            <span className="font-medium text-ink-900">
              {formatPrice(data.revenue.gstCollected)}
            </span>
          </span>
        ) : (
          <span>No revenue has been recorded in this window yet.</span>
        )
      }
    >
      <AreaChart
        label={`Daily revenue over the last ${data.range.days} days`}
        points={daily.map((point) => ({ label: point.date.slice(8, 10), value: point.revenue }))}
        formatValue={(value) => formatPriceCompact(Math.round(value))}
      />
    </ChartCard>
  );
}

/** Buckets the tail of a daily series into whole weeks, newest bucket last. */
function toWeeks(daily: DashboardSeriesPoint[]): { label: string; revenue: number; orders: number }[] {
  const weeks: { label: string; revenue: number; orders: number }[] = [];
  for (let end = daily.length; end > 0; end -= 7) {
    const slice = daily.slice(Math.max(0, end - 7), end);
    weeks.unshift({
      label: `${formatDay(slice[0].date)}`,
      revenue: slice.reduce((sum, point) => sum + point.revenue, 0),
      orders: slice.reduce((sum, point) => sum + point.orders, 0),
    });
  }
  return weeks;
}

function WeeklySalesCard({ data }: { data: AnalyticsDashboard }) {
  const weeks = toWeeks(data.series.daily);

  return (
    <ChartCard
      title="Weekly sales"
      description="The same window rolled into seven-day blocks, labelled by the week's first day."
      className="h-full"
    >
      <BarChart
        orientation="vertical"
        label="Revenue per week"
        data={weeks.map((week) => ({ label: week.label, value: week.revenue }))}
        formatValue={(value) => formatPriceCompact(value)}
        emphasiseMax
      />
    </ChartCard>
  );
}

function MonthlySalesCard({ query }: { query: AdminQuery<AnalyticsDashboard> }) {
  const months = React.useMemo(() => {
    const buckets = new Map<string, number>();
    for (const point of query.data?.series.daily ?? []) {
      const key = point.date.slice(0, 7);
      buckets.set(key, (buckets.get(key) ?? 0) + point.revenue);
    }
    return [...buckets.entries()].map(([key, revenue]) => ({
      label: `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`,
      revenue,
    }));
  }, [query.data]);

  return (
    <ChartCard
      title="Monthly sales"
      description="Revenue per calendar month across the trailing year."
      className="h-full"
    >
      {query.failure ? (
        <ApiErrorNotice failure={query.failure} onRetry={query.reload} />
      ) : query.loading && months.length === 0 ? (
        <LoadingBlock className="h-52" label="Loading monthly sales" />
      ) : (
        <BarChart
          orientation="vertical"
          label="Revenue per calendar month"
          data={months.map((month) => ({ label: month.label, value: month.revenue }))}
          formatValue={(value) => formatPriceCompact(value)}
          emphasiseMax
        />
      )}
    </ChartCard>
  );
}

/* ========================================================================== */
/*  Category distribution                                                     */
/* ========================================================================== */

interface CategoryRow {
  name: string;
  revenue: number;
  quantity: number;
}

/**
 * Revenue per menu category.
 *
 * The API reports revenue per *dish*, so the category split is produced here by
 * joining the top-dish rows to the catalogue. It therefore describes the top
 * dishes it was given, not every dish ever sold — the card says so rather than
 * implying a complete breakdown.
 */
function toCategoryRows(
  data: AnalyticsDashboard,
  items: AdminMenuItem[] | null,
  categories: AdminMenuCategory[] | null,
): CategoryRow[] {
  if (!items || !categories) return [];

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const nameBySlug = new Map(categories.map((category) => [category.slug, category.name]));
  const rows = new Map<string, CategoryRow>();

  for (const dish of data.topDishes) {
    const slug = itemsById.get(dish.menuItemId)?.category ?? "uncategorised";
    const name = nameBySlug.get(slug) ?? "Uncategorised";
    const row = rows.get(slug) ?? { name, revenue: 0, quantity: 0 };
    row.revenue += dish.revenue;
    row.quantity += dish.quantity;
    rows.set(slug, row);
  }

  return [...rows.values()].sort((a, b) => b.revenue - a.revenue);
}

function CategoryPerformanceCard({
  data,
  items,
  categories,
}: {
  data: AnalyticsDashboard;
  items: AdminMenuItem[] | null;
  categories: AdminMenuCategory[] | null;
}) {
  const rows = toCategoryRows(data, items, categories);

  return (
    <ChartCard
      title="Category performance"
      description={`Revenue per menu category, derived from the top ${TOP_DISH_COUNT} dishes of the window.`}
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={ChartNoAxesColumn}
          title="No sales to break down"
          description="Category revenue appears as soon as dishes start selling."
        />
      ) : (
        <BarChart
          label="Revenue by menu category"
          data={rows.map((row, index) => ({
            label: row.name,
            value: row.revenue,
            color: chartColor(index),
            meta: `${row.quantity} sold`,
          }))}
          formatValue={(value) => formatPriceCompact(value)}
        />
      )}
    </ChartCard>
  );
}

function CategoryMixCard({
  data,
  items,
  categories,
}: {
  data: AnalyticsDashboard;
  items: AdminMenuItem[] | null;
  categories: AdminMenuCategory[] | null;
}) {
  const rows = toCategoryRows(data, items, categories).slice(0, 6);
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <ChartCard
      title="Category distribution"
      description="Share of takings by category."
      className="h-full"
    >
      <div className="flex flex-col items-center gap-6">
        <DonutChart
          label="Share of revenue by menu category"
          segments={rows.map((row, index) => ({
            label: row.name,
            value: row.revenue,
            color: chartColor(index),
          }))}
          centerValue={total > 0 ? formatPriceCompact(total) : "₹0"}
          centerLabel="total revenue"
        />
        {rows.length > 0 && (
          <ChartLegend
            className="justify-center"
            items={rows.map((row, index) => ({ label: row.name, color: chartColor(index) }))}
          />
        )}
      </div>
    </ChartCard>
  );
}

/* ========================================================================== */
/*  Top items                                                                 */
/* ========================================================================== */

function TopItemsCard({ data }: { data: AnalyticsDashboard }) {
  const dishes = data.topDishes.slice(0, 8);

  return (
    <ChartCard
      title="Top items"
      description={`Best sellers by revenue across the last ${data.range.days} days.`}
      className="h-full"
    >
      {dishes.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nothing sold yet"
          description="The leaderboard fills in as orders are delivered."
        />
      ) : (
        <BarChart
          label="Revenue by dish"
          data={dishes.map((dish) => ({
            label: dish.name,
            value: dish.revenue,
            meta: `${dish.quantity} sold`,
          }))}
          formatValue={(value) => formatPriceCompact(value)}
        />
      )}
    </ChartCard>
  );
}

/* ========================================================================== */
/*  Repeat vs new customers                                                   */
/* ========================================================================== */

const CUSTOMER_SEGMENT_COLORS = ["#22c55e", "#ff6b00", "#9ca3af"];

function CustomerMixCard({
  newInWindow,
  page,
  loading,
  failureNode,
}: {
  newInWindow: number;
  page: AdminPage<AdminCustomerSummary> | null;
  loading: boolean;
  failureNode: React.ReactNode;
}) {
  const split = React.useMemo(() => {
    const rows = page?.items ?? [];
    return {
      repeat: rows.filter((customer) => customer.orderCount >= 2).length,
      once: rows.filter((customer) => customer.orderCount === 1).length,
      never: rows.filter((customer) => customer.orderCount === 0).length,
    };
  }, [page]);

  const counted = split.repeat + split.once + split.never;
  const total = page?.meta.total ?? 0;
  const partial = total > counted;

  const segments = [
    { label: "Repeat (2+ orders)", value: split.repeat, color: CUSTOMER_SEGMENT_COLORS[0] },
    { label: "One order", value: split.once, color: CUSTOMER_SEGMENT_COLORS[1] },
    { label: "Yet to order", value: split.never, color: CUSTOMER_SEGMENT_COLORS[2] },
  ];

  return (
    <ChartCard
      title="Repeat vs new customers"
      description="How many customers have come back for a second order."
      className="h-full"
      footer={
        <span>
          {newInWindow} customer{newInWindow === 1 ? "" : "s"} joined in the last {WINDOW_DAYS}{" "}
          days.
          {partial
            ? ` The split above covers the ${counted} most active of ${total} customers.`
            : ""}
        </span>
      }
    >
      {failureNode ?? (
        loading && counted === 0 ? (
          <LoadingBlock className="h-52" label="Loading customer mix" />
        ) : counted === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No customers yet"
            description="The repeat-versus-new split appears once the first customer record exists."
          />
        ) : (
          <div className="flex flex-col items-center gap-6">
            <DonutChart
              label="Customers split by how many orders they have placed"
              segments={segments.filter((segment) => segment.value > 0)}
              centerValue={String(counted)}
              centerLabel={counted === 1 ? "customer" : "customers"}
            />
            <ChartLegend
              className="justify-center"
              items={segments.map((segment) => ({
                label: segment.label,
                color: segment.color,
                value: String(segment.value),
              }))}
            />
          </div>
        )
      )}
    </ChartCard>
  );
}

/* ========================================================================== */
/*  Helpers                                                                   */
/* ========================================================================== */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "12 Jul" from a plain YYYY-MM-DD string — no timezone maths involved. */
function formatDay(iso: string): string {
  if (iso.length < 10) return "—";
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}
