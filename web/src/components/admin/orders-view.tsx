"use client";

import * as React from "react";
import {
  ArrowRight,
  CircleSlash,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  NotebookPen,
  Phone,
  ReceiptText,
  RefreshCw,
  TriangleAlert,
  Truck,
} from "lucide-react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { useOrderNotifications } from "@/components/admin/order-notifications";
import { PageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pill";
import { FilterChips, SearchField, Toolbar, ToolbarSpacer } from "@/components/admin/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TODAY,
  adminOrders as mockAdminOrders,
  shiftDate,
  type AdminOrder as MockAdminOrder,
  type OrderStatus as MockOrderStatus,
} from "@/data/admin-mock";
import {
  ALLOWED_TRANSITIONS,
  ORDER_PIPELINE,
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_SHORT_LABEL,
  ORDER_STATUS_TONE,
  confirmationChaseMessage,
  formatDeliveryAddress,
  formatOrderDateTime,
  getAdminOrder,
  listAdminOrders,
  orderItemCount,
  orderLocalDay,
  telUrl,
  updateAdminOrder,
  whatsappUrl,
  type AdminOrder,
  type OrderStatus,
} from "@/lib/admin-orders";
import { cn, formatPrice } from "@/lib/utils";

type StatusFilter = OrderStatus | "all";

/** "All" first, then the lifecycle in the order the kitchen works through it. */
const STATUS_FILTERS: StatusFilter[] = ["all", ...ORDER_STATUSES];

/** How many rows one request pulls. The table paginates within this window. */
const PAGE_LIMIT = 100;

type DataSource = "api" | "sample";

/* ========================================================================== */
/*  Sample-data adapter                                                       */
/* ========================================================================== */

const MOCK_STATUS_MAP: Record<MockOrderStatus, OrderStatus> = {
  pending: "PENDING_CUSTOMER_CONFIRMATION",
  confirmed: "CONFIRMED",
  preparing: "PREPARING",
  "out-for-delivery": "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
};

/** Plausible timeline for a sample row — the real one comes from the API. */
function sampleTimeline(status: OrderStatus, placedAt: string): AdminOrder["timeline"] {
  const start = new Date(placedAt).getTime();
  const stamp = (step: number) => new Date(start + step * 8 * 60_000).toISOString();

  if (status === "CANCELLED") {
    return [
      { status: "PENDING_CUSTOMER_CONFIRMATION", at: stamp(0) },
      { status: "CANCELLED", at: stamp(1), note: "Cancelled before the kitchen started." },
    ];
  }
  const upTo = ORDER_PIPELINE.indexOf(status);
  return ORDER_PIPELINE.slice(0, upTo + 1).map((entry, index) => ({
    status: entry,
    at: stamp(index),
  }));
}

/**
 * Mock row → contract shape.
 *
 * The bundled mock predates the eight-status contract, so its six states are
 * widened here rather than in `@/data/admin-mock`, which other screens still
 * read as-is.
 */
function toAdminOrder(mock: MockAdminOrder): AdminOrder {
  const status = MOCK_STATUS_MAP[mock.status];
  const placedAt = new Date(mock.placedAt).toISOString();

  return {
    id: mock.id,
    orderNumber: mock.id,
    status,
    channel: mock.channel.toUpperCase(),
    paymentMethod: mock.paymentMethod.toUpperCase(),
    paymentStatus: mock.paymentStatus.toUpperCase(),
    customerName: mock.customerName,
    customerPhone: mock.phone,
    placedAt,
    items: mock.items.map((line) => ({
      id: line.itemId,
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      addOnTotal: 0,
      addOns: [],
      components: [],
      isCustomTiffin: false,
    })),
    bill: {
      subtotal: mock.subtotal,
      discount: mock.discount,
      deliveryFee: mock.deliveryFee,
      packagingFee: mock.packagingFee,
      gst: mock.gst,
      total: mock.total,
      currency: "INR",
    },
    delivery: {
      name: mock.customerName,
      phone: mock.phone,
      line1: mock.addressLine,
      city: mock.area,
      pincode: "",
    },
    timeline: sampleTimeline(status, placedAt),
    kitchenNote: mock.note,
    couponCode: mock.couponCode,
    isSample: true,
  };
}

const SAMPLE_ORDERS: AdminOrder[] = mockAdminOrders.map(toAdminOrder);

/* ========================================================================== */
/*  View                                                                      */
/* ========================================================================== */

export function OrdersView() {
  const { revision, focusedOrderNumber, clearFocusedOrder } = useOrderNotifications();

  const [orders, setOrders] = React.useState<AdminOrder[]>([]);
  const [source, setSource] = React.useState<DataSource | null>(null);
  const [offlineReason, setOfflineReason] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  /** Announced politely — a failed status change must never be silent. */
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [from, setFrom] = React.useState(shiftDate(TODAY, -6));
  const [to, setTo] = React.useState(TODAY);

  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [cancelId, setCancelId] = React.useState<string | null>(null);

  /* ---- Loading ----------------------------------------------------------- */

  /**
   * Fetch the window, falling back to the bundled sample set.
   *
   * The date range and the free-text search go to the server; the status filter
   * is applied on the client so the chip counts describe the same window the
   * table is showing rather than shifting under the operator on every click.
   */
  const load = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const result = await listAdminOrders({ search: query, from, to, limit: PAGE_LIMIT, signal });
      if (signal?.aborted) return;

      if (result.ok) {
        setOrders(result.orders);
        setSource("api");
        setOfflineReason(null);
      } else if (result.reason !== "invalid") {
        setOrders(SAMPLE_ORDERS);
        setSource("sample");
        setOfflineReason(result.message);
      }
      setLoading(false);
    },
    [from, query, to],
  );

  // Debounced so typing in the search box does not fire a request per keystroke.
  React.useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [load]);

  // Any inbound SSE/polling event invalidates the window.
  React.useEffect(() => {
    if (revision === 0) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [revision, load]);

  /* ---- Derived ----------------------------------------------------------- */

  const counts = React.useMemo(() => {
    const map = new Map<StatusFilter, number>([["all", orders.length]]);
    for (const order of orders) {
      map.set(order.status, (map.get(order.status) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  const awaiting = React.useMemo(
    () => orders.filter((order) => order.status === "PENDING_CUSTOMER_CONFIRMATION"),
    [orders],
  );

  const filtered = React.useMemo(() => {
    // Sample rows never went through the server, so the date/search filters have
    // to be re-applied here for the offline view to behave the same way.
    const needle = query.trim().toLowerCase();
    const isSample = source === "sample";

    return orders
      .filter((order) => (status === "all" ? true : order.status === status))
      .filter((order) => {
        if (!isSample) return true;
        const day = orderLocalDay(order.placedAt);
        return day >= from && day <= to;
      })
      .filter((order) => {
        if (!isSample || !needle) return true;
        return (
          order.orderNumber.toLowerCase().includes(needle) ||
          order.customerName.toLowerCase().includes(needle) ||
          order.customerPhone.replace(/\s/g, "").includes(needle.replace(/\s/g, "")) ||
          order.delivery.city.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }, [orders, status, from, to, query, source]);

  const detail = detailId ? (orders.find((order) => order.id === detailId) ?? null) : null;

  /* ---- Opening a ticket from a notification ------------------------------ */

  React.useEffect(() => {
    if (!focusedOrderNumber) return;
    const match = orders.find((order) => order.orderNumber === focusedOrderNumber);
    if (!match) return;
    // Clear the status filter so the ticket is definitely on screen behind the
    // dialog when it is closed.
    setStatus("all");
    setDetailId(match.id);
    clearFocusedOrder();
  }, [focusedOrderNumber, orders, clearFocusedOrder]);

  /* ---- Mutations --------------------------------------------------------- */

  function replaceOrder(id: string, patch: (order: AdminOrder) => AdminOrder) {
    setOrders((current) => current.map((order) => (order.id === id ? patch(order) : order)));
  }

  /**
   * Optimistic status change.
   *
   * The row moves immediately — the kitchen is usually holding a hot pan — and
   * is put back exactly as it was if the API rejects the transition, with the
   * reason surfaced in a live region rather than a console log.
   */
  async function changeStatus(order: AdminOrder, next: OrderStatus, cancelReason?: string) {
    const previous = order.status;
    setActionError(null);
    setPendingId(order.id);
    replaceOrder(order.id, (current) => ({ ...current, status: next }));

    if (source === "sample") {
      // Nothing to persist to; the banner already says this is sample data.
      setPendingId(null);
      return;
    }

    const result = await updateAdminOrder(order.id, { status: next, cancelReason });
    setPendingId(null);

    if (result.ok) {
      replaceOrder(order.id, () => result.order);
      return;
    }

    replaceOrder(order.id, (current) => ({ ...current, status: previous }));
    setActionError(
      `Could not move ${order.orderNumber} to ${ORDER_STATUS_LABEL[next]} — ${result.message}`,
    );
  }

  /** Pull the authoritative detail (timeline, add-ons) when a ticket is opened. */
  React.useEffect(() => {
    if (!detailId || source !== "api") return;
    const controller = new AbortController();
    void getAdminOrder(detailId, controller.signal).then((result) => {
      if (result.ok) replaceOrder(detailId, () => result.order);
    });
    return () => controller.abort();
  }, [detailId, source]);

  /* ---- Columns ----------------------------------------------------------- */

  const columns: DataTableColumn<AdminOrder>[] = [
    {
      id: "orderNumber",
      header: "Order",
      sortValue: (order) => order.orderNumber,
      cell: (order) => (
        <span className="block">
          <span className="block font-mono text-xs font-medium text-ink-900">
            {order.orderNumber}
          </span>
          <span className="block text-xs text-ink-400">{formatOrderDateTime(order.placedAt)}</span>
        </span>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      sortValue: (order) => order.customerName,
      cell: (order) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-ink-900">{order.customerName}</span>
          <span className="block truncate text-xs text-ink-400">
            {order.delivery.city || order.customerPhone}
          </span>
        </span>
      ),
    },
    {
      id: "items",
      header: "Items",
      align: "center",
      sortValue: orderItemCount,
      cell: (order) => <span className="tabular-nums text-ink-600">{orderItemCount(order)}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (order) => ORDER_STATUS_LABEL[order.status],
      cell: (order) => (
        <StatusPill
          tone={ORDER_STATUS_TONE[order.status]}
          label={ORDER_STATUS_LABEL[order.status]}
          pulse={order.status === "PENDING_CUSTOMER_CONFIRMATION" || order.status === "COOKING"}
        />
      ),
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      sortValue: (order) => order.bill.total,
      cell: (order) => (
        <span className="font-semibold tabular-nums text-ink-900">
          {formatPrice(order.bill.total)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "sr-only",
      cell: (order) => (
        <span
          className="flex items-center justify-end gap-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          {/* The customer may simply never have pressed Send — one tap to chase. */}
          {order.status === "PENDING_CUSTOMER_CONFIRMATION" && order.customerPhone && (
            <>
              <a
                href={whatsappUrl(
                  order.delivery.whatsappPhone ?? order.customerPhone,
                  confirmationChaseMessage(order),
                )}
                target="_blank"
                rel="noreferrer"
                aria-label={`Chase ${order.orderNumber} on WhatsApp`}
                title="Chase on WhatsApp"
                className="flex size-9 items-center justify-center rounded-full border border-fresh-200 bg-fresh-50 text-fresh-700 transition-colors hover:bg-fresh-100"
              >
                <MessageCircle className="size-4" />
              </a>
              <a
                href={telUrl(order.customerPhone)}
                aria-label={`Call ${order.customerName} about ${order.orderNumber}`}
                title="Call the customer"
                className="flex size-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 transition-colors hover:bg-ink-100"
              >
                <Phone className="size-4" />
              </a>
            </>
          )}

          <AdvanceButton
            order={order}
            pending={pendingId === order.id}
            onAdvance={(next) => void changeStatus(order, next)}
          />

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`View details for ${order.orderNumber}`}
            onClick={() => setDetailId(order.id)}
          >
            <ReceiptText />
          </Button>
        </span>
      ),
    },
  ];

  /* ---- Render ------------------------------------------------------------ */

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Orders"
        description="Every ticket the database has witnessed. Advance a status as the kitchen moves, or open a ticket for the full breakdown."
        actions={
          <Button variant="outline" size="md" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {source === "sample" && <SampleDataBanner reason={offlineReason} />}

      {/* Failed mutations are announced, not just coloured. */}
      <div role="status" aria-live="polite">
        {actionError && (
          <p className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {actionError}
          </p>
        )}
      </div>

      {awaiting.length > 0 && (
        <AwaitingConfirmationCallout
          count={awaiting.length}
          active={status === "PENDING_CUSTOMER_CONFIRMATION"}
          onShow={() =>
            setStatus(
              status === "PENDING_CUSTOMER_CONFIRMATION" ? "all" : "PENDING_CUSTOMER_CONFIRMATION",
            )
          }
        />
      )}

      <Toolbar className="flex-col items-stretch lg:flex-row lg:items-center">
        <SearchField
          label="Search orders by number, customer, phone or area"
          placeholder="Search order, customer or phone…"
          value={query}
          onValueChange={setQuery}
        />

        <ToolbarSpacer />

        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="orders-from" className="text-xs text-ink-500">
            From
          </Label>
          <Input
            id="orders-from"
            type="date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
            className="h-11 w-auto min-w-36"
          />
          <Label htmlFor="orders-to" className="text-xs text-ink-500">
            To
          </Label>
          <Input
            id="orders-to"
            type="date"
            value={to}
            min={from}
            onChange={(event) => setTo(event.target.value)}
            className="h-11 w-auto min-w-36"
          />
        </div>
      </Toolbar>

      <FilterChips
        label="Filter orders by status"
        value={status}
        onValueChange={setStatus}
        options={STATUS_FILTERS.map((value) => ({
          value,
          label: value === "all" ? "All orders" : ORDER_STATUS_SHORT_LABEL[value],
          count: counts.get(value) ?? 0,
        }))}
      />

      {loading && source === null ? (
        <OrdersSkeleton />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(order) => order.id}
          caption="Orders, newest first"
          pageSize={10}
          onRowClick={(order) => setDetailId(order.id)}
          empty={
            <EmptyState
              icon={CircleSlash}
              title="No orders match those filters"
              description="Widen the date range or clear the search to see more tickets."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                    setFrom(shiftDate(TODAY, -30));
                    setTo(TODAY);
                  }}
                >
                  Reset filters
                </Button>
              }
            />
          }
          renderCard={(order) => (
            <Card className="rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">{order.customerName}</p>
                  <p className="font-mono text-[11px] text-ink-400">{order.orderNumber}</p>
                </div>
                <StatusPill
                  tone={ORDER_STATUS_TONE[order.status]}
                  label={ORDER_STATUS_SHORT_LABEL[order.status]}
                />
              </div>
              <p className="mt-2 text-xs text-ink-500">
                {formatOrderDateTime(order.placedAt)}
                {order.delivery.city ? ` · ${order.delivery.city}` : ""}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-lg font-semibold tabular-nums text-ink-900">
                  {formatPrice(order.bill.total)}
                </span>
                <Button variant="outline" size="sm" onClick={() => setDetailId(order.id)}>
                  Details
                </Button>
              </div>
            </Card>
          )}
        />
      )}

      <OrderDetailDialog
        order={detail}
        pending={detail !== null && pendingId === detail.id}
        onOpenChange={(open) => !open && setDetailId(null)}
        onAdvance={(next) => detail && void changeStatus(detail, next)}
        onRequestCancel={(id) => {
          setDetailId(null);
          setCancelId(id);
        }}
      />

      <ConfirmDialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="Cancel this order?"
        description="The customer is notified immediately and any captured payment is queued for refund. Cancellation is terminal — it cannot be undone."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        onConfirm={() => {
          const target = orders.find((order) => order.id === cancelId);
          if (target) void changeStatus(target, "CANCELLED", "Cancelled from the admin panel.");
        }}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Banners & callouts                                                        */
/* ========================================================================== */

function SampleDataBanner({ reason }: { reason: string | null }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-3"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0 text-sm text-amber-900">
        <p className="font-semibold">This is sample data — the orders API is not connected.</p>
        <p className="mt-0.5 leading-relaxed text-amber-800">
          Nothing on this screen reflects real orders, and status changes are not saved anywhere.
          {reason ? ` (${reason})` : ""}
        </p>
      </div>
    </div>
  );
}

function AwaitingConfirmationCallout({
  count,
  active,
  onShow,
}: {
  count: number;
  active: boolean;
  onShow: () => void;
}) {
  return (
    <Card className="flex flex-col gap-3 rounded-3xl border-amber-200 bg-amber-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Clock className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight text-ink-900">
            {count} order{count === 1 ? "" : "s"} awaiting confirmation
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
            These are saved in the database but the customer may never have pressed Send on
            WhatsApp. Chase each one, then confirm or cancel — nothing else in the kitchen should
            start until you do.
          </p>
        </div>
      </div>
      <Button variant="outline" size="md" className="shrink-0 self-start sm:self-center" onClick={onShow}>
        {active ? "Show all orders" : "Show them"}
        <ArrowRight />
      </Button>
    </Card>
  );
}

function OrdersSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-soft"
      aria-busy="true"
      aria-label="Loading orders"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-b border-ink-100 px-4 py-4 last:border-0">
          <div className="h-3 w-28 animate-pulse rounded-full bg-ink-100" />
          <div className="h-3 w-40 animate-pulse rounded-full bg-ink-100" />
          <div className="ml-auto h-6 w-24 animate-pulse rounded-full bg-ink-100" />
        </div>
      ))}
    </div>
  );
}

/* ========================================================================== */
/*  Status advancement                                                        */
/* ========================================================================== */

/**
 * Offers only transitions the server's state machine will accept.
 *
 * Cancellation is excluded here — it is destructive and terminal, so it goes
 * through the confirmation dialog in the detail view instead of sitting one
 * mis-tap away in a table row.
 */
function AdvanceButton({
  order,
  pending,
  onAdvance,
}: {
  order: AdminOrder;
  pending: boolean;
  onAdvance: (next: OrderStatus) => void;
}) {
  const forward = ALLOWED_TRANSITIONS[order.status].filter((next) => next !== "CANCELLED");
  const next = forward[0];
  if (!next) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => onAdvance(next)}
      aria-label={`Move ${order.orderNumber} to ${ORDER_STATUS_LABEL[next]}`}
    >
      {ORDER_STATUS_SHORT_LABEL[next]}
      {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
    </Button>
  );
}

/* ========================================================================== */
/*  Detail dialog                                                             */
/* ========================================================================== */

function OrderDetailDialog({
  order,
  pending,
  onOpenChange,
  onAdvance,
  onRequestCancel,
}: {
  order: AdminOrder | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onAdvance: (next: OrderStatus) => void;
  onRequestCancel: (id: string) => void;
}) {
  const legal = order ? ALLOWED_TRANSITIONS[order.status] : [];
  const forward = legal.filter((next) => next !== "CANCELLED");
  const canCancel = legal.includes("CANCELLED");

  return (
    <Dialog open={order !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {order && (
          <>
            <DialogHeader className="border-b border-ink-100 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill
                  tone={ORDER_STATUS_TONE[order.status]}
                  label={ORDER_STATUS_LABEL[order.status]}
                />
                <Badge variant="outline" size="sm" className="font-mono">
                  {order.orderNumber}
                </Badge>
                <Badge variant="muted" size="sm">
                  {order.channel}
                </Badge>
                {order.isSample && (
                  <Badge variant="warning" size="sm">
                    Sample
                  </Badge>
                )}
              </div>
              <DialogTitle>{order.customerName}</DialogTitle>
              <DialogDescription>
                Placed {formatOrderDateTime(order.placedAt)}
                {order.estimatedMinutes ? ` · ~${order.estimatedMinutes} min prep` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <InfoBlock icon={Phone} label="Phone">
                <a href={telUrl(order.customerPhone)} className="hover:text-brand-600">
                  {order.customerPhone || "—"}
                </a>
              </InfoBlock>
              <InfoBlock icon={MapPin} label="Deliver to">
                {formatDeliveryAddress(order.delivery) || "—"}
              </InfoBlock>
              <InfoBlock icon={Truck} label="Payment">
                {order.paymentMethod} · {order.paymentStatus}
              </InfoBlock>
              {order.kitchenNote && (
                <InfoBlock icon={NotebookPen} label="Note for the kitchen">
                  {order.kitchenNote}
                </InfoBlock>
              )}
            </div>

            {order.status === "PENDING_CUSTOMER_CONFIRMATION" && order.customerPhone && (
              <div className="mx-6 mb-2 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber-900">
                  The order exists, but the customer has not confirmed it. Chase them before
                  cooking.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={whatsappUrl(
                      order.delivery.whatsappPhone ?? order.customerPhone,
                      confirmationChaseMessage(order),
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle />
                    WhatsApp
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={telUrl(order.customerPhone)}>
                    <Phone />
                    Call
                  </a>
                </Button>
              </div>
            )}

            <div className="px-6 pb-2">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Items
              </h3>
              <table className="w-full text-sm">
                <caption className="sr-only">Items in order {order.orderNumber}</caption>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Dish</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((line) => (
                    <tr key={line.id} className="border-b border-ink-100 last:border-0">
                      <td className="py-2.5 pr-3 text-ink-800">
                        <span className="block">{line.name}</span>
                        {line.addOns.length > 0 && (
                          <span className="mt-0.5 block text-xs text-ink-500">
                            + {line.addOns.join(", ")}
                          </span>
                        )}
                        {line.components.length > 0 && (
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {line.components.join(" · ")}
                          </span>
                        )}
                        {line.note && (
                          <span className="mt-0.5 block text-xs italic text-brand-600">
                            “{line.note}”
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-center align-top tabular-nums text-ink-500">
                        ×{line.quantity}
                      </td>
                      <td className="py-2.5 text-right align-top font-medium tabular-nums text-ink-900">
                        {formatPrice(line.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Separator className="my-4" />

              <dl className="flex flex-col gap-2 text-sm">
                <SummaryRow label="Subtotal" value={formatPrice(order.bill.subtotal)} />
                {order.bill.discount > 0 && (
                  <SummaryRow
                    label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                    value={`− ${formatPrice(order.bill.discount)}`}
                    tone="positive"
                  />
                )}
                <SummaryRow
                  label="Delivery"
                  value={order.bill.deliveryFee === 0 ? "Free" : formatPrice(order.bill.deliveryFee)}
                />
                <SummaryRow label="Packaging" value={formatPrice(order.bill.packagingFee)} />
                <SummaryRow label="GST" value={formatPrice(order.bill.gst)} />
                <Separator className="my-1" />
                <SummaryRow label="Total" value={formatPrice(order.bill.total)} emphasis />
              </dl>
            </div>

            <div className="px-6 pb-2 pt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Status timeline
              </h3>
              <OrderTimeline entries={order.timeline} />
            </div>

            <div className="flex flex-col-reverse gap-2 p-6 pt-4 sm:flex-row sm:justify-end">
              {canCancel && (
                <Button variant="outline" onClick={() => onRequestCancel(order.id)}>
                  Cancel order
                </Button>
              )}
              {forward.map((next) => (
                <Button key={next} disabled={pending} onClick={() => onAdvance(next)}>
                  Mark {ORDER_STATUS_LABEL[next].toLowerCase()}
                  {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                </Button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Rendered from the append-only status events, exactly like the tracking page. */
function OrderTimeline({ entries }: { entries: AdminOrder["timeline"] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-500">No status events recorded yet.</p>;
  }

  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const last = index === entries.length - 1;
        return (
          <li key={`${entry.status}-${entry.at}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 size-2.5 shrink-0 rounded-full",
                  last ? "bg-brand-500 ring-4 ring-brand-100" : "bg-ink-300",
                )}
              />
              {!last && <span aria-hidden className="w-px flex-1 bg-ink-200" />}
            </div>
            <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-4")}>
              <p className="text-sm font-medium text-ink-900">
                {ORDER_STATUS_LABEL[entry.status]}
              </p>
              <p className="text-xs tabular-nums text-ink-400">
                {formatOrderDateTime(entry.at)}
                {entry.actor ? ` · ${entry.actor}` : ""}
              </p>
              {entry.note && <p className="mt-0.5 text-xs text-ink-500">{entry.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
        <p className="mt-0.5 text-sm text-ink-800">{children}</p>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasis = false,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "positive";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn("text-ink-500", emphasis && "font-medium text-ink-900")}>{label}</dt>
      <dd
        className={cn(
          "tabular-nums text-ink-800",
          tone === "positive" && "text-fresh-600",
          emphasis && "font-display text-lg text-ink-900",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
