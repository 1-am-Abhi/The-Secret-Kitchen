"use client";

import * as React from "react";
import { Eye, Flame, Plus, Star, Timer } from "lucide-react";
import { toast } from "sonner";

import { DishQuickView } from "@/components/menu/dish-quick-view";
import { Badge, VegMark } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/ui/food-image";
import { useCartStore } from "@/store/cart-store";
import { cn, formatPrice } from "@/lib/utils";
import type { MenuItem } from "@/types";

const SPICE_LABEL: Record<MenuItem["spiceLevel"], { label: string; flames: number }> = {
  mild: { label: "Mild", flames: 1 },
  medium: { label: "Medium", flames: 2 },
  spicy: { label: "Spicy", flames: 3 },
};

/** The primary tag decides which single badge sits on the image. */
function primaryBadge(item: MenuItem) {
  if (item.tags.includes("chef-special")) return { label: "Chef's Special", variant: "new" as const };
  if (item.tags.includes("bestseller")) return { label: "Bestseller", variant: "bestseller" as const };
  if (item.tags.includes("new")) return { label: "New", variant: "new" as const };
  if (item.tags.includes("high-protein")) return { label: "High Protein", variant: "success" as const };
  return null;
}

export function DishCard({
  item,
  className,
  priority = false,
}: {
  item: MenuItem;
  className?: string;
  /** Set on above-the-fold cards so their images are not lazy-loaded. */
  priority?: boolean;
}) {
  const [quickViewOpen, setQuickViewOpen] = React.useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const badge = primaryBadge(item);
  const spice = SPICE_LABEL[item.spiceLevel];
  const discount = item.compareAtPrice
    ? Math.round(((item.compareAtPrice - item.price) / item.compareAtPrice) * 100)
    : 0;

  const handleAdd = () => {
    addItem(item, 1);
    toast.success(`${item.name} added to cart`, {
      description: formatPrice(item.price),
      action: { label: "View cart", onClick: openCart },
    });
  };

  return (
    <>
      <article
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-ink-200/60 bg-white shadow-soft transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-float",
          !item.available && "opacity-60",
          className,
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
          <FoodImage
            imageId={item.imageId}
            alt={`${item.name} — ${item.description.slice(0, 60)}`}
            priority={priority}
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw"
            className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.07]"
          />

          {/* Scrim keeps the badges legible over bright food photography. */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 shadow-soft backdrop-blur">
              <VegMark className="size-3.5" />
              <span className="text-[10px] font-semibold text-fresh-700">VEG</span>
            </span>
            {badge && (
              <Badge variant={badge.variant} size="sm">
                {badge.label}
              </Badge>
            )}
          </div>

          {discount > 0 && (
            <span className="absolute right-3 top-3 rounded-full bg-fresh-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-soft">
              {discount}% OFF
            </span>
          )}

          {/* Quick view reveals on hover; always reachable via keyboard. */}
          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-2 text-xs font-semibold text-ink-800 opacity-0 shadow-lift backdrop-blur transition-all duration-300 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Eye className="size-3.5" />
            Quick view
          </button>

          {!item.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
              <span className="rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white">
                Sold out for today
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg leading-snug text-ink-900">{item.name}</h3>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-fresh-50 px-2 py-1 text-xs font-semibold text-fresh-700">
              <Star className="size-3 fill-current" />
              {item.rating}
            </span>
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">
            {item.description}
          </p>

          <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-ink-400">
            <li className="flex items-center gap-1">
              <Timer className="size-3" />
              {item.prepTime} min
            </li>
            <li className="flex items-center gap-1" title={`${spice.label} spice level`}>
              {Array.from({ length: spice.flames }).map((_, index) => (
                <Flame key={index} className="size-3 text-brand-400" />
              ))}
              <span className="sr-only">{spice.label}</span>
            </li>
            <li>{item.calories} kcal</li>
            {item.protein ? <li>{item.protein}g protein</li> : null}
          </ul>

          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <div className="flex flex-col">
              <span className="text-xs text-ink-400">{item.serves}</span>
              <span className="flex items-baseline gap-2">
                <span className="font-display text-xl font-semibold text-ink-900">
                  {formatPrice(item.price)}
                </span>
                {item.compareAtPrice && (
                  <span className="text-sm text-ink-400 line-through">
                    {formatPrice(item.compareAtPrice)}
                  </span>
                )}
              </span>
            </div>

            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!item.available}
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus />
              Add
            </Button>
          </div>
        </div>
      </article>

      <DishQuickView item={item} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
    </>
  );
}
