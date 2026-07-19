"use client";

import * as React from "react";
import { Flame, Minus, Plus, ShoppingBag, Star, Timer, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge, VegMark } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/form-controls";
import { FoodImage } from "@/components/ui/food-image";
import { Textarea } from "@/components/ui/input";
import { useCartStore } from "@/store/cart-store";
import { cn, formatPrice } from "@/lib/utils";
import type { MenuItem } from "@/types";

/**
 * Full dish detail in a modal — lets customers configure add-ons, quantity and
 * kitchen notes without leaving the menu grid they were browsing.
 */
export function DishQuickView({
  item,
  open,
  onOpenChange,
}: {
  item: MenuItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [quantity, setQuantity] = React.useState(1);
  const [selectedAddOns, setSelectedAddOns] = React.useState<string[]>([]);
  const [note, setNote] = React.useState("");

  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  // Reset the configuration each time the dialog is reopened.
  React.useEffect(() => {
    if (open) {
      setQuantity(1);
      setSelectedAddOns([]);
      setNote("");
    }
  }, [open]);

  const addOnTotal = (item.addOns ?? [])
    .filter((addOn) => selectedAddOns.includes(addOn.id))
    .reduce((sum, addOn) => sum + addOn.price, 0);

  const lineTotal = (item.price + addOnTotal) * quantity;

  const toggleAddOn = (id: string) =>
    setSelectedAddOns((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  const handleAdd = () => {
    addItem(item, quantity, selectedAddOns, note.trim() || undefined);
    onOpenChange(false);
    toast.success(`${quantity} × ${item.name} added`, {
      description: formatPrice(lineTotal),
      action: { label: "View cart", onClick: openCart },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-3xl bg-ink-100">
          <FoodImage
            imageId={item.imageId}
            alt={item.name}
            sizes="(max-width: 768px) 100vw, 42rem"
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 shadow-soft">
              <VegMark className="size-3.5" />
              <span className="text-[10px] font-semibold text-fresh-700">PURE VEG</span>
            </span>
            {item.isJain && (
              <Badge variant="success" size="sm">
                Jain available
              </Badge>
            )}
            {item.tags.includes("bestseller") && (
              <Badge variant="bestseller" size="sm">
                Bestseller
              </Badge>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>{item.name}</DialogTitle>
              <div className="mt-2 flex items-center gap-3 text-sm text-ink-500">
                <span className="flex items-center gap-1 font-medium text-fresh-700">
                  <Star className="size-3.5 fill-current" />
                  {item.rating}
                  <span className="font-normal text-ink-400">({item.ratingCount})</span>
                </span>
                <span className="flex items-center gap-1">
                  <Timer className="size-3.5" />
                  {item.prepTime} min
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {item.serves}
                </span>
              </div>
            </div>
            <span className="shrink-0 font-display text-2xl font-semibold text-ink-900">
              {formatPrice(item.price)}
            </span>
          </div>

          <DialogDescription className="mt-4 text-[15px] leading-relaxed text-ink-600">
            {item.description}
          </DialogDescription>

          {/* Nutrition strip */}
          <dl className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: "Calories", value: `${item.calories} kcal` },
              { label: "Protein", value: item.protein ? `${item.protein} g` : "—" },
              {
                label: "Spice",
                value: item.spiceLevel.charAt(0).toUpperCase() + item.spiceLevel.slice(1),
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-ink-50 px-4 py-3 text-center">
                <dt className="text-[11px] uppercase tracking-wide text-ink-400">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink-800">{stat.value}</dd>
              </div>
            ))}
          </dl>

          {item.addOns && item.addOns.length > 0 && (
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-ink-800">
                Make it yours
                <span className="ml-2 font-normal text-ink-400">Optional</span>
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {item.addOns.map((addOn) => {
                  const checked = selectedAddOns.includes(addOn.id);
                  return (
                    <label
                      key={addOn.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-200",
                        checked
                          ? "border-brand-400 bg-brand-50"
                          : "border-ink-200 hover:border-ink-300",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleAddOn(addOn.id)}
                        />
                        <span className="text-sm text-ink-700">{addOn.label}</span>
                      </span>
                      <span className="text-sm font-semibold text-ink-800">
                        +{formatPrice(addOn.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-6">
            <label
              htmlFor={`note-${item.id}`}
              className="text-sm font-semibold text-ink-800"
            >
              Note for the kitchen
            </label>
            <Textarea
              id={`note-${item.id}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Less spicy, no onion, extra gravy…"
              maxLength={200}
              className="mt-2 min-h-20"
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center justify-between gap-2 rounded-full border border-ink-200 p-1.5 sm:justify-start">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus />
              </Button>
              <span
                className="min-w-8 text-center font-semibold text-ink-900"
                aria-live="polite"
              >
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                disabled={quantity >= 20}
                aria-label="Increase quantity"
              >
                <Plus />
              </Button>
            </div>

            <Button
              size="lg"
              className="flex-1"
              onClick={handleAdd}
              disabled={!item.available}
            >
              <ShoppingBag />
              Add to cart · {formatPrice(lineTotal)}
            </Button>
          </div>

          {item.spiceLevel === "spicy" && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-brand-600">
              <Flame className="size-3.5" />
              This one is genuinely spicy — ask for mild in the note if you prefer.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
