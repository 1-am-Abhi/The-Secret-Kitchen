"use client";

import * as React from "react";
import { BadgePercent, Check, Copy, Pencil, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusPill } from "@/components/admin/status-pill";
import { daysBetween, formatDay } from "@/components/admin/status-maps";
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
import { Progress, Switch } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TODAY } from "@/data/admin-mock";
import { offers } from "@/data/offers";
import type { Offer } from "@/types";
import { cn, formatPrice, seededRandom } from "@/lib/utils";

/**
 * Usage figures are not part of the storefront `Offer` shape, so the admin
 * layers them on. They are derived from the coupon code with a seeded hash —
 * stable across renders, and replaced by the API's real counters later.
 */
interface AdminOffer extends Offer {
  active: boolean;
  usageCount: number;
  usageLimit: number;
  revenueInfluenced: number;
}

function decorate(offer: Offer): AdminOffer {
  const usageLimit = 200 + Math.floor(seededRandom(`${offer.code}-limit`) * 800);
  const usageCount = Math.floor(seededRandom(offer.code) * usageLimit);
  return {
    ...offer,
    active: offer.validUntil >= TODAY,
    usageCount,
    usageLimit,
    revenueInfluenced: usageCount * (offer.minOrder + 120),
  };
}

type StatusFilter = "all" | "active" | "paused" | "expired";

function statusOf(offer: AdminOffer): Exclude<StatusFilter, "all"> {
  if (offer.validUntil < TODAY) return "expired";
  return offer.active ? "active" : "paused";
}

function discountLabel(offer: Offer): string {
  if (offer.discountType === "percentage") return `${offer.discountValue}% off`;
  if (offer.discountType === "flat") return `${formatPrice(offer.discountValue)} off`;
  return "Free item";
}

export function OffersView() {
  const [items, setItems] = React.useState<AdminOffer[]>(() => offers.map(decorate));
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [editing, setEditing] = React.useState<AdminOffer | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    const map = new Map<StatusFilter, number>([["all", items.length]]);
    for (const offer of items) {
      const status = statusOf(offer);
      map.set(status, (map.get(status) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((offer) => (filter === "all" ? true : statusOf(offer) === filter))
      .filter((offer) =>
        needle
          ? offer.code.toLowerCase().includes(needle) ||
            offer.title.toLowerCase().includes(needle)
          : true,
      );
  }, [items, filter, query]);

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

  function toggleActive(id: string, active: boolean) {
    setItems((current) =>
      current.map((offer) => (offer.id === id ? { ...offer, active } : offer)),
    );
  }

  function save(offer: AdminOffer) {
    setItems((current) => {
      const exists = current.some((candidate) => candidate.id === offer.id);
      return exists
        ? current.map((candidate) => (candidate.id === offer.id ? offer : candidate))
        : [offer, ...current];
    });
  }

  const deleteTarget = deleteId ? items.find((offer) => offer.id === deleteId) : undefined;
  const totalRedemptions = items.reduce((sum, offer) => sum + offer.usageCount, 0);
  const influenced = items.reduce((sum, offer) => sum + offer.revenueInfluenced, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Growth"
        title="Offers & coupons"
        description="Every code the storefront will accept at checkout, with live redemption counts."
        actions={
          <Button size="md" onClick={() => setCreating(true)}>
            <Plus />
            Create coupon
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live coupons" value={counts.get("active") ?? 0} change={5.6} />
        <StatCard label="Total redemptions" value={totalRedemptions} change={14.2} />
        <StatCard
          label="Revenue influenced"
          value={influenced}
          format="currency"
          change={11.4}
          hint="Order value on coupon-applied orders"
        />
        <StatCard
          label="Expiring in 30 days"
          value={
            items.filter((offer) => {
              const left = daysBetween(TODAY, offer.validUntil);
              return left >= 0 && left <= 30;
            }).length
          }
          change={0}
          hint="Extend or replace before they lapse"
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
          options={(["all", "active", "paused", "expired"] as StatusFilter[]).map(
            (value) => ({
              value,
              label: value === "all" ? "All" : value[0].toUpperCase() + value.slice(1),
              count: counts.get(value) ?? 0,
            }),
          )}
        />
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BadgePercent}
          title="No coupons match"
          description="Try another status, or create a fresh code."
          action={<Button onClick={() => setCreating(true)}>Create coupon</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((offer) => {
            const status = statusOf(offer);
            const daysLeft = daysBetween(TODAY, offer.validUntil);

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
                      onClick={() => copy(offer.code)}
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
                        {offer.appliesTo ?? "order"}
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
                        {daysLeft >= 0 && daysLeft <= 30 && (
                          <span className="ml-1 text-amber-600">({daysLeft}d)</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between text-xs">
                      <span className="text-ink-400">Redemptions</span>
                      <span className="font-medium tabular-nums text-ink-700">
                        {offer.usageCount} / {offer.usageLimit}
                      </span>
                    </div>
                    <Progress
                      value={(offer.usageCount / offer.usageLimit) * 100}
                      aria-label={`${offer.usageCount} of ${offer.usageLimit} redemptions used`}
                      className="h-1.5"
                    />
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-100 pt-4">
                    <span className="flex items-center gap-2.5 text-sm text-ink-600">
                      <Switch
                        checked={offer.active && status !== "expired"}
                        disabled={status === "expired"}
                        onCheckedChange={(checked) => toggleActive(offer.id, checked)}
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
        onSave={save}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={`Delete ${deleteTarget?.code ?? "this coupon"}?`}
        description="Customers who already applied the code keep their discount; new attempts will be rejected at checkout."
        confirmLabel="Delete coupon"
        icon={Trash2}
        onConfirm={() =>
          deleteId && setItems((current) => current.filter((offer) => offer.id !== deleteId))
        }
      />
    </div>
  );
}

/* ========================================================================== */
/*  Create / edit form                                                        */
/* ========================================================================== */

const BLANK: AdminOffer = {
  id: "",
  code: "",
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: 10,
  minOrder: 199,
  maxDiscount: 150,
  validUntil: "2026-12-31",
  terms: [],
  imageId: "offer-1",
  appliesTo: "order",
  active: true,
  usageCount: 0,
  usageLimit: 500,
  revenueInfluenced: 0,
};

function OfferFormDialog({
  open,
  offer,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  offer: AdminOffer | null;
  onOpenChange: (open: boolean) => void;
  onSave: (offer: AdminOffer) => void;
}) {
  const [draft, setDraft] = React.useState<AdminOffer>(offer ?? BLANK);

  React.useEffect(() => {
    if (open) setDraft(offer ?? BLANK);
  }, [open, offer]);

  function update<K extends keyof AdminOffer>(key: K, value: AdminOffer[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const code = draft.code.toUpperCase().replace(/\s/g, "");
    onSave({ ...draft, code, id: draft.id || `off-${code.toLowerCase()}` });
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
                value={draft.appliesTo ?? "order"}
                onValueChange={(value) =>
                  update("appliesTo", value as NonNullable<Offer["appliesTo"]>)
                }
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
                  update("discountType", value as Offer["discountType"])
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
                value={draft.validUntil}
                onChange={(event) => update("validUntil", event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-limit">Redemption limit</Label>
              <Input
                id="offer-limit"
                type="number"
                min={1}
                value={draft.usageLimit}
                onChange={(event) => update("usageLimit", Number(event.target.value))}
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
