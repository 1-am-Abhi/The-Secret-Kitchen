"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bike,
  CircleCheck,
  CircleX,
  Clock,
  Flame,
  MapPin,
  MessageCircle,
  Package,
  PackageCheck,
  Phone,
  RefreshCw,
  SearchX,
  Utensils,
} from "lucide-react";

import { Reveal } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/form-controls";
import { telLink, whatsappLink } from "@/config/site";
import {
  buildTrackedWhatsappText,
  isTerminalStatus,
  ORDER_PIPELINE,
  ORDER_STATUS_DESCRIPTION,
  ORDER_STATUS_LABEL,
  OrderError,
  pipelineIndex,
  trackOrder,
  type OrderBill,
  type OrderStatus,
  type TrackedOrder,
} from "@/lib/orders";
import { cn, formatPrice } from "@/lib/utils";

/**
 * Live order tracking.
 *
 * Polls rather than streams: the storefront has no authenticated socket and a
 * customer watches this page for minutes, not hours, so a 20-second poll is
 * both fresh enough and cheap. Polling stops the moment the order reaches a
 * terminal status and whenever the tab is hidden — a backgrounded tab left open
 * overnight must not keep hitting the API.
 */
const POLL_INTERVAL_MS = 20_000;

const STATUS_ICON: Record<OrderStatus, React.ComponentType<{ className?: string }>> = {
  PENDING_CUSTOMER_CONFIRMATION: MessageCircle,
  CONFIRMED: CircleCheck,
  PREPARING: Utensils,
  COOKING: Flame,
  PACKED: Package,
  OUT_FOR_DELIVERY: Bike,
  DELIVERED: PackageCheck,
  CANCELLED: CircleX,
};

export function OrderTracker({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = React.useState<TrackedOrder | null>(null);
  const [phase, setPhase] = React.useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);

  // Only announce *changes*, so the first successful load does not fire a
  // status announcement the moment the page appears.
  const lastStatusRef = React.useRef<OrderStatus | null>(null);

  const load = React.useCallback(async () => {
    try {
      const next = await trackOrder(orderNumber);
      setOrder(next);
      setPhase("ready");
      setErrorMessage(null);
      setNotFound(false);
      if (lastStatusRef.current && lastStatusRef.current !== next.status) {
        setAnnouncement(`Order ${next.orderNumber} is now: ${ORDER_STATUS_LABEL[next.status]}.`);
      }
      lastStatusRef.current = next.status;
    } catch (error) {
      const isOrderError = error instanceof OrderError;
      const missing = isOrderError && error.code === "NOT_FOUND";
      setNotFound(missing);
      setErrorMessage(
        isOrderError ? error.message : "We could not reach the kitchen's system just now.",
      );
      // A transient poll failure must not blank out an order already on screen.
      setPhase((current) => (current === "ready" ? "ready" : "error"));
    }
  }, [orderNumber]);

  /* ---- First load ------------------------------------------------------ */
  React.useEffect(() => {
    setPhase("loading");
    lastStatusRef.current = null;
    void load();
  }, [load]);

  /* ---- Polling --------------------------------------------------------- */
  const currentStatus = order?.status ?? null;
  const settled = currentStatus !== null && isTerminalStatus(currentStatus);

  React.useEffect(() => {
    if (settled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    // Page Visibility API: pause in a background tab, and catch up immediately
    // when the customer returns rather than making them wait a full interval.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // `currentStatus` is a dependency so the effect tears down the interval the
    // moment the order becomes terminal.
  }, [load, settled, currentStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (phase === "loading") return <TrackerSkeleton />;

  if (phase === "error" || !order) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-ink-200/70 bg-white p-8 text-center shadow-soft">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
          <SearchX className="size-7" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-2xl text-ink-900">
          {notFound ? "We couldn't find that order" : "We couldn't load that order"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-600">
          {errorMessage}
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
          Order IDs look like <span className="font-mono">TSK-2026-00041</span> and are in the
          message we sent you. If yours looks right, message us and we will find it.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={handleRefresh} variant="outline" size="lg" disabled={refreshing}>
            <RefreshCw className={cn(refreshing && "animate-spin")} />
            Try again
          </Button>
          <Button asChild variant="accent" size="lg">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              <MessageCircle />
              WhatsApp the kitchen
            </a>
          </Button>
        </div>
        <Button asChild variant="ghost" className="mt-4">
          <Link href="/track">Look up a different order</Link>
        </Button>
      </div>
    );
  }

  const cancelled = order.status === "CANCELLED";
  const currentIndex = pipelineIndex(order.status);
  const inProgress = !isTerminalStatus(order.status) && order.status !== "PENDING_CUSTOMER_CONFIRMATION";
  const address = order.delivery
    ? [order.delivery.line1, order.delivery.landmark, order.delivery.city, order.delivery.pincode]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      {/* Screen-reader announcement for background status changes. */}
      <p aria-live="polite" role="status" className="sr-only">
        {announcement}
      </p>

      {/* ---- Timeline ---- */}
      <div className="lg:col-span-7 xl:col-span-8">
        <Reveal>
          <div
            className={cn(
              "rounded-3xl border p-6 shadow-lift sm:p-8",
              cancelled ? "border-red-200 bg-red-50/60" : "border-ink-200/70 bg-white",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="block text-xs uppercase tracking-[0.14em] text-ink-400">
                  Order
                </span>
                <h1 className="mt-1 break-all font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
                  {order.orderNumber}
                </h1>
                {order.placedAt && (
                  <p className="mt-1.5 text-sm text-ink-500">
                    Placed {formatDateTime(order.placedAt)}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <Badge
                  variant={cancelled ? "danger" : order.status === "DELIVERED" ? "success" : "default"}
                  size="lg"
                >
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
                {inProgress && order.estimatedMinutes ? (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-ink-600">
                    <Clock className="size-4" aria-hidden />
                    about {order.estimatedMinutes} min away
                  </span>
                ) : null}
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              {ORDER_STATUS_DESCRIPTION[order.status]}
            </p>

            {/* Pending orders are the one case where the customer still has
                something to do — make that impossible to miss. */}
            {order.status === "PENDING_CUSTOMER_CONFIRMATION" && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="font-semibold text-amber-900">Still pending confirmation</p>
                <p className="mt-1.5 text-sm leading-relaxed text-amber-800">
                  We have your order saved, but the kitchen has not received your WhatsApp message
                  yet. Send it and we will start cooking.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button asChild variant="accent">
                    <a
                      href={whatsappLink(buildTrackedWhatsappText(order))}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle />
                      Send on WhatsApp
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={telLink()}>
                      <Phone />
                      Call instead
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {cancelled ? (
              <CancelledTimeline order={order} />
            ) : (
              <ol className="mt-8 flex flex-col">
                {ORDER_PIPELINE.map((step, index) => {
                  const entry = order.timeline.find((item) => item.status === step);
                  const state =
                    index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
                  const Icon = STATUS_ICON[step];
                  const isLast = index === ORDER_PIPELINE.length - 1;

                  return (
                    <li key={step} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
                            state === "done" && "bg-fresh-500 text-white",
                            state === "current" &&
                              "bg-brand-500 text-white shadow-[var(--shadow-glow)]",
                            state === "todo" && "bg-ink-100 text-ink-300",
                          )}
                        >
                          <Icon className="size-5" />
                        </span>
                        {!isLast && (
                          <span
                            aria-hidden
                            className={cn(
                              "my-1 w-0.5 flex-1 rounded-full transition-colors",
                              index < currentIndex ? "bg-fresh-400" : "bg-ink-200",
                            )}
                          />
                        )}
                      </div>

                      <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-7")}>
                        <p
                          className={cn(
                            "font-semibold",
                            state === "todo" ? "text-ink-400" : "text-ink-900",
                          )}
                        >
                          {ORDER_STATUS_LABEL[step]}
                          {state === "current" && (
                            <span className="ml-2 align-middle text-[11px] font-bold uppercase tracking-wide text-brand-600">
                              Now
                            </span>
                          )}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-sm leading-relaxed",
                            state === "todo" ? "text-ink-300" : "text-ink-500",
                          )}
                        >
                          {ORDER_STATUS_DESCRIPTION[step]}
                        </p>
                        {entry?.at && (
                          <p className="mt-1 text-xs text-ink-400">{formatDateTime(entry.at)}</p>
                        )}
                        {entry?.note && (
                          <p className="mt-1 text-xs italic text-ink-500">{entry.note}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Reveal>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={cn(refreshing && "animate-spin")} />
            Refresh now
          </Button>
          <p className="text-xs text-ink-400">
            {settled
              ? "This order is complete — live updates have stopped."
              : "Updating automatically every 20 seconds."}
          </p>
        </div>

        {errorMessage && (
          <p role="alert" className="mt-3 text-xs text-amber-700">
            Last refresh failed: {errorMessage} Showing the most recent status we have.
          </p>
        )}
      </div>

      {/* ---- Order detail ---- */}
      <aside className="lg:col-span-5 xl:col-span-4" aria-label="Order details">
        <div className="sticky top-28 flex flex-col gap-4">
          <div className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-soft">
            <h2 className="font-display text-xl text-ink-900">Your order</h2>

            {order.items?.length ? (
              <ul className="mt-5 flex flex-col gap-3 text-sm">
                {order.items.map((item, index) => (
                  <li
                    key={`${item.itemId}-${index}`}
                    className="flex items-start justify-between gap-4"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-ink-800">
                        {item.quantity} × {item.name}
                      </span>
                      {item.addOnLabels?.length ? (
                        <span className="block text-xs text-ink-400">
                          {item.addOnLabels.join(" · ")}
                        </span>
                      ) : null}
                      {item.note ? (
                        <span className="block text-xs italic text-ink-400">{item.note}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-semibold text-ink-900">
                      {formatPrice(item.total)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-400">
                Item details are not available for this order.
              </p>
            )}

            {order.bill && <TrackedBill bill={order.bill} />}

            {address && (
              <p className="mt-6 flex items-start gap-2.5 rounded-2xl bg-ink-50 px-4 py-3.5 text-sm leading-relaxed text-ink-600">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                <span>
                  <span className="block text-xs uppercase tracking-wide text-ink-400">
                    Delivering to
                  </span>
                  {address}
                </span>
              </p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Button asChild variant="accent">
              <a
                href={whatsappLink(`Hi! A question about my order ${order.orderNumber}.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle />
                Ask about this order
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={telLink()}>
                <Phone />
                Call the kitchen
              </a>
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/**
 * Cancelled orders get their own terminal rendering rather than a greyed-out
 * pipeline: showing "Out for delivery" as a future step on a cancelled order
 * would be actively misleading.
 */
function CancelledTimeline({ order }: { order: TrackedOrder }) {
  const history = order.timeline.filter((entry) => entry.status !== "CANCELLED");
  const cancelledAt = order.timeline.find((entry) => entry.status === "CANCELLED");

  return (
    <div className="mt-8">
      <div className="flex gap-4 rounded-2xl border border-red-200 bg-white p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <CircleX className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink-900">This order was cancelled</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            {cancelledAt?.note ?? ORDER_STATUS_DESCRIPTION.CANCELLED}
          </p>
          {cancelledAt?.at && (
            <p className="mt-1 text-xs text-ink-400">{formatDateTime(cancelledAt.at)}</p>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
            Before it was cancelled
          </p>
          <ol className="mt-3 flex flex-col gap-3">
            {history.map((entry) => (
              <li key={`${entry.status}-${entry.at}`} className="flex items-baseline gap-3 text-sm">
                <Clock className="size-3.5 shrink-0 text-ink-300" aria-hidden />
                <span className="text-ink-500">{ORDER_STATUS_LABEL[entry.status]}</span>
                <span className="ml-auto shrink-0 text-xs text-ink-400">
                  {formatDateTime(entry.at)}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function TrackedBill({ bill }: { bill: OrderBill }) {
  const rows: { label: string; value: number; discount?: boolean }[] = [
    { label: "Item total", value: bill.subtotal },
    ...(bill.discount ? [{ label: "Discount", value: -bill.discount, discount: true }] : []),
    ...(bill.packagingFee !== undefined ? [{ label: "Packaging", value: bill.packagingFee }] : []),
    ...(bill.deliveryFee !== undefined ? [{ label: "Delivery", value: bill.deliveryFee }] : []),
    ...(bill.gst !== undefined ? [{ label: "GST", value: bill.gst }] : []),
  ];

  return (
    <dl className="mt-5 flex flex-col gap-2.5 border-t border-ink-100 pt-5 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between text-ink-500">
          <dt>{row.label}</dt>
          <dd className={row.discount ? "font-medium text-fresh-600" : "text-ink-700"}>
            {row.value < 0 ? `−${formatPrice(Math.abs(row.value))}` : formatPrice(row.value)}
          </dd>
        </div>
      ))}
      <div className="mt-2 flex items-baseline justify-between border-t border-ink-100 pt-4">
        <dt className="font-semibold text-ink-900">Total</dt>
        <dd className="font-display text-2xl font-semibold text-ink-900">
          {formatPrice(bill.total)}
        </dd>
      </div>
    </dl>
  );
}

/**
 * "19 Jul, 5:34 PM". Rendered only in a client component after a client-side
 * fetch, so there is no server/client timezone mismatch to hydrate around.
 */
function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function TrackerSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7 xl:col-span-8">
        <Skeleton className="h-[32rem] w-full rounded-3xl" />
      </div>
      <div className="lg:col-span-5 xl:col-span-4">
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
      <span className="sr-only" aria-live="polite">
        Loading your order status
      </span>
    </div>
  );
}
