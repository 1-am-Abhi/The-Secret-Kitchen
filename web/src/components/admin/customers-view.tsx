"use client";

import * as React from "react";
import { Mail, MapPin, Phone, RefreshCw, UserRoundX } from "lucide-react";

import { ApiErrorNotice, LoadingRows, useAdminQuery } from "@/components/admin/admin-data";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusPill } from "@/components/admin/status-pill";
import {
  formatDateTime,
  formatDay,
  relativeDay,
  segmentLabel,
  segmentOf,
  segmentTone,
  todayIso,
  type CustomerSegment,
} from "@/components/admin/status-maps";
import { FilterChips, SearchField, Toolbar, ToolbarSpacer } from "@/components/admin/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/form-controls";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  getAdminCustomer,
  listAdminCustomers,
  type AdminCustomerDetail,
  type AdminCustomerSummary,
} from "@/lib/admin-orders";
import { formatPrice, formatPriceCompact } from "@/lib/utils";

type SegmentFilter = CustomerSegment | "all";

const SEGMENT_FILTERS: SegmentFilter[] = ["all", "vip", "regular", "new"];

/** One page of customers. The API caps a page at 100 rows. */
const PAGE_LIMIT = 100;

export function CustomersView() {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [segment, setSegment] = React.useState<SegmentFilter>("all");
  const [openId, setOpenId] = React.useState<string | null>(null);
  /** Resolved after mount so "today" is the operator's day, not the server's. */
  const [today, setToday] = React.useState("");

  React.useEffect(() => setToday(todayIso()), []);

  // Search runs on the server; debounce so a keystroke is not a request.
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = React.useCallback(
    (signal: AbortSignal) =>
      listAdminCustomers({ search: debounced, limit: PAGE_LIMIT, sort: "spend", signal }),
    [debounced],
  );

  const customers = useAdminQuery(load);
  const rows = React.useMemo(() => customers.data?.items ?? [], [customers.data]);
  const total = customers.data?.meta.total ?? 0;
  /** True when the figures below describe a page rather than the whole book. */
  const partial = total > rows.length;

  const segmentsById = React.useMemo(
    () => new Map(rows.map((row) => [row.id, segmentOf(row.orderCount, row.lifetimeValue)])),
    [rows],
  );

  const counts = React.useMemo(() => {
    const map = new Map<SegmentFilter, number>([["all", rows.length]]);
    for (const row of rows) {
      const value = segmentsById.get(row.id) ?? "new";
      map.set(value, (map.get(value) ?? 0) + 1);
    }
    return map;
  }, [rows, segmentsById]);

  const filtered = React.useMemo(
    () =>
      segment === "all"
        ? rows
        : rows.filter((row) => segmentsById.get(row.id) === segment),
    [rows, segment, segmentsById],
  );

  const totalLtv = rows.reduce((sum, customer) => sum + customer.lifetimeValue, 0);
  const totalOrders = rows.reduce((sum, customer) => sum + customer.orderCount, 0);

  const columns: DataTableColumn<AdminCustomerSummary>[] = [
    {
      id: "name",
      header: "Customer",
      sortValue: (customer) => customer.name,
      cell: (customer) => (
        <span className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
            {initialsOf(customer.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink-900">{customer.name}</span>
            <span className="block truncate text-xs text-ink-400">
              {customer.email ?? customer.phone}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: "segment",
      header: "Segment",
      sortValue: (customer) => segmentsById.get(customer.id) ?? "new",
      cell: (customer) => {
        const value = segmentsById.get(customer.id) ?? "new";
        return <StatusPill tone={segmentTone[value]} label={segmentLabel[value]} size="sm" />;
      },
    },
    {
      id: "phone",
      header: "Phone",
      sortValue: (customer) => customer.phone,
      cell: (customer) => <span className="text-ink-600">{customer.phone || "—"}</span>,
    },
    {
      id: "orders",
      header: "Orders",
      align: "right",
      sortValue: (customer) => customer.orderCount,
      cell: (customer) => (
        <span className="tabular-nums text-ink-700">{customer.orderCount}</span>
      ),
    },
    {
      id: "ltv",
      header: "Lifetime value",
      align: "right",
      sortValue: (customer) => customer.lifetimeValue,
      cell: (customer) => (
        <span className="font-semibold tabular-nums text-ink-900">
          {formatPrice(customer.lifetimeValue)}
        </span>
      ),
    },
    {
      id: "last",
      header: "Last order",
      align: "right",
      sortValue: (customer) => customer.lastOrderAt ?? "",
      cell: (customer) => (
        <span className="text-xs text-ink-500">
          {customer.lastOrderAt
            ? today
              ? relativeDay(customer.lastOrderAt, today)
              : formatDay(customer.lastOrderAt.slice(0, 10))
            : "Never"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Relationships"
        title="Customers"
        description="Who orders, how often, and what they are worth. Open a row for the full history."
        actions={
          <Button
            variant="outline"
            size="md"
            onClick={customers.reload}
            disabled={customers.loading}
          >
            <RefreshCw />
            Refresh
          </Button>
        }
      />

      {customers.failure && (
        <ApiErrorNotice failure={customers.failure} onRetry={customers.reload} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={total} hint="records in the database" />
        <StatCard
          label="Combined lifetime value"
          value={totalLtv}
          format="currency"
          hint={partial ? `across the top ${rows.length} customers` : "delivered orders only"}
        />
        <StatCard
          label="Average orders per customer"
          value={rows.length > 0 ? Math.round(totalOrders / rows.length) : 0}
          hint={partial ? `across the top ${rows.length} customers` : "all customers"}
        />
        <StatCard
          label="VIP customers"
          value={counts.get("vip") ?? 0}
          hint="₹18K+ lifetime value"
        />
      </div>

      <Toolbar>
        <SearchField
          label="Search customers by name, email or phone"
          placeholder="Search customers…"
          value={query}
          onValueChange={setQuery}
        />
        <ToolbarSpacer />
        <FilterChips
          label="Filter customers by segment"
          value={segment}
          onValueChange={setSegment}
          options={SEGMENT_FILTERS.map((value) => ({
            value,
            label: value === "all" ? "All" : segmentLabel[value],
            count: counts.get(value) ?? 0,
          }))}
        />
      </Toolbar>

      {customers.loading && !customers.data ? (
        <LoadingRows label="Loading customers" />
      ) : customers.failure ? null : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(customer) => customer.id}
          caption="Customers ranked by lifetime value"
          pageSize={10}
          onRowClick={(customer) => setOpenId(customer.id)}
          empty={
            <EmptyState
              icon={UserRoundX}
              title={rows.length === 0 ? "No customers yet" : "No customers match"}
              description={
                rows.length === 0
                  ? "A customer record is created the first time someone places an order."
                  : "Try a different segment or clear the search."
              }
            />
          }
          renderCard={(customer) => {
            const value = segmentsById.get(customer.id) ?? "new";
            return (
              <Card className="rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                      {initialsOf(customer.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">{customer.name}</p>
                      <p className="truncate text-xs text-ink-400">{customer.phone}</p>
                    </div>
                  </div>
                  <StatusPill tone={segmentTone[value]} label={segmentLabel[value]} size="sm" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm tabular-nums text-ink-500">
                    {customer.orderCount} orders · {formatPriceCompact(customer.lifetimeValue)}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setOpenId(customer.id)}>
                    Open
                  </Button>
                </div>
              </Card>
            );
          }}
        />
      )}

      <CustomerDrawer
        customerId={openId}
        summary={rows.find((row) => row.id === openId) ?? null}
        onOpenChange={(open) => !open && setOpenId(null)}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Detail drawer                                                             */
/* ========================================================================== */

function CustomerDrawer({
  customerId,
  summary,
  onOpenChange,
}: {
  customerId: string | null;
  summary: AdminCustomerSummary | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = React.useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!customerId) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void getAdminCustomer(customerId, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setDetail(result.ok ? result.data : null);
      setLoading(false);
    });
    return () => controller.abort();
  }, [customerId]);

  const name = detail?.name ?? summary?.name ?? "";
  const phone = detail?.phone ?? summary?.phone ?? "";
  const email = detail?.email ?? summary?.email;
  const address = detail?.addresses.find((entry) => entry.isDefault) ?? detail?.addresses[0];
  const segment = summary ? segmentOf(summary.orderCount, summary.lifetimeValue) : null;

  return (
    <Sheet open={customerId !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto p-0">
        {customerId && (
          <>
            <SheetHeader className="pr-14">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-white">
                  {initialsOf(name)}
                </span>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{name || "Customer"}</SheetTitle>
                  <SheetDescription>
                    {detail
                      ? `Customer since ${formatDay(detail.joinedAt.slice(0, 10))}`
                      : "Loading the full record…"}
                  </SheetDescription>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {segment && (
                  <StatusPill
                    tone={segmentTone[segment]}
                    label={`${segmentLabel[segment]} customer`}
                  />
                )}
                {detail && detail.subscriptions.length > 0 && (
                  <Badge variant="veg" size="sm">
                    Tiffin subscriber
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-6">
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Orders" value={String(summary?.orderCount ?? 0)} />
                <Metric
                  label="Lifetime"
                  value={formatPriceCompact(summary?.lifetimeValue ?? 0)}
                />
                <Metric
                  label="Avg order"
                  value={formatPriceCompact(
                    Math.round(
                      (summary?.lifetimeValue ?? 0) / Math.max(summary?.orderCount ?? 0, 1),
                    ),
                  )}
                />
              </div>

              <div className="flex flex-col gap-3">
                {phone && (
                  <ContactRow icon={Phone} href={`tel:${phone.replace(/\s/g, "")}`}>
                    {phone}
                  </ContactRow>
                )}
                {email && (
                  <ContactRow icon={Mail} href={`mailto:${email}`}>
                    {email}
                  </ContactRow>
                )}
                {address && (
                  <ContactRow icon={MapPin}>
                    {[address.line1, address.line2, address.landmark, address.city, address.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </ContactRow>
                )}
              </div>

              {detail && detail.subscriptions.length > 0 && (
                <div>
                  <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Tiffin subscriptions
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {detail.subscriptions.map((subscription) => (
                      <li
                        key={subscription.id}
                        className="rounded-2xl border border-ink-200/70 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-xs text-ink-500">{subscription.code}</p>
                          <StatusPill
                            size="sm"
                            tone={subscription.status === "active" ? "success" : "progress"}
                            label={subscription.status}
                            className="capitalize"
                          />
                        </div>
                        <p className="mt-2 text-sm text-ink-800">{subscription.plan}</p>
                        <p className="mt-1 text-xs text-ink-500">
                          {subscription.mealsRemaining} meals left
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Recent orders
                </h3>
                {loading && !detail ? (
                  <p className="text-sm text-ink-500">Loading…</p>
                ) : !detail || detail.orders.length === 0 ? (
                  <p className="text-sm text-ink-500">
                    This customer has not placed an order yet.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-ink-100">
                    {detail.orders.map((order) => (
                      <li key={order.id} className="flex items-center gap-3 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-xs text-ink-500">
                            {order.orderNumber}
                          </span>
                          <span className="block text-xs text-ink-400">
                            {formatDateTime(order.placedAt)}
                          </span>
                        </span>
                        <StatusPill
                          size="sm"
                          tone={ORDER_STATUS_TONE[order.status]}
                          label={ORDER_STATUS_LABEL[order.status]}
                        />
                        <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums text-ink-900">
                          {formatPrice(order.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                {phone && (
                  <Button variant="outline" size="md" asChild>
                    <a href={`tel:${phone.replace(/\s/g, "")}`}>
                      <Phone />
                      Call
                    </a>
                  </Button>
                )}
                {email && (
                  <Button variant="outline" size="md" asChild>
                    <a href={`mailto:${email}`}>
                      <Mail />
                      Email
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink-50 p-3 text-center">
      <p className="font-display text-xl tabular-nums leading-none text-ink-900">{value}</p>
      <p className="mt-1.5 text-[11px] uppercase tracking-wide text-ink-400">{label}</p>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  href,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children: React.ReactNode;
}) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{children}</span>
    </>
  );

  return href ? (
    <a href={href} className="flex items-center gap-3 transition-colors hover:text-brand-600">
      {content}
    </a>
  ) : (
    <div className="flex items-center gap-3">{content}</div>
  );
}

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
