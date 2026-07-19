"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BellRing, Clock, Radio } from "lucide-react";

import { ChartCard } from "@/components/admin/chart-card";
import {
  ConnectionIndicator,
  useOrderNotifications,
} from "@/components/admin/order-notifications";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { formatOrderClock } from "@/lib/admin-orders";
import { formatPrice } from "@/lib/utils";

/* ========================================================================== */
/*  Awaiting-confirmation KPI                                                 */
/* ========================================================================== */

/**
 * Live count of orders sitting in `PENDING_CUSTOMER_CONFIRMATION`.
 *
 * `fallback` is the count derived from the bundled sample data; it is used
 * until (or unless) the API answers, and the tile says which it is showing so
 * the number is never mistaken for a real backlog.
 */
export function AwaitingConfirmationTile({ fallback }: { fallback: number }) {
  const { awaitingCount } = useOrderNotifications();
  const live = awaitingCount !== null;
  const value = live ? awaitingCount : fallback;

  return (
    <StatCard
      label="Awaiting confirmation"
      value={value}
      icon="TriangleAlert"
      hint={live ? "needs a call or a WhatsApp nudge" : "sample data — API not connected"}
      visual={
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/admin/orders">
            Chase them
            <ArrowUpRight />
          </Link>
        </Button>
      }
    />
  );
}

/* ========================================================================== */
/*  Live "new orders" feed                                                    */
/* ========================================================================== */

/** Newest orders as they arrive on the stream — same source as the toasts. */
export function NewOrdersFeed() {
  const { notifications, focusOrder, connection } = useOrderNotifications();
  const router = useRouter();

  const created = notifications.filter((entry) => entry.kind === "created").slice(0, 6);

  return (
    <ChartCard
      title="New orders, live"
      description="Pushed from the order stream the moment the database commits a row."
      actions={<ConnectionIndicator />}
      bodyClassName="p-0 sm:p-0"
    >
      {created.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
            <Radio className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-medium text-ink-700">
            {connection === "offline"
              ? "Not connected to the orders API"
              : "Waiting for the next order"}
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-ink-500">
            {connection === "offline"
              ? "New orders will appear here as soon as the API is reachable and this browser holds an admin session."
              : "Anything placed from now on appears here instantly, with a chime and a popup."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {created.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => {
                  focusOrder(entry.orderNumber);
                  router.push("/admin/orders");
                }}
                className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-brand-50/40 sm:px-6"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <BellRing className="size-4" aria-hidden />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-medium text-ink-900">
                      {entry.customerName ?? "Customer"}
                    </span>
                    <span className="font-mono text-[11px] text-ink-400">{entry.orderNumber}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-500">
                    {entry.itemCount ?? 0} item{entry.itemCount === 1 ? "" : "s"} · awaiting
                    customer confirmation
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-ink-900">
                    {formatPrice(entry.total ?? 0)}
                  </span>
                  <span className="flex items-center justify-end gap-1 text-[11px] tabular-nums text-ink-400">
                    <Clock className="size-3" aria-hidden />
                    {formatOrderClock(entry.at)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
