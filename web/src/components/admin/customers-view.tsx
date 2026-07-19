"use client";

import * as React from "react";
import { Download, Mail, MapPin, Phone, UserRoundX } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusPill } from "@/components/admin/status-pill";
import {
  formatDateTime,
  formatDay,
  orderStatusTone,
  relativeDay,
  segmentLabel,
  segmentTone,
} from "@/components/admin/status-maps";
import { FilterChips, SearchField, Toolbar, ToolbarSpacer } from "@/components/admin/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/form-controls";
import { FoodImage } from "@/components/ui/food-image";
import {
  ORDER_STATUS_LABEL,
  TODAY,
  adminCustomers,
  adminOrders,
  adminSubscriptions,
  type AdminCustomer,
  type CustomerSegment,
} from "@/data/admin-mock";
import { itemById } from "@/data/menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPrice, formatPriceCompact } from "@/lib/utils";

type SegmentFilter = CustomerSegment | "all";

const SEGMENT_FILTERS: SegmentFilter[] = ["all", "vip", "regular", "new"];

export function CustomersView() {
  const [query, setQuery] = React.useState("");
  const [segment, setSegment] = React.useState<SegmentFilter>("all");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    const map = new Map<SegmentFilter, number>([["all", adminCustomers.length]]);
    for (const customer of adminCustomers) {
      map.set(customer.segment, (map.get(customer.segment) ?? 0) + 1);
    }
    return map;
  }, []);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return adminCustomers
      .filter((customer) => (segment === "all" ? true : customer.segment === segment))
      .filter((customer) =>
        needle
          ? customer.name.toLowerCase().includes(needle) ||
            customer.email.toLowerCase().includes(needle) ||
            customer.phone.replace(/\s/g, "").includes(needle.replace(/\s/g, "")) ||
            customer.area.toLowerCase().includes(needle)
          : true,
      )
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  }, [query, segment]);

  const active = openId ? (adminCustomers.find((c) => c.id === openId) ?? null) : null;

  const totalLtv = adminCustomers.reduce((sum, customer) => sum + customer.lifetimeValue, 0);
  const totalOrders = adminCustomers.reduce((sum, customer) => sum + customer.orderCount, 0);

  const columns: DataTableColumn<AdminCustomer>[] = [
    {
      id: "name",
      header: "Customer",
      sortValue: (customer) => customer.name,
      cell: (customer) => (
        <span className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
            {customer.initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink-900">{customer.name}</span>
            <span className="block truncate text-xs text-ink-400">{customer.email}</span>
          </span>
        </span>
      ),
    },
    {
      id: "segment",
      header: "Segment",
      sortValue: (customer) => customer.segment,
      cell: (customer) => (
        <StatusPill
          tone={segmentTone[customer.segment]}
          label={segmentLabel[customer.segment]}
          size="sm"
        />
      ),
    },
    {
      id: "area",
      header: "Area",
      sortValue: (customer) => customer.area,
      cell: (customer) => <span className="text-ink-600">{customer.area}</span>,
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
      sortValue: (customer) => customer.lastOrderAt,
      cell: (customer) => (
        <span className="text-xs text-ink-500">{relativeDay(customer.lastOrderAt, TODAY)}</span>
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
          <Button variant="outline" size="md">
            <Download />
            Export list
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={adminCustomers.length} change={9.2} />
        <StatCard
          label="Combined lifetime value"
          value={totalLtv}
          format="currency"
          change={12.7}
        />
        <StatCard
          label="Average orders per customer"
          value={Math.round(totalOrders / adminCustomers.length)}
          change={4.1}
        />
        <StatCard
          label="VIP customers"
          value={counts.get("vip") ?? 0}
          change={2.5}
          hint="₹18K+ lifetime value"
        />
      </div>

      <Toolbar>
        <SearchField
          label="Search customers by name, email, phone or area"
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
            title="No customers match"
            description="Try a different segment or clear the search."
          />
        }
        renderCard={(customer) => (
          <Card className="rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                  {customer.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">{customer.name}</p>
                  <p className="truncate text-xs text-ink-400">{customer.area}</p>
                </div>
              </div>
              <StatusPill
                tone={segmentTone[customer.segment]}
                label={segmentLabel[customer.segment]}
                size="sm"
              />
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
        )}
      />

      <CustomerDrawer customer={active} onOpenChange={(open) => !open && setOpenId(null)} />
    </div>
  );
}

/* ========================================================================== */
/*  Detail drawer                                                             */
/* ========================================================================== */

function CustomerDrawer({
  customer,
  onOpenChange,
}: {
  customer: AdminCustomer | null;
  onOpenChange: (open: boolean) => void;
}) {
  const orders = customer
    ? adminOrders
        .filter((order) => order.customerId === customer.id)
        .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    : [];

  const subscription = customer?.subscriptionId
    ? adminSubscriptions.find((entry) => entry.id === customer.subscriptionId)
    : undefined;

  const favourite = customer ? itemById.get(customer.favouriteItemId) : undefined;

  return (
    <Sheet open={customer !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto p-0">
        {customer && (
          <>
            <SheetHeader className="pr-14">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-white">
                  {customer.initials}
                </span>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{customer.name}</SheetTitle>
                  <SheetDescription>
                    Customer since {formatDay(customer.joinedAt)}
                  </SheetDescription>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill
                  tone={segmentTone[customer.segment]}
                  label={`${segmentLabel[customer.segment]} customer`}
                />
                {subscription && (
                  <Badge variant="veg" size="sm">
                    Tiffin subscriber
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-6">
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Orders" value={String(customer.orderCount)} />
                <Metric label="Lifetime" value={formatPriceCompact(customer.lifetimeValue)} />
                <Metric
                  label="Avg order"
                  value={formatPriceCompact(
                    Math.round(customer.lifetimeValue / Math.max(customer.orderCount, 1)),
                  )}
                />
              </div>

              <div className="flex flex-col gap-3">
                <ContactRow icon={Phone} href={`tel:${customer.phone.replace(/\s/g, "")}`}>
                  {customer.phone}
                </ContactRow>
                <ContactRow icon={Mail} href={`mailto:${customer.email}`}>
                  {customer.email}
                </ContactRow>
                <ContactRow icon={MapPin}>
                  {customer.addressLine}, {customer.area}
                </ContactRow>
              </div>

              {customer.notes && (
                <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
                  {customer.notes}
                </p>
              )}

              {favourite && (
                <div>
                  <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Orders most often
                  </h3>
                  <div className="flex items-center gap-3 rounded-2xl border border-ink-200/70 p-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                      <FoodImage imageId={favourite.imageId} alt={favourite.name} sizes="48px" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {favourite.name}
                      </p>
                      <p className="text-xs tabular-nums text-ink-500">
                        {formatPrice(favourite.price)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {subscription && (
                <div>
                  <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Tiffin subscription
                  </h3>
                  <div className="rounded-2xl border border-ink-200/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-xs text-ink-500">{subscription.id}</p>
                      <StatusPill
                        size="sm"
                        tone={subscription.status === "active" ? "success" : "progress"}
                        label={subscription.status}
                        className="capitalize"
                      />
                    </div>
                    <p className="mt-2 text-sm capitalize text-ink-800">
                      {subscription.planTier} plan · {subscription.cycle} · {subscription.slot}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {subscription.mealsRemaining} meals left · renews{" "}
                      {formatDay(subscription.renewsAt)}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Recent orders
                </h3>
                {orders.length === 0 ? (
                  <p className="text-sm text-ink-500">
                    No orders in the last 30 days.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-ink-100">
                    {orders.map((order) => (
                      <li key={order.id} className="flex items-center gap-3 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-xs text-ink-500">
                            {order.id}
                          </span>
                          <span className="block text-xs text-ink-400">
                            {formatDateTime(order.placedAt)}
                          </span>
                        </span>
                        <StatusPill
                          size="sm"
                          tone={orderStatusTone[order.status]}
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
                <Button variant="outline" size="md" asChild>
                  <a href={`tel:${customer.phone.replace(/\s/g, "")}`}>
                    <Phone />
                    Call
                  </a>
                </Button>
                <Button variant="outline" size="md" asChild>
                  <a href={`mailto:${customer.email}`}>
                    <Mail />
                    Email
                  </a>
                </Button>
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
