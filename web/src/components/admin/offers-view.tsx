"use client";

import * as React from "react";
import { BadgePercent, Check, Copy, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { ApiErrorNotice, LoadingBlock, useAdminQuery } from "@/components/admin/admin-data";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusPill } from "@/components/admin/status-pill";
import { daysBetween, formatDay, todayIso } from "@/components/admin/status-maps";
import { FilterChips, SearchField, Toolbar, ToolbarSpacer } from "@/components/admin/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAdminOffer,
  deleteAdminOffer,
  listAdminOffers,
  updateAdminOffer,
  type AdminOffer,
  type AdminOfferDiscountType,
  type AdminOfferScope,
  type OfferInput,
} from "@/lib/admin-orders";
import { cn, formatPrice } from "@/lib/utils";

type StatusFilter = "all" | "active" | "paused" | "expired";

/** Coupons lapsing within this many days get the amber countdown. */
const EXPIRY_WARNING_DAYS = 30;

function statusOf(offer: AdminOffer, today: string): Exclude<StatusFilter, "all"> {
  if (today && offer.validUntil < today) return "expired";
  return offer.active ? "active" : "paused";
}

function discountLabel(offer: AdminOffer): string {
  if (offer.discountType === "percentage") return `${offer.discountValue}% off`;
  if (offer.discountType === "flat") return `${formatPrice(offer.discountValue)} off`;
  return "Free item";
}

export function OffersView() {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [editing, setEditing] = React.useState<AdminOffer | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  /** Resolved after mount so expiry is judged in the operator's timezone. */
  const [today, setToday] = React.useState("");

  React.useEffect(() => setToday(todayIso()), []);

  const load = React.useCallback((signal: AbortSignal) => listAdminOffers(signal), []);
  const offers = useAdminQuery(load);

  const [items, setItems] = React.useState<AdminOffer[]>([]);
  React.useEffect(() => setItems(offers.data ?? []), [offers.data]);

  const counts = React.useMemo(() => {
    const map = new Map<StatusFilter, number>([["all", items.length]]);
    for (const offer of items) {
      const status = statusOf(offer, today);
      map.set(status, (map.get(status) ?? 0) + 1);
    }
    return map;
  }, [items, today]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((offer) => (filter === "all" ? true : statusOf(offer, today) === filter))
      .filter((offer) =>
        needle
          ? offer.code.toLowerCase().includes(needle) ||
            offer.title.toLowerCase().includes(needle)
          : true,
      );
  }, [items, filter, query, today]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 1600);
    } catch {
      // Clipboard access can be denied — the code is visible on the card anyway.
      setCopiedCode(null);
    }
  }

  async function toggleActive(offer: AdminOffer, active: boolean) {
    const previous = items;
    setActionError(null);
    setItems((current) =>
      current.map((entry) => (entry.id === offer.id ? { ...entry, active } : entry)),
    );

    const result = await updateAdminOffer(offer.id, { active });
    if (!result.ok) {
      setItems(previous);
      setActionError(`Could not update ${offer.code} — ${result.message}`);
    }
  }

  async function save(input: OfferInput, existing: AdminOffer | null) {
    setActionError(null);
    const result = existing
      ? await updateAdminOffer(existing.id, input)
      : await createAdminOffer(input);

    if (!result.ok) {
      setActionError(
        `Could not ${existing ? "save" : "create"} ${input.code} — ${result.message}`,
      );
      return;
    }
    // Re-read rather than splice: `active` is derived from what the server
    // considers live, so only the server can answer it authoritatively.
    offers.reload();
  }

  async function remove(id: string) {
    const previous = items;
    setActionError(null);
    setItems((current) => current.filter((offer) => offer.id !== id));

    const result = await deleteAdminOffer(id);
    if (!result.ok) {
      setItems(previous);
      setActionError(`Could not delete that coupon — ${result.message}`);
    }
  }

  const deleteTarget = deleteId ? items.find((offer) => offer.id === deleteId) : undefined;
  const expiringSoon = today
    ? items.filter((offer) => {
        const left = daysBetween(today, offer.validUntil);
        return left >= 0 && left <= EXPIRY_WARNING_DAYS;
      }).length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Growth"
        title="Offers & coupons"
        description="Every code the storefront will accept at checkout."
        actions={
          <>
            <Button variant="outline" size="md" onClick={offers.reload} disabled={offers.loading}>
              <RefreshCw />
              Refresh
            </Button>
            <Button size="md" onClick={() => setCreating(true)}>
              <Plus />
              Create coupon
            </Button>
          </>
        }
      />

      {offers.failure && <ApiErrorNotice failure={offers.failure} onRetry={offers.reload} />}

      <div role="status" aria-live="polite">
        {actionError && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Live coupons"
          value={counts.get("active") ?? 0}
          hint="accepted at checkout right now"
        />
        <StatCard label="Total coupons" value={items.length} hint="including paused and expired" />
        <StatCard
          label="Expiring in 30 days"
          value={expiringSoon}
          hint="extend or replace before they lapse"
        />
        <StatCard
          label="Expired"
          value={counts.get("expired") ?? 0}
          hint="past their valid-until date"
        />
      </div>

      <Toolbar>
        <SearchField
          label="Search coupons by code or title"
          placeholder="Search coupons…"
          value={query}
          onValueChange={setQuery}
        />
        <ToolbarSpacer />
        <FilterChips
          label="Filter coupons by status"
          value={filter}
          onValueChange={setFilter}
          options={(["all", "active", "paused", "expired"] as StatusFilter[]).map((value) => ({
            value,
            label: value === "all" ? "All" : value[0].toUpperCase() + value.slice(1),
            count: counts.get(value) ?? 0,
          }))}
        />
      </Toolbar>

      {offers.loading && !offers.data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <LoadingBlock key={index} className="h-80" label="Loading coupons" />
          ))}
        </div>
      ) : offers.failure ? null : filtered.length === 0 ? (
        <EmptyState
          icon={BadgePercent}
          title={items.length === 0 ? "No coupons yet" : "No coupons match"}
          description={
            items.length === 0
              ? "Nothing is on offer at the moment. Create a code to run a promotion."
              : "Try another status, or create a fresh code."
          }
          action={<Button onClick={() => setCreating(true)}>Create coupon</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((offer) => {
            const status = statusOf(offer, today);
            const daysLeft = today ? daysBetween(today, offer.validUntil) : -1;

            return (
              <Card
                key={offer.id}
                className={cn(
                  "flex flex-col overflow-hidden rounded-3xl transition-shadow duration-300 hover:shadow-lift",
                  status === "expired" && "opacity-70",
                )}
              >
                {/* Ticket header with the perforated edge the storefront uses. */}
                <div className="relative bg-gradient-to-br from-brand-500 to-brand-400 p-5 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/70">
                        {discountLabel(offer)}
                      </p>
                      <p className="mt-1 font-display text-2xl leading-tight">{offer.code}</p>
                    </div>
                    <Button
                      variant="glass"
                      size="icon-sm"
                      aria-label={`Copy coupon code ${offer.code}`}
                      onClick={() => void copy(offer.code)}
                      className="shrink-0 border-white/30 bg-white/20 text-white hover:bg-white/30"
                    >
                      {copiedCode === offer.code ? <Check /> : <Copy />}
                    </Button>
                  </div>

                  <span
                    aria-hidden
                    className="absolute -bottom-3 -left-3 size-6 rounded-full bg-surface-muted"
                  />
                  <span
                    aria-hidden
                    className="absolute -bottom-3 -right-3 size-6 rounded-full bg-surface-muted"
                  />
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        tone={
                          status === "active"
                            ? "success"
                            : status === "paused"
                              ? "progress"
                              : "muted"
                        }
                        label={
                          status === "expired"
                            ? "Expired"
                            : status === "paused"
                              ? "Paused"
                              : "Live"
                        }
                      />
                      {offer.featured && (
                        <Badge variant="default" size="sm">
                          Featured
                        </Badge>
                      )}
                      <Badge variant="muted" size="sm" className="capitalize">
                        {offer.appliesTo}
                      </Badge>
                    </div>

                    <h3 className="mt-3 font-display text-base leading-snug text-ink-900">
                      {offer.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
                      {offer.description}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-ink-400">Minimum order</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-ink-900">
                        {formatPrice(offer.minOrder)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-400">Valid until</dt>
                      <dd className="mt-0.5 font-medium text-ink-900">
                        {formatDay(offer.validUntil)}
                        {daysLeft >= 0 && daysLeft <= EXPIRY_WARNING_DAYS && (
                          <span className="ml-1 text-amber-600">({daysLeft}d)</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-400">Maximum discount</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-ink-900">
                        {offer.maxDiscount ? formatPrice(offer.maxDiscount) : "No cap"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-400">Redemptions</dt>
                      {/* The API does not report a per-coupon usage counter, and
                          a made-up number here would be read as a real one. */}
                      <dd className="mt-0.5 font-medium text-ink-400">Not tracked</dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-100 pt-4">
                    <span className="flex items-center gap-2.5 text-sm text-ink-600">
                      <Switch
                        checked={offer.active && status !== "expired"}
                        disabled={status === "expired"}
                        onCheckedChange={(checked) => void toggleActive(offer, checked)}
                        aria-label={`Activate coupon ${offer.code}`}
                      />
                      {offer.active && status !== "expired" ? "Active" : "Inactive"}
                    </span>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit coupon ${offer.code}`}
                        onClick={() => setEditing(offer)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete coupon ${offer.code}`}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setDeleteId(offer.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <OfferFormDialog
        open={creating || editing !== null}
        offer={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSave={(input) => void save(input, editing)}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={`Delete ${deleteTarget?.code ?? "this coupon"}?`}
        description="Customers who already applied the code keep their discount; new attempts will be rejected at checkout."
        confirmLabel="Delete coupon"
        icon={Trash2}
        onConfirm={() => deleteId && void remove(deleteId)}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Create / edit form                                                        */
/* ========================================================================== */

const BLANK: OfferInput = {
  code: "",
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: 10,
  minOrder: 199,
  maxDiscount: 150,
  validUntil: "",
  terms: [],
  imageId: "offer-1",
  featured: false,
  appliesTo: "order",
  active: true,
};

function toInput(offer: AdminOffer): OfferInput {
  return {
    code: offer.code,
    title: offer.title,
    description: offer.description,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    minOrder: offer.minOrder,
    maxDiscount: offer.maxDiscount,
    validUntil: offer.validUntil,
    terms: offer.terms,
    imageId: offer.imageId,
    featured: offer.featured,
    appliesTo: offer.appliesTo,
    active: offer.active,
  };
}

function OfferFormDialog({
  open,
  offer,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  offer: AdminOffer | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: OfferInput) => void;
}) {
  const [draft, setDraft] = React.useState<OfferInput>(BLANK);

  React.useEffect(() => {
    if (!open) return;
    // A new coupon needs a valid-until date, and "a year out" is a starting
    // point the operator overwrites — never a value that is saved unseen.
    const today = todayIso();
    setDraft(offer ? toInput(offer) : { ...BLANK, validUntil: `${Number(today.slice(0, 4)) + 1}${today.slice(4)}` });
  }, [open, offer]);

  function update<K extends keyof OfferInput>(key: K, value: OfferInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onSave({ ...draft, code: draft.code.toUpperCase().replace(/\s/g, "") });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={submit}>
          <DialogHeader className="border-b border-ink-100 pb-5">
            <DialogTitle>{offer ? `Edit ${offer.code}` : "Create a coupon"}</DialogTitle>
            <DialogDescription>
              Codes are matched case-insensitively at checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 p-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-code">Coupon code</Label>
              <Input
                id="offer-code"
                required
                value={draft.code}
                onChange={(event) => update("code", event.target.value.toUpperCase())}
                placeholder="SECRET50"
                className="font-mono uppercase"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-applies">Applies to</Label>
              <Select
                value={draft.appliesTo}
                onValueChange={(value) => update("appliesTo", value as AdminOfferScope)}
              >
                <SelectTrigger id="offer-applies">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Orders</SelectItem>
                  <SelectItem value="subscription">Tiffin subscriptions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="offer-title">Title</Label>
              <Input
                id="offer-title"
                required
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Flat 50% off your first order"
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="offer-description">Description</Label>
              <Textarea
                id="offer-description"
                required
                value={draft.description}
                onChange={(event) => update("description", event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-type">Discount type</Label>
              <Select
                value={draft.discountType}
                onValueChange={(value) =>
                  update("discountType", value as AdminOfferDiscountType)
                }
              >
                <SelectTrigger id="offer-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="flat">Flat amount</SelectItem>
                  <SelectItem value="freebie">Free item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-value">
                {draft.discountType === "percentage" ? "Discount (%)" : "Discount (₹)"}
              </Label>
              <Input
                id="offer-value"
                type="number"
                min={0}
                required
                value={draft.discountValue}
                onChange={(event) => update("discountValue", Number(event.target.value))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-min">Minimum order (₹)</Label>
              <Input
                id="offer-min"
                type="number"
                min={0}
                value={draft.minOrder}
                onChange={(event) => update("minOrder", Number(event.target.value))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-max">Maximum discount (₹)</Label>
              <Input
                id="offer-max"
                type="number"
                min={0}
                value={draft.maxDiscount ?? ""}
                onChange={(event) =>
                  update(
                    "maxDiscount",
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-until">Valid until</Label>
              <Input
                id="offer-until"
                type="date"
                required
                value={draft.validUntil}
                onChange={(event) => update("validUntil", event.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-ink-50 p-4">
              <Label htmlFor="offer-featured">Feature on the storefront</Label>
              <Switch
                id="offer-featured"
                checked={draft.featured}
                onCheckedChange={(checked) => update("featured", checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-ink-50 p-4 sm:col-span-2">
              <Label htmlFor="offer-active">Active immediately</Label>
              <Switch
                id="offer-active"
                checked={draft.active}
                onCheckedChange={(checked) => update("active", checked)}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-ink-100 pt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{offer ? "Save changes" : "Create coupon"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
