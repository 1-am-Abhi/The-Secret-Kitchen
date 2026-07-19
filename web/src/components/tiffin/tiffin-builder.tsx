"use client";

import * as React from "react";
import {
  Carrot,
  ChefHat,
  Check,
  CookingPot,
  Flame,
  IceCreamCone,
  RotateCcw,
  Salad,
  ShoppingBag,
  Soup,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { motion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  componentsByGroup,
  defaultBuildSelection,
  summariseBuild,
  tiffinComponents,
  validateBuild,
} from "@/data/tiffin";
import { useCartStore } from "@/store/cart-store";
import { cn, formatPrice } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  CookingPot,
  Wheat,
  Soup,
  Carrot,
  ChefHat,
  IceCreamCone,
  Salad,
};

/**
 * Build Your Tiffin.
 *
 * A live configurator: pick components group by group and the price, calories
 * and protein recompute instantly. Bulk discounts kick in as the box grows,
 * which is both honest (bigger boxes really are cheaper to pack) and a strong
 * nudge toward a fuller meal.
 *
 * Group min/max rules are enforced in the data layer (`validateBuild`) rather
 * than here, so the same rules apply if the API ever prices a build server-side.
 */
export function TiffinBuilder() {
  const [selected, setSelected] = React.useState<string[]>(defaultBuildSelection);
  const addCustomTiffin = useCartStore((state) => state.addCustomTiffin);
  const openCart = useCartStore((state) => state.openCart);

  const summary = summariseBuild(selected);
  const problems = validateBuild(selected);
  const isValid = problems.length === 0;

  const toggle = (id: string, group: string, max: number) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);

      const inGroup = current.filter(
        (value) => tiffinComponents.find((c) => c.id === value)?.group === group,
      );

      // At the group limit, the newest pick replaces the oldest rather than
      // silently failing — far less frustrating than a disabled control.
      if (inGroup.length >= max) {
        return [...current.filter((value) => value !== inGroup[0]), id];
      }
      return [...current, id];
    });
  };

  const handleAddToCart = () => {
    if (!isValid) return;

    const labels = selected
      .map((id) => tiffinComponents.find((component) => component.id === id)?.label)
      .filter((label): label is string => Boolean(label));

    addCustomTiffin({
      itemId: `custom-tiffin-${selected.slice().sort().join("-")}`,
      slug: "build-your-tiffin",
      name: "Custom Tiffin Box",
      price: summary.total,
      imageId: "tiffin-regular",
      quantity: 1,
      componentIds: selected,
      componentLabels: labels,
    });

    toast.success("Custom tiffin added to cart", {
      description: `${summary.itemCount} items · ${formatPrice(summary.total)}`,
      action: { label: "View cart", onClick: openCart },
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      {/* ---- Component picker ---- */}
      <div className="lg:col-span-7 xl:col-span-8">
        <div className="flex flex-col gap-8">
          {componentsByGroup.map((group) => {
            const Icon = ICONS[group.icon] ?? Soup;
            const chosen = selected.filter(
              (id) => tiffinComponents.find((c) => c.id === id)?.group === group.group,
            );

            return (
              <fieldset key={group.group}>
                <legend className="flex w-full items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg text-ink-900">
                        {group.label}
                      </span>
                      {group.min > 0 ? (
                        <Badge variant="muted" size="sm">
                          Required
                        </Badge>
                      ) : (
                        <Badge variant="outline" size="sm">
                          Optional
                        </Badge>
                      )}
                      {group.max > 1 && (
                        <span className="text-xs text-ink-400">
                          pick up to {group.max}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-ink-400">{group.description}</span>
                  </span>
                  {chosen.length > 0 && (
                    <span className="flex size-6 items-center justify-center rounded-full bg-fresh-500 text-[11px] font-bold text-white">
                      {chosen.length}
                    </span>
                  )}
                </legend>

                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {group.options.map((option) => {
                    const active = selected.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggle(option.id, group.group, group.max)}
                        aria-pressed={active}
                        className={cn(
                          "group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-300",
                          active
                            ? "border-brand-400 bg-brand-50 shadow-soft"
                            : "border-ink-200 bg-white hover:border-brand-200 hover:bg-brand-50/40",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                            active
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-ink-300 group-hover:border-brand-300",
                          )}
                        >
                          {active && <Check className="size-3" strokeWidth={3} />}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-semibold text-ink-900">
                              {option.label}
                            </span>
                            <span className="shrink-0 text-sm font-semibold text-brand-600">
                              +{formatPrice(option.price)}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {option.description}
                          </span>
                          <span className="mt-1 block text-[11px] text-ink-400">
                            {option.calories} kcal · {option.protein}g protein
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
      </div>

      {/* ---- Live summary ---- */}
      <div className="lg:col-span-5 xl:col-span-4">
        <div className="sticky top-28 rounded-3xl border border-ink-200/70 bg-white p-6 shadow-lift">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-xl text-ink-900">Your tiffin</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(defaultBuildSelection())}
            >
              <RotateCcw />
              Reset
            </Button>
          </div>

          {summary.itemCount === 0 ? (
            <p className="mt-6 rounded-2xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
              Start picking components and your box will build up here.
            </p>
          ) : (
            <ul className="mt-5 flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
              {selected.map((id) => {
                const component = tiffinComponents.find((entry) => entry.id === id);
                if (!component) return null;
                return (
                  <motion.li
                    key={id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-ink-600">{component.label}</span>
                    <span className="shrink-0 font-medium text-ink-800">
                      {formatPrice(component.price)}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          )}

          {/* Nutrition */}
          <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-ink-100 pt-5">
            {[
              { label: "Items", value: String(summary.itemCount) },
              { label: "Calories", value: `${summary.calories}` },
              { label: "Protein", value: `${summary.protein}g` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-ink-50 py-2.5 text-center">
                <dt className="text-[10px] uppercase tracking-wide text-ink-400">
                  {stat.label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink-800">{stat.value}</dd>
              </div>
            ))}
          </dl>

          {/* Pricing */}
          <dl className="mt-5 flex flex-col gap-2 border-t border-ink-100 pt-5 text-sm">
            <div className="flex justify-between text-ink-500">
              <dt>Subtotal</dt>
              <dd>{formatPrice(summary.subtotal)}</dd>
            </div>
            {summary.discount > 0 && (
              <div className="flex justify-between text-fresh-600">
                <dt>Bulk discount ({Math.round(summary.discountRate * 100)}%)</dt>
                <dd>−{formatPrice(summary.discount)}</dd>
              </div>
            )}
            <div className="mt-1 flex items-baseline justify-between border-t border-ink-100 pt-3">
              <dt className="font-semibold text-ink-900">Total</dt>
              <dd className="font-display text-2xl font-semibold text-ink-900">
                {formatPrice(summary.total)}
              </dd>
            </div>
          </dl>

          {/* Next discount nudge */}
          {summary.discountRate < 0.12 && summary.subtotal > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-50 px-3.5 py-2.5 text-xs text-brand-700">
              <Flame className="mt-0.5 size-3.5 shrink-0" />
              {summary.subtotal < 200
                ? `Add ${formatPrice(200 - summary.subtotal)} more to unlock 5% off`
                : summary.subtotal < 300
                  ? `Add ${formatPrice(300 - summary.subtotal)} more to unlock 8% off`
                  : `Add ${formatPrice(400 - summary.subtotal)} more to unlock 12% off`}
            </p>
          )}

          {/* Validation */}
          {problems.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1" role="alert">
              {problems.map((problem) => (
                <li key={problem} className="text-xs text-destructive">
                  · {problem}
                </li>
              ))}
            </ul>
          )}

          <Button
            size="lg"
            className="mt-5 w-full"
            disabled={!isValid}
            onClick={handleAddToCart}
          >
            <ShoppingBag />
            Add tiffin · {formatPrice(summary.total)}
          </Button>

          <p className="mt-3 text-center text-xs text-ink-400">
            Order once, or tell us at checkout to repeat it daily.
          </p>
        </div>
      </div>
    </div>
  );
}
