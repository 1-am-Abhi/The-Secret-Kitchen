"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flame, Leaf, Search, SlidersHorizontal, Sparkles, Star, X } from "lucide-react";

import { DishCard } from "@/components/menu/dish-card";
import { Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/form-controls";
import { categories, menuItems, priceBounds } from "@/data/menu";
import { cn, formatPrice } from "@/lib/utils";
import type { CategorySlug, MenuItem } from "@/types";

type SortKey = "popular" | "price-asc" | "price-desc" | "rating" | "name";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

const QUICK_FILTERS = [
  { id: "bestseller", label: "Bestsellers", icon: Star },
  { id: "chef-special", label: "Chef's Special", icon: Sparkles },
  { id: "high-protein", label: "High protein", icon: Flame },
  { id: "healthy", label: "Light & healthy", icon: Leaf },
] as const;

const PRICE_BANDS = [
  { id: "all", label: "Any price", min: 0, max: Infinity },
  { id: "under-100", label: "Under ₹100", min: 0, max: 99 },
  { id: "100-200", label: "₹100 – ₹200", min: 100, max: 200 },
  { id: "over-200", label: "Above ₹200", min: 201, max: Infinity },
] as const;

/**
 * Menu browser.
 *
 * All filtering happens client-side against the bundled catalogue — 58 items is
 * far too small to justify a network round trip, and instant filtering feels
 * dramatically better than a spinner on every keystroke.
 *
 * The active category is mirrored into the URL so a filtered view is
 * shareable and the browser back button behaves as users expect.
 */
export function MenuBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get("category") as CategorySlug | null;
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = React.useState(initialQuery);
  const [category, setCategory] = React.useState<CategorySlug | "all">(
    initialCategory ?? "all",
  );
  const [sort, setSort] = React.useState<SortKey>("popular");
  const [priceBand, setPriceBand] = React.useState<(typeof PRICE_BANDS)[number]["id"]>("all");
  const [activeTags, setActiveTags] = React.useState<string[]>([]);
  const [jainOnly, setJainOnly] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);

  // Keep the URL in sync so a filtered menu can be shared or bookmarked.
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (query.trim()) params.set("q", query.trim());
    const next = params.toString();
    router.replace(next ? `/menu?${next}` : "/menu", { scroll: false });
  }, [category, query, router]);

  const toggleTag = (tag: string) =>
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    );

  const resetAll = () => {
    setQuery("");
    setCategory("all");
    setSort("popular");
    setPriceBand("all");
    setActiveTags([]);
    setJainOnly(false);
  };

  const results = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const band = PRICE_BANDS.find((entry) => entry.id === priceBand)!;

    const filtered = menuItems.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (item.price < band.min || item.price > band.max) return false;
      if (jainOnly && !item.isJain) return false;
      // Every active quick filter must match — narrowing, not widening.
      if (activeTags.length && !activeTags.every((tag) => item.tags.includes(tag as never)))
        return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle) ||
        item.category.includes(needle)
      );
    });

    return sortItems(filtered, sort);
  }, [query, category, priceBand, activeTags, jainOnly, sort]);

  const activeFilterCount =
    activeTags.length + (priceBand !== "all" ? 1 : 0) + (jainOnly ? 1 : 0);

  return (
    <div>
      {/* ---- Sticky control bar ---- */}
      <div className="sticky top-20 z-30 -mx-5 border-y border-ink-200/70 bg-white/85 px-5 py-4 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:top-24">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <label htmlFor="menu-search" className="sr-only">
              Search the menu
            </label>
            <Input
              id="menu-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search dishes — try 'paneer', 'maggi' or 'high protein'"
              className="pl-11"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-ink-100 text-ink-500 transition-colors hover:bg-ink-200"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger className="w-44 shrink-0" aria-label="Sort dishes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters((open) => !open)}
              aria-expanded={showFilters}
              className="shrink-0"
            >
              <SlidersHorizontal />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Category rail */}
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          <CategoryChip
            active={category === "all"}
            onClick={() => setCategory("all")}
            label="All dishes"
            count={menuItems.length}
          />
          {categories.map((entry) => (
            <CategoryChip
              key={entry.slug}
              active={category === entry.slug}
              onClick={() => setCategory(entry.slug)}
              label={entry.name}
              count={menuItems.filter((item) => item.category === entry.slug).length}
            />
          ))}
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="mt-4 grid gap-5 rounded-3xl border border-ink-200/70 bg-ink-50/60 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Quick filters
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_FILTERS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => toggleTag(id)}
                    aria-pressed={activeTags.includes(id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all",
                      activeTags.includes(id)
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-ink-200 bg-white text-ink-600 hover:border-brand-300",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Price ({formatPrice(priceBounds.min)} – {formatPrice(priceBounds.max)})
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRICE_BANDS.map((band) => (
                  <button
                    key={band.id}
                    onClick={() => setPriceBand(band.id)}
                    aria-pressed={priceBand === band.id}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-xs font-medium transition-all",
                      priceBand === band.id
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-ink-200 bg-white text-ink-600 hover:border-brand-300",
                    )}
                  >
                    {band.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col justify-between gap-4">
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-ink-800">
                    Jain friendly only
                  </span>
                  <span className="block text-xs text-ink-400">No onion, no garlic</span>
                </span>
                <Switch checked={jainOnly} onCheckedChange={setJainOnly} />
              </label>

              <Button variant="ghost" size="sm" onClick={resetAll} className="self-start">
                <X />
                Reset all filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Results ---- */}
      <div className="mt-8">
        <p className="text-sm text-ink-500" aria-live="polite">
          Showing <strong className="text-ink-900">{results.length}</strong>{" "}
          {results.length === 1 ? "dish" : "dishes"}
          {category !== "all" && (
            <>
              {" in "}
              <Badge variant="default" size="sm">
                {categories.find((entry) => entry.slug === category)?.name}
              </Badge>
            </>
          )}
        </p>

        {results.length === 0 ? (
          <EmptyResults onReset={resetAll} query={query} />
        ) : (
          <Stagger
            className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            stagger={0.04}
          >
            {results.map((item, index) => (
              <StaggerItem key={item.id} className="h-full">
                <DishCard item={item} priority={index < 4} className="h-full" />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
        active
          ? "border-ink-900 bg-ink-900 text-white"
          : "border-ink-200 bg-white text-ink-600 hover:border-ink-400 hover:text-ink-900",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px]",
          active ? "bg-white/20" : "bg-ink-100 text-ink-500",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyResults({ onReset, query }: { onReset: () => void; query: string }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-ink-300 bg-ink-50/50 px-8 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-white shadow-soft">
        <Search className="size-7 text-ink-400" />
      </span>
      <div>
        <p className="font-display text-xl text-ink-900">
          {query ? `Nothing matches "${query}"` : "No dishes match those filters"}
        </p>
        <p className="mt-1.5 text-sm text-ink-500">
          Try a different spelling, or clear the filters to see the full menu.
        </p>
      </div>
      <Button onClick={onReset} variant="outline">
        Clear filters
      </Button>
    </div>
  );
}

/** Sorting lives outside the component so it stays pure and easily testable. */
function sortItems(items: MenuItem[], sort: SortKey): MenuItem[] {
  const sorted = [...items];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "popular":
    default:
      // Popularity blends rating with review volume so a lone 5★ does not
      // outrank a dish with a thousand 4.8★ reviews.
      return sorted.sort(
        (a, b) => b.rating * Math.log10(b.ratingCount + 10) - a.rating * Math.log10(a.ratingCount + 10),
      );
  }
}
