"use client";

import * as React from "react";
import {
  ArrowRight,
  CircleSlash,
  Download,
  MapPin,
  Phone,
  ReceiptText,
  Truck,
} from "lucide-react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pill";
import {
  formatDateTime,
  orderStatusTone,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from "@/components/admin/status-maps";
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
  ORDER_STATUS_LABEL,
  TODAY,
  adminOrders,
  nextOrderStatus,
  shiftDate,
  type AdminOrder,
  type OrderStatus,
} from "@/data/admin-mock";
import { cn, formatPrice } from "@/lib/utils";

type StatusFilter = OrderStatus | "all";

const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "pending",
  "confirmed",
  "preparing",
  "out-for-delivery",
  "delivered",
  "cancelled",
];

export function OrdersView() {
  // Local state stands in for the mutation API — advancing a status here is
  // exactly the optimistic update the real `PATCH /api/orders/:id` will drive.
  const [orders, setOrders] = React.useState<AdminOrder[]>(adminOrders);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [from, setFrom] = React.useState(shiftDate(TODAY, -6));
  const [to, setTo] = React.useState(TODAY);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [cancelId, setCancelId] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    const map = new Map<StatusFilter, number>([["all", orders.length]]);
    for (const order of orders) {
      map.set(order.status, (map.get(order.status) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    return orders
      .filter((order) => (status === "all" ? true : order.status === status))
      .filter((order) => {
        const day = order.placedAt.slice(0, 10);
        return day >= from && day <= to;
      })
      .filter((order) => {
        if (!needle) return true;
        return (
          order.id.toLowerCase().includes(needle) ||
          order.customerName.toLowerCase().includes(needle) ||
          order.phone.replace(/\s/g, "").includes(needle.replace(/\s/g, "")) ||
          order.area.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }, [orders, status, from, to, query]);

  const detail = detailId ? (orders.find((order) => order.id === detailId) ?? null) : null;

  function advance(id: string) {
    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? { ...order, status: nextOrderStatus(order.status) ?? order.status }
          : order,
      ),
    );
  }

  function cancel(id: string) {
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, status: "cancelled", paymentStatus: "refunded" } : order,
      ),
    );
  }

  const columns: DataTableColumn<AdminOrder>[] = [
    {
      id: "id",
      header: "Order",
      sortValue: (order) => order.id,
      cell: (order) => (
        <span className="block">
          <span className="block font-mono text-xs font-medium text-ink-900">{order.id}</span>
          <span className="block text-xs text-ink-400">{formatDateTime(order.placedAt)}</span>
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
          <span className="block truncate text-xs text-ink-400">{order.area}</span>
        </span>
      ),
    },
    {
      id: "items",
      header: "Items",
      align: "center",
      sortValue: (order) => order.items.reduce((sum, line) => sum + line.quantity, 0),
      cell: (order) => (
        <span className="tabular-nums text-ink-600">
          {order.items.reduce((sum, line) => sum + line.quantity, 0)}
        </span>
      ),
    },
    {
      id: "payment",
      header: "Payment",
      sortValue: (order) => order.paymentMethod,
      cell: (order) => (
        <span className="block">
          <span className="block text-xs text-ink-600">
            {paymentMethodLabel[order.paymentMethod]}
          </span>
          <StatusPill
            size="sm"
            tone={paymentStatusTone[order.paymentStatus]}
            label={paymentStatusLabel[order.paymentStatus]}
            className="mt-1"
          />
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (order) => order.status,
      cell: (order) => (
        <StatusPill
          tone={orderStatusTone[order.status]}
          label={ORDER_STATUS_LABEL[order.status]}
          pulse={order.status === "preparing" || order.status === "out-for-delivery"}
        />
      ),
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      sortValue: (order) => order.total,
      cell: (order) => (
        <span className="font-semibold tabular-nums text-ink-900">
          {formatPrice(order.total)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "sr-only",
      cell: (order) => {
        const next = nextOrderStatus(order.status);
        return (
          <span
            className="flex items-center justify-end gap-1.5"
            onClick={(event) => event.stopPropagation()}
          >
            {next && order.status !== "cancelled" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => advance(order.id)}
                aria-label={`Advance ${order.id} to ${ORDER_STATUS_LABEL[next]}`}
              >
                {ORDER_STATUS_LABEL[next]}
                <ArrowRight />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`View details for ${order.id}`}
              onClick={() => setDetailId(order.id)}
            >
              <ReceiptText />
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Orders"
        description="Every ticket from the last month. Advance a status as the kitchen moves, or open a ticket for the full breakdown."
        actions={
          <Button variant="outline" size="md">
            <Download />
            Export CSV
          </Button>
        }
      />

      <Toolbar className="flex-col items-stretch lg:flex-row lg:items-center">
        <SearchField
          label="Search orders by id, customer, phone or area"
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
          label: value === "all" ? "All orders" : ORDER_STATUS_LABEL[value],
          count: counts.get(value) ?? 0,
        }))}
      />

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
                <p className="font-mono text-[11px] text-ink-400">{order.id}</p>
              </div>
              <StatusPill
                tone={orderStatusTone[order.status]}
                label={ORDER_STATUS_LABEL[order.status]}
              />
            </div>
            <p className="mt-2 text-xs text-ink-500">
              {formatDateTime(order.placedAt)} · {order.area}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-lg font-semibold tabular-nums text-ink-900">
                {formatPrice(order.total)}
              </span>
              <Button variant="outline" size="sm" onClick={() => setDetailId(order.id)}>
                Details
              </Button>
            </div>
          </Card>
        )}
      />

      <OrderDetailDialog
        order={detail}
        onOpenChange={(open) => !open && setDetailId(null)}
        onAdvance={advance}
        onRequestCancel={(id) => {
          setDetailId(null);
          setCancelId(id);
        }}
      />

      <ConfirmDialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="Cancel this order?"
        description="The customer is notified immediately and any captured payment is queued for refund. This cannot be undone."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        onConfirm={() => cancelId && cancel(cancelId)}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Detail dialog                                                             */
/* ========================================================================== */

function OrderDetailDialog({
  order,
  onOpenChange,
  onAdvance,
  onRequestCancel,
}: {
  order: AdminOrder | null;
  onOpenChange: (open: boolean) => void;
  onAdvance: (id: string) => void;
  onRequestCancel: (id: string) => void;
}) {
  const next = order ? nextOrderStatus(order.status) : null;

  return (
    <Dialog open={order !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {order && (
          <>
            <DialogHeader className="border-b border-ink-100 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill
                  tone={orderStatusTone[order.status]}
                  label={ORDER_STATUS_LABEL[order.status]}
                />
                <Badge variant="outline" size="sm" className="font-mono">
                  {order.id}
                </Badge>
                <Badge variant="muted" size="sm" className="capitalize">
                  {order.channel}
                </Badge>
              </div>
              <DialogTitle>{order.customerName}</DialogTitle>
              <DialogDescription>
                Placed {formatDateTime(order.placedAt)}
                {order.fulfilmentMinutes
                  ? ` · delivered in ${order.fulfilmentMinutes} min`
                  : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <InfoBlock icon={Phone} label="Phone">
                <a href={`tel:${order.phone.replace(/\s/g, "")}`} className="hover:text-brand-600">
                  {order.phone}
                </a>
              </InfoBlock>
              <InfoBlock icon={MapPin} label="Deliver to">
                {order.addressLine}, {order.area}
              </InfoBlock>
              <InfoBlock icon={Truck} label="Payment">
                {paymentMethodLabel[order.paymentMethod]} ·{" "}
                {paymentStatusLabel[order.paymentStatus]}
              </InfoBlock>
              {order.note && (
                <InfoBlock icon={ReceiptText} label="Customer note">
                  {order.note}
                </InfoBlock>
              )}
            </div>

            <div className="px-6 pb-2">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Items
              </h3>
              <table className="w-full text-sm">
                <caption className="sr-only">Items in order {order.id}</caption>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Dish</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((line) => (
                    <tr key={line.itemId} className="border-b border-ink-100 last:border-0">
                      <td className="py-2.5 pr-3 text-ink-800">{line.name}</td>
                      <td className="py-2.5 text-center tabular-nums text-ink-500">
                        ×{line.quantity}
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums text-ink-900">
                        {formatPrice(line.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Separator className="my-4" />

              <dl className="flex flex-col gap-2 text-sm">
                <SummaryRow label="Subtotal" value={formatPrice(order.subtotal)} />
                {order.discount > 0 && (
                  <SummaryRow
                    label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                    value={`− ${formatPrice(order.discount)}`}
                    tone="positive"
                  />
                )}
                <SummaryRow
                  label="Delivery"
                  value={order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}
                />
                <SummaryRow label="Packaging" value={formatPrice(order.packagingFee)} />
                <SummaryRow label="GST (5%)" value={formatPrice(order.gst)} />
                <Separator className="my-1" />
                <SummaryRow label="Total" value={formatPrice(order.total)} emphasis />
              </dl>
            </div>

            <div className="flex flex-col-reverse gap-2 p-6 pt-4 sm:flex-row sm:justify-end">
              {order.status !== "cancelled" && order.status !== "delivered" && (
                <Button variant="outline" onClick={() => onRequestCancel(order.id)}>
                  Cancel order
                </Button>
              )}
              {next && order.status !== "cancelled" && (
                <Button onClick={() => onAdvance(order.id)}>
                  Mark {ORDER_STATUS_LABEL[next].toLowerCase()}
                  <ArrowRight />
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
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
