"use client";

import * as React from "react";
import { CalendarOff, CalendarX2, Pause, Play, RefreshCw, SkipForward } from "lucide-react";

import { ApiErrorNotice, LoadingRows, useAdminQuery } from "@/components/admin/admin-data";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusPill } from "@/components/admin/status-pill";
import {
  formatDay,
  planTierLabel,
  planTierTone,
  relativeDay,
  shiftDay,
  subscriptionStatusLabel,
  subscriptionStatusTone,
  todayIso,
} from "@/components/admin/status-maps";
import { FilterChips, SearchField, Toolbar, ToolbarSpacer } from "@/components/admin/toolbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/form-controls";
import {
  SUBSCRIPTION_STATUSES,
  cancelAdminSubscription,
  listAdminSubscriptions,
  pauseAdminSubscription,
  resumeAdminSubscription,
  skipAdminSubscriptionDate,
  type AdminSubscription,
  type AdminSubscriptionStatus,
} from "@/lib/admin-orders";
import { formatPrice } from "@/lib/utils";

type StatusFilter = AdminSubscriptionStatus | "all";

const STATUS_FILTERS: StatusFilter[] = ["all", ...SUBSCRIPTION_STATUSES];

const SLOT_LABEL: Record<AdminSubscription["slot"], string> = {
  lunch: "Lunch",
  dinner: "Dinner",
  both: "Lunch + Dinner",
};

/** One page of subscriptions. The API caps a page at 100 rows. */
const PAGE_LIMIT = 100;
/** How far ahead "delivering this week" looks. */
const WEEK_AHEAD = 7;

export function SubscribersView() {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [cancelId, setCancelId] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  /** Resolved after mount so "today" is the operator's day, not the server's. */
  const [today, setToday] = React.useState("");

  React.useEffect(() => setToday(todayIso()), []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = React.useCallback(
    (signal: AbortSignal) =>
      listAdminSubscriptions({ search: debounced, limit: PAGE_LIMIT, signal }),
    [debounced],
  );

  const query$ = useAdminQuery(load);
  const [overrides, setOverrides] = React.useState<Record<string, AdminSubscription>>({});

  // Lifecycle actions return the updated row; overlaying them keeps the table
  // correct without re-fetching the whole page after every click.
  const subscriptions = React.useMemo(
    () => (query$.data?.items ?? []).map((row) => overrides[row.id] ?? row),
    [query$.data, overrides],
  );

  React.useEffect(() => setOverrides({}), [query$.data]);

  const counts = React.useMemo(() => {
    const map = new Map<StatusFilter, number>([["all", subscriptions.length]]);
    for (const subscription of subscriptions) {
      map.set(subscription.status, (map.get(subscription.status) ?? 0) + 1);
    }
    return map;
  }, [subscriptions]);

  const filtered = React.useMemo(
    () =>
      subscriptions
        .filter((subscription) => (status === "all" ? true : subscription.status === status))
        .sort((a, b) => a.nextDeliveryDate.localeCompare(b.nextDeliveryDate)),
    [subscriptions, status],
  );

  async function run(
    id: string,
    action: () => Promise<{ ok: true; data: AdminSubscription } | { ok: false; message: string }>,
    describe: string,
  ) {
    setActionError(null);
    setPendingId(id);
    const result = await action();
    setPendingId(null);

    if (result.ok) {
      setOverrides((current) => ({ ...current, [id]: result.data }));
      return;
    }
    setActionError(`Could not ${describe} — ${result.message}`);
  }

  const activeCount = counts.get("active") ?? 0;
  const recurringValue = subscriptions
    .filter((subscription) => subscription.status === "active")
    .reduce((sum, subscription) => sum + subscription.amount, 0);
  const deliveringSoon = today
    ? subscriptions.filter(
        (subscription) =>
          subscription.status === "active" &&
          subscription.nextDeliveryDate >= today &&
          subscription.nextDeliveryDate <= shiftDay(today, WEEK_AHEAD),
      ).length
    : 0;

  const columns: DataTableColumn<AdminSubscription>[] = [
    {
      id: "customer",
      header: "Subscriber",
      sortValue: (subscription) => subscription.customerName,
      cell: (subscription) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-ink-900">
            {subscription.customerName}
          </span>
          <span className="block truncate font-mono text-[11px] text-ink-400">
            {subscription.code}
            {subscription.addressLabel ? ` · ${subscription.addressLabel}` : ""}
          </span>
        </span>
      ),
    },
    {
      id: "plan",
      header: "Plan",
      sortValue: (subscription) => subscription.planTier,
      cell: (subscription) => (
        <span className="block">
          <StatusPill
            size="sm"
            tone={planTierTone[subscription.planTier]}
            label={planTierLabel[subscription.planTier]}
          />
          <span className="mt-1 block text-xs capitalize text-ink-400">
            {subscription.cycle} · {SLOT_LABEL[subscription.slot]}
          </span>
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (subscription) => subscription.status,
      cell: (subscription) => (
        <span className="block">
          <StatusPill
            tone={subscriptionStatusTone[subscription.status]}
            label={subscriptionStatusLabel[subscription.status]}
          />
          {subscription.endDate && (
            <span className="mt-1 block text-[11px] text-ink-400">
              ends {formatDay(subscription.endDate)}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "meals",
      header: "Meals left",
      align: "right",
      sortValue: (subscription) => subscription.mealsRemaining,
      cell: (subscription) => (
        <span className="ml-auto block w-28">
          <span className="mb-1 block text-xs tabular-nums text-ink-600">
            {subscription.mealsRemaining} / {subscription.mealsTotal}
          </span>
          <Progress
            value={mealProgress(subscription)}
            aria-label={`${subscription.mealsRemaining} of ${subscription.mealsTotal} meals remaining`}
            className="h-1.5"
          />
        </span>
      ),
    },
    {
      id: "next",
      header: "Next delivery",
      align: "right",
      sortValue: (subscription) => subscription.nextDeliveryDate,
      cell: (subscription) => (
        <span className="block text-right">
          <span className="block text-sm text-ink-700">
            {subscription.status === "active" && subscription.nextDeliveryDate
              ? today
                ? relativeDay(subscription.nextDeliveryDate, today)
                : formatDay(subscription.nextDeliveryDate)
              : "—"}
          </span>
          <span className="block text-[11px] text-ink-400">
            started {formatDay(subscription.startDate)}
          </span>
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "sr-only",
      cell: (subscription) => (
        <span className="flex justify-end gap-1">
          {subscription.status === "active" && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pendingId === subscription.id || !subscription.nextDeliveryDate}
                aria-label={`Skip the next delivery for ${subscription.customerName}`}
                title="Skip next delivery"
                onClick={() =>
                  void run(
                    subscription.id,
                    () =>
                      skipAdminSubscriptionDate(subscription.id, subscription.nextDeliveryDate),
                    `skip ${subscription.code}`,
                  )
                }
              >
                <SkipForward />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pendingId === subscription.id}
                aria-label={`Pause the subscription for ${subscription.customerName}`}
                title="Pause"
                onClick={() =>
                  void run(
                    subscription.id,
                    () => pauseAdminSubscription(subscription.id),
                    `pause ${subscription.code}`,
                  )
                }
              >
                <Pause />
              </Button>
            </>
          )}
          {subscription.status === "paused" && (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pendingId === subscription.id}
              aria-label={`Resume the subscription for ${subscription.customerName}`}
              title="Resume"
              onClick={() =>
                void run(
                  subscription.id,
                  () => resumeAdminSubscription(subscription.id),
                  `resume ${subscription.code}`,
                )
              }
            >
              <Play />
            </Button>
          )}
          {subscription.status !== "cancelled" && (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pendingId === subscription.id}
              aria-label={`Cancel the subscription for ${subscription.customerName}`}
              title="Cancel"
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => setCancelId(subscription.id)}
            >
              <CalendarX2 />
            </Button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Tiffin service"
        title="Subscribers"
        description="Every running tiffin plan, when it next dispatches, and how many meals are still banked."
        actions={
          <Button variant="outline" size="md" onClick={query$.reload} disabled={query$.loading}>
            <RefreshCw />
            Refresh
          </Button>
        }
      />

      {query$.failure && <ApiErrorNotice failure={query$.failure} onRetry={query$.reload} />}

      <div role="status" aria-live="polite">
        {actionError && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active plans" value={activeCount} />
        <StatCard
          label="Recurring revenue"
          value={recurringValue}
          format="currency"
          hint="billed value of active plans"
        />
        <StatCard
          label="Paused"
          value={counts.get("paused") ?? 0}
          hint="resume reminders sent automatically"
        />
        <StatCard
          label="Delivering this week"
          value={deliveringSoon}
          hint="next dispatch within seven days"
        />
      </div>

      <Toolbar>
        <SearchField
          label="Search subscribers by name, phone or subscription code"
          placeholder="Search subscribers…"
          value={query}
          onValueChange={setQuery}
        />
        <ToolbarSpacer />
        <FilterChips
          label="Filter subscriptions by status"
          value={status}
          onValueChange={setStatus}
          options={STATUS_FILTERS.map((value) => ({
            value,
            label: value === "all" ? "All" : subscriptionStatusLabel[value],
            count: counts.get(value) ?? 0,
          }))}
        />
      </Toolbar>

      {query$.loading && !query$.data ? (
        <LoadingRows label="Loading subscriptions" />
      ) : query$.failure ? null : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(subscription) => subscription.id}
          caption="Tiffin subscriptions ordered by next delivery"
          pageSize={10}
          empty={
            <EmptyState
              icon={CalendarOff}
              title={subscriptions.length === 0 ? "No subscriptions yet" : "No subscriptions match"}
              description={
                subscriptions.length === 0
                  ? "Tiffin plans appear here the moment the first one is taken out."
                  : "Try a different status filter or clear the search."
              }
            />
          }
          renderCard={(subscription) => (
            <Card className="rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">
                    {subscription.customerName}
                  </p>
                  <p className="font-mono text-[11px] text-ink-400">{subscription.code}</p>
                </div>
                <StatusPill
                  tone={subscriptionStatusTone[subscription.status]}
                  label={subscriptionStatusLabel[subscription.status]}
                />
              </div>

              <p className="mt-2 text-xs capitalize text-ink-500">
                {planTierLabel[subscription.planTier]} · {subscription.cycle} ·{" "}
                {SLOT_LABEL[subscription.slot]}
              </p>

              <div className="mt-3">
                <p className="mb-1 text-xs tabular-nums text-ink-600">
                  {subscription.mealsRemaining} of {subscription.mealsTotal} meals left
                </p>
                <Progress value={mealProgress(subscription)} className="h-1.5" />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-ink-500">
                  {subscription.status === "active" && subscription.nextDeliveryDate
                    ? `Next: ${
                        today
                          ? relativeDay(subscription.nextDeliveryDate, today)
                          : formatDay(subscription.nextDeliveryDate)
                      }`
                    : `Started ${formatDay(subscription.startDate)}`}
                </span>
                <span className="text-sm font-semibold tabular-nums text-ink-900">
                  {formatPrice(subscription.amount)}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                {subscription.status === "active" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={pendingId === subscription.id || !subscription.nextDeliveryDate}
                      onClick={() =>
                        void run(
                          subscription.id,
                          () =>
                            skipAdminSubscriptionDate(
                              subscription.id,
                              subscription.nextDeliveryDate,
                            ),
                          `skip ${subscription.code}`,
                        )
                      }
                    >
                      <SkipForward />
                      Skip
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={pendingId === subscription.id}
                      onClick={() =>
                        void run(
                          subscription.id,
                          () => pauseAdminSubscription(subscription.id),
                          `pause ${subscription.code}`,
                        )
                      }
                    >
                      <Pause />
                      Pause
                    </Button>
                  </>
                ) : subscription.status === "paused" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={pendingId === subscription.id}
                    onClick={() =>
                      void run(
                        subscription.id,
                        () => resumeAdminSubscription(subscription.id),
                        `resume ${subscription.code}`,
                      )
                    }
                  >
                    <Play />
                    Resume
                  </Button>
                ) : null}
              </div>
            </Card>
          )}
        />
      )}

      <ConfirmDialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="Cancel this subscription?"
        description="Deliveries stop after today's dispatch and the remaining meals are refunded pro-rata. The customer keeps their order history."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep it running"
        icon={CalendarX2}
        onConfirm={() => {
          if (!cancelId) return;
          void run(
            cancelId,
            () => cancelAdminSubscription(cancelId, "Cancelled from the admin panel."),
            "cancel that subscription",
          );
        }}
      />
    </div>
  );
}

/** Share of the cycle's meals still banked. Guards against a zero-meal plan. */
function mealProgress(subscription: AdminSubscription): number {
  if (subscription.mealsTotal <= 0) return 0;
  return (subscription.mealsRemaining / subscription.mealsTotal) * 100;
}
