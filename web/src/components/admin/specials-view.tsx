"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, CalendarDays, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import { ApiErrorNotice, LoadingBlock, useAdminQuery } from "@/components/admin/admin-data";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { todayIso } from "@/components/admin/status-maps";
import { SearchField } from "@/components/admin/toolbar";
import { Badge, VegMark } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FoodImage } from "@/components/ui/food-image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAdminSpecial,
  deleteAdminSpecial,
  listAdminMenuItems,
  listAdminSpecials,
  updateAdminSpecial,
  type AdminMenuItem,
  type AdminSpecial,
} from "@/lib/admin-orders";
import { cn, formatPrice } from "@/lib/utils";

/** The storefront rail shows four cards; eight is the hard ceiling. */
const MAX_SLOTS = 8;
/** How many dish suggestions the picker offers at a time. */
const SUGGESTION_COUNT = 8;

/**
 * One row of the builder.
 *
 * `id` is the server's `DailySpecial` id, or `null` for a slot the operator has
 * added but not published — that distinction is what lets Publish diff the
 * draft against what the database actually holds.
 */
interface SpecialDraft {
  id: string | null;
  itemId: string;
  specialPrice?: number;
  blurb: string;
}

function toDraft(special: AdminSpecial): SpecialDraft {
  return {
    id: special.id,
    itemId: special.item.id,
    specialPrice: special.specialPrice,
    blurb: special.headline ?? "",
  };
}

export function SpecialsView() {
  const [scheduledFor, setScheduledFor] = React.useState("");
  const [today, setToday] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<SpecialDraft[]>([]);
  const [dirty, setDirty] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // "Today" is the operator's day; resolving it during a server render would
  // pick the server's timezone and hydrate wrong.
  React.useEffect(() => {
    const day = todayIso();
    setToday(day);
    setScheduledFor(day);
  }, []);

  const loadSpecials = React.useCallback((signal: AbortSignal) => listAdminSpecials(signal), []);
  const loadMenu = React.useCallback((signal: AbortSignal) => listAdminMenuItems(signal), []);

  const specials = useAdminQuery(loadSpecials);
  const menu = useAdminQuery(loadMenu);

  const itemsById = React.useMemo(
    () => new Map((menu.data ?? []).map((item) => [item.id, item])),
    [menu.data],
  );

  /** What the database currently holds for the selected day. */
  const published = React.useMemo(
    () =>
      (specials.data ?? [])
        .filter((special) => special.date === scheduledFor)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [specials.data, scheduledFor],
  );

  // Changing the day (or a fresh fetch) resets the builder to what is stored.
  React.useEffect(() => {
    setSelected(published.map(toDraft));
    setDirty(false);
  }, [published]);

  const candidates = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const chosen = new Set(selected.map((entry) => entry.itemId));
    return (menu.data ?? [])
      .filter((item) => item.available && !chosen.has(item.id))
      .filter((item) => (needle ? item.name.toLowerCase().includes(needle) : true))
      .slice(0, SUGGESTION_COUNT);
  }, [menu.data, query, selected]);

  function mutate(next: SpecialDraft[]) {
    setSelected(next);
    setDirty(true);
  }

  function add(item: AdminMenuItem) {
    if (selected.length >= MAX_SLOTS) return;
    mutate([...selected, { id: null, itemId: item.id, blurb: "" }]);
  }

  function remove(itemId: string) {
    mutate(selected.filter((entry) => entry.itemId !== itemId));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    mutate(next);
  }

  function update(itemId: string, patch: Partial<SpecialDraft>) {
    mutate(selected.map((entry) => (entry.itemId === itemId ? { ...entry, ...patch } : entry)));
  }

  function discard() {
    setSelected(published.map(toDraft));
    setDirty(false);
    setActionError(null);
  }

  /**
   * Persist the builder as a diff against what is stored for that day.
   *
   * Rows the operator removed are deleted, new rows are created, and rows whose
   * price, blurb or position changed are patched. Anything untouched is left
   * alone so publishing twice is a no-op rather than a churn of writes.
   */
  async function publish() {
    if (!scheduledFor) return;
    setPublishing(true);
    setActionError(null);

    const keptIds = new Set(selected.map((entry) => entry.id).filter(Boolean));
    const failures: string[] = [];

    for (const special of published) {
      if (keptIds.has(special.id)) continue;
      const result = await deleteAdminSpecial(special.id);
      if (!result.ok) failures.push(`remove ${special.item.name}: ${result.message}`);
    }

    for (const [index, entry] of selected.entries()) {
      const item = itemsById.get(entry.itemId);
      const name = item?.name ?? entry.itemId;

      if (entry.id === null) {
        const result = await createAdminSpecial({
          menuItem: entry.itemId,
          date: scheduledFor,
          specialPrice: entry.specialPrice,
          headline: entry.blurb.trim() || undefined,
          sortOrder: index,
        });
        if (!result.ok) failures.push(`add ${name}: ${result.message}`);
        continue;
      }

      const before = published.find((special) => special.id === entry.id);
      const unchanged =
        before &&
        before.sortOrder === index &&
        (before.specialPrice ?? null) === (entry.specialPrice ?? null) &&
        (before.headline ?? "") === entry.blurb;
      if (unchanged) continue;

      const result = await updateAdminSpecial(entry.id, {
        specialPrice: entry.specialPrice ?? null,
        headline: entry.blurb.trim() || null,
        sortOrder: index,
      });
      if (!result.ok) failures.push(`update ${name}: ${result.message}`);
    }

    setPublishing(false);
    setActionError(failures.length > 0 ? `Could not ${failures.join("; ")}` : null);
    if (failures.length === 0) setDirty(false);
    specials.reload();
  }

  const loading = specials.loading && !specials.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merchandising"
        title="Today's Special"
        description="Curate the rail that sits directly under the storefront hero. Order matters — the first card gets roughly half of all taps."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              disabled={!dirty || publishing}
              onClick={discard}
            >
              Discard
            </Button>
            <Button size="md" disabled={!dirty || publishing} onClick={() => void publish()}>
              {publishing && <Loader2 className="animate-spin" />}
              Publish {selected.length} {selected.length === 1 ? "special" : "specials"}
            </Button>
          </>
        }
      />

      {specials.failure && (
        <ApiErrorNotice failure={specials.failure} onRetry={specials.reload} />
      )}
      {menu.failure && <ApiErrorNotice failure={menu.failure} onRetry={menu.reload} />}

      <div role="status" aria-live="polite">
        {actionError && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        {/* ---- Builder --------------------------------------------------- */}
        <div className="flex flex-col gap-6">
          <Card className="rounded-3xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-2">
                <Label htmlFor="special-date" className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-ink-400" aria-hidden />
                  Scheduled for
                </Label>
                <Input
                  id="special-date"
                  type="date"
                  value={scheduledFor}
                  min={today}
                  onChange={(event) => setScheduledFor(event.target.value)}
                  className="w-auto min-w-44"
                />
              </div>

              <p className="text-sm text-ink-500">
                {scheduledFor === today
                  ? "Goes live immediately on publish."
                  : "Queued — it swaps in automatically at 00:00 on that date."}
              </p>
            </div>
          </Card>

          <Card className="rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg text-ink-900">Featured line-up</h2>
              <Badge variant={selected.length >= MAX_SLOTS ? "warning" : "muted"} size="sm">
                {selected.length} / {MAX_SLOTS} slots
              </Badge>
            </div>

            {loading ? (
              <LoadingBlock className="mt-5 h-40" label="Loading the published specials" />
            ) : selected.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                className="mt-5"
                title="No specials picked for this day"
                description="Nothing is curated for that date, so the storefront falls back to its automatic rotation. Add a few dishes below — four is the sweet spot."
              />
            ) : (
              <ol className="mt-5 flex flex-col gap-3">
                {selected.map((entry, index) => {
                  const item = itemsById.get(entry.itemId);
                  if (!item) return null;

                  return (
                    <li
                      key={entry.itemId}
                      className="rounded-2xl border border-ink-200/70 bg-ink-50/40 p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1 pt-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Move ${item.name} up`}
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Move ${item.name} down`}
                            disabled={index === selected.length - 1}
                            onClick={() => move(index, 1)}
                          >
                            <ArrowDown />
                          </Button>
                        </div>

                        <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                          <FoodImage imageId={item.imageId} alt={item.name} sizes="64px" />
                          <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-ink-900/80 text-[10px] font-bold text-white">
                            {index + 1}
                          </span>
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="flex min-w-0 items-center gap-1.5">
                              <VegMark className="size-3.5 shrink-0" />
                              <span className="truncate font-medium text-ink-900">
                                {item.name}
                              </span>
                            </p>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Remove ${item.name} from specials`}
                              className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => remove(entry.itemId)}
                            >
                              <Trash2 />
                            </Button>
                          </div>

                          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
                            <div className="flex flex-col gap-1.5">
                              <Label
                                htmlFor={`special-price-${entry.itemId}`}
                                className="text-xs text-ink-500"
                              >
                                Today&apos;s price
                              </Label>
                              <Input
                                id={`special-price-${entry.itemId}`}
                                type="number"
                                min={1}
                                placeholder={String(item.price)}
                                value={entry.specialPrice ?? ""}
                                onChange={(event) =>
                                  update(entry.itemId, {
                                    specialPrice: event.target.value
                                      ? Number(event.target.value)
                                      : undefined,
                                  })
                                }
                                className="h-10"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <Label
                                htmlFor={`special-blurb-${entry.itemId}`}
                                className="text-xs text-ink-500"
                              >
                                Card blurb
                              </Label>
                              <Input
                                id={`special-blurb-${entry.itemId}`}
                                value={entry.blurb}
                                maxLength={72}
                                placeholder="Why is this special today?"
                                onChange={(event) =>
                                  update(entry.itemId, { blurb: event.target.value })
                                }
                                className="h-10"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <Card className="rounded-3xl p-5 sm:p-6">
            <h2 className="font-display text-lg text-ink-900">Add a dish</h2>
            <p className="mt-1 text-sm text-ink-500">
              Only dishes marked available in the menu can be featured.
            </p>

            <SearchField
              label="Search dishes to feature"
              placeholder="Search the menu…"
              value={query}
              onValueChange={setQuery}
              className="mt-4 lg:max-w-none"
            />

            {menu.loading && !menu.data ? (
              <LoadingBlock className="mt-5 h-24" label="Loading the menu" />
            ) : candidates.length === 0 ? (
              <p className="mt-5 text-sm text-ink-500">
                Nothing else matches — every available dish for that search is already featured.
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {candidates.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => add(item)}
                      disabled={selected.length >= MAX_SLOTS}
                      className="flex w-full items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                        <FoodImage imageId={item.imageId} alt={item.name} sizes="44px" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900">
                          {item.name}
                        </span>
                        <span className="block text-xs tabular-nums text-ink-500">
                          {formatPrice(item.price)}
                          {item.rating > 0 ? ` · ★ ${item.rating.toFixed(1)}` : ""}
                        </span>
                      </span>
                      <Plus className="size-4 shrink-0 text-brand-500" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ---- Storefront preview ---------------------------------------- */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <Card className="overflow-hidden rounded-3xl">
            <div className="border-b border-ink-100 bg-ink-50/60 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
                Storefront preview
              </p>
              <p className="mt-1 text-sm text-ink-500">
                How the rail renders on thesecretkitchen.in
              </p>
            </div>

            <div className="bg-cream p-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                Today&apos;s Special
              </p>
              <h3 className="font-display text-2xl leading-tight text-ink-900">
                Fresh off the tawa
              </h3>

              {selected.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">
                  Nothing curated for this day — the storefront falls back to its automatic
                  rotation of chef specials and bestsellers.
                </p>
              ) : (
                <ul className="mt-5 flex flex-col gap-4">
                  {selected.slice(0, 4).map((entry) => {
                    const item = itemsById.get(entry.itemId);
                    if (!item) return null;
                    const discounted =
                      entry.specialPrice !== undefined && entry.specialPrice < item.price;

                    return (
                      <li
                        key={entry.itemId}
                        className="overflow-hidden rounded-2xl bg-white shadow-soft"
                      >
                        <div className="relative aspect-[16/9] bg-ink-100">
                          <FoodImage
                            imageId={item.imageId}
                            alt={item.name}
                            sizes="(max-width: 1280px) 100vw, 24rem"
                          />
                          {discounted && (
                            <span className="absolute left-3 top-3">
                              <Badge variant="bestseller" size="sm">
                                {Math.round(
                                  ((item.price - (entry.specialPrice ?? item.price)) /
                                    item.price) *
                                    100,
                                )}
                                % off today
                              </Badge>
                            </span>
                          )}
                        </div>

                        <div className="p-4">
                          <p className="flex items-center gap-1.5">
                            <VegMark className="size-3.5" />
                            <span className="font-display text-base text-ink-900">
                              {item.name}
                            </span>
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-500">
                            {entry.blurb || item.description}
                          </p>
                          <p className="mt-3 flex items-baseline gap-2">
                            <span
                              className={cn(
                                "font-semibold tabular-nums",
                                discounted ? "text-brand-600" : "text-ink-900",
                              )}
                            >
                              {formatPrice(entry.specialPrice ?? item.price)}
                            </span>
                            {discounted && (
                              <span className="text-sm tabular-nums text-ink-400 line-through">
                                {formatPrice(item.price)}
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {selected.length > 4 && (
                <p className="mt-4 text-center text-xs text-ink-400">
                  + {selected.length - 4} more in the horizontal rail
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
