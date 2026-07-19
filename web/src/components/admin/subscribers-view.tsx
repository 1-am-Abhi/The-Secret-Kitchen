"use client";

import * as React from "react";
import { CalendarOff, CalendarX2, Pause, Play, SkipForward } from "lucide-react";

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
  subscriptionStatusLabel,
  subscriptionStatusTone,
} from "@/components/admin/status-maps";
import { FilterChips, SearchField, Toolbar, ToolbarSpacer } from "@/components/admin/toolbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/form-controls";
import {
  TODAY,
  adminSubscriptions,
  shiftDate,
  type AdminSubscription,
  type AdminSubscriptionStatus,
} from "@/data/admin-mock";
import { formatPrice } from "@/lib/utils";

type StatusFilter = AdminSubscriptionStatus | "all";

const STATUS_FILTERS: StatusFilter[] = ["all", "active", "paused", "cancelled"];

const SLOT_LABEL: Record<AdminSubscription["slot"], string> = {
  lunch: "Lunch",
  dinner: "Dinner",
  both: "Lunch + Dinner",
};

export function SubscribersView() {
  const [subscriptions, setSubscriptions] =
    React.useState<AdminSubscription[]>(adminSubscriptions);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [cancelId, setCancelId] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    const map = new Map<StatusFilter, number>([["all", subscriptions.length]]);
    for (const subscription of subscriptions) {
      map.set(subscription.status, (map.get(subscription.status) ?? 0) + 1);
    }
    return map;
  }, [subscriptions]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return subscriptions
      .filter((subscription) => (status === "all" ? true : subscription.status === status))
      .filter((subscription) =>
        needle
          ? subscription.customerName.toLowerCase().includes(needle) ||
            subscription.id.toLowerCase().includes(needle) ||
            subscription.area.toLowerCase().includes(needle)
          : true,
      )
      .sort((a, b) => a.nextDeliveryDate.localeCompare(b.nextDeliveryDate));
  }, [subscriptions, status, query]);

  function setStatusOf(id: string, next: AdminSubscriptionStatus) {
    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === id
          ? {
              ...subscription,
              status: next,
              pausedUntil: next === "paused" ? shiftDate(TODAY, 7) : undefined,
            }
          : subscription,
      ),
    );
  }

  /** Skipping pushes the next delivery a day out and banks the meal. */
  function skipNext(id: string) {
    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === id
          ? {
              ...subscription,
              nextDeliveryDate: shiftDate(subscription.nextDeliveryDate, 1),
              skippedDates: [...subscription.skippedDates, subscription.nextDeliveryDate],
            }
          : subscription,
      ),
    );
  }

  const activeCount = counts.get("active") ?? 0;
  const monthlyRecurring = subscriptions
    .filter((subscription) => subscription.status === "active")
    .reduce((sum, subscription) => sum + subscription.monthlyValue, 0);
  const renewingSoon = subscriptions.filter(
    (subscription) =>
      subscription.status === "active" && subscription.renewsAt <= shiftDate(TODAY, 7),
  ).length;

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
            {subscription.id} · {subscription.addressLabel}
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
          {subscription.pausedUntil && (
            <span className="mt-1 block text-[11px] text-ink-400">
              until {formatDay(subscription.pausedUntil)}
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
            {subscription.mealsRemaining} / {subscription.mealsPerCycle}
          </span>
          <Progress
            value={(subscription.mealsRemaining / subscription.mealsPerCycle) * 100}
            aria-label={`${subscription.mealsRemaining} of ${subscription.mealsPerCycle} meals remaining`}
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
            {subscription.status === "active"
              ? relativeDay(subscription.nextDeliveryDate, TODAY)
              : "—"}
          </span>
          <span className="block text-[11px] text-ink-400">
            renews {formatDay(subscription.renewsAt)}
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
                aria-label={`Skip next delivery for ${subscription.customerName}`}
                title="Skip next delivery"
                onClick={() => skipNext(subscription.id)}
              >
                <SkipForward />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Pause subscription for ${subscription.customerName}`}
                title="Pause"
                onClick={() => setStatusOf(subscription.id, "paused")}
              >
                <Pause />
              </Button>
            </>
          )}
          {subscription.status === "paused" && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Resume subscription for ${subscription.customerName}`}
              title="Resume"
              onClick={() => setStatusOf(subscription.id, "active")}
            >
              <Play />
            </Button>
          )}
          {subscription.status !== "cancelled" && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Cancel subscription for ${subscription.customerName}`}
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
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active plans" value={activeCount} change={6.4} />
        <StatCard
          label="Monthly recurring revenue"
          value={monthlyRecurring}
          format="currency"
          change={8.9}
        />
        <StatCard
          label="Paused"
          value={counts.get("paused") ?? 0}
          change={-1.8}
          invertTrend
          hint="Resume reminders sent automatically"
        />
        <StatCard
          label="Renewing this week"
          value={renewingSoon}
          change={3.2}
          hint="Chase the ones with 0 meals left"
        />
      </div>

      <Toolbar>
        <SearchField
          label="Search subscribers by name, id or area"
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

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(subscription) => subscription.id}
        caption="Tiffin subscriptions ordered by next delivery"
        pageSize={10}
        empty={
          <EmptyState
            icon={CalendarOff}
            title="No subscriptions match"
            description="Try a different status filter or clear the search."
          />
        }
        renderCard={(subscription) => (
          <Card className="rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">
                  {subscription.customerName}
                </p>
                <p className="font-mono text-[11px] text-ink-400">{subscription.id}</p>
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
                {subscription.mealsRemaining} of {subscription.mealsPerCycle} meals left
              </p>
              <Progress
                value={(subscription.mealsRemaining / subscription.mealsPerCycle) * 100}
                className="h-1.5"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-ink-500">
                {subscription.status === "active"
                  ? `Next: ${relativeDay(subscription.nextDeliveryDate, TODAY)}`
                  : `Renews ${formatDay(subscription.renewsAt)}`}
              </span>
              <span className="text-sm font-semibold tabular-nums text-ink-900">
                {formatPrice(subscription.monthlyValue)}
              </span>
            </div>

            <div className="mt-3 flex gap-2">
              {subscription.status === "active" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => skipNext(subscription.id)}
                    className="flex-1"
                  >
                    <SkipForward />
                    Skip
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusOf(subscription.id, "paused")}
                    className="flex-1"
                  >
                    <Pause />
                    Pause
                  </Button>
                </>
              ) : subscription.status === "paused" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusOf(subscription.id, "active")}
                  className="flex-1"
                >
                  <Play />
                  Resume
                </Button>
              ) : null}
            </div>
          </Card>
        )}
      />

      <ConfirmDialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="Cancel this subscription?"
        description="Deliveries stop after today's dispatch and the remaining meals are refunded pro-rata. The customer keeps their order history."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep it running"
        icon={CalendarX2}
        onConfirm={() => cancelId && setStatusOf(cancelId, "cancelled")}
      />
    </div>
  );
}
