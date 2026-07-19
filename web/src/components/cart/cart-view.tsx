"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { DishCard } from "@/components/menu/dish-card";
import { Reveal } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/ui/food-image";
import { Progress } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { getBestSellers } from "@/data/menu";
import { getFeaturedOffers } from "@/data/offers";
import { formatPrice } from "@/lib/utils";
import { lineKey, selectTotals, useCartStore } from "@/store/cart-store";

/**
 * Full cart page.
 *
 * Deliberately more generous than the drawer: line-level notes, coupon entry
 * with live validation, an itemised bill and a "you might also like" rail that
 * recovers otherwise-abandoned sessions.
 */
export function CartView() {
  const [mounted, setMounted] = React.useState(false);
  const [couponInput, setCouponInput] = React.useState("");

  const lines = useCartStore((state) => state.lines);
  const couponCode = useCartStore((state) => state.couponCode);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeLine = useCartStore((state) => state.removeLine);
  const applyCouponCode = useCartStore((state) => state.applyCouponCode);
  const clearCoupon = useCartStore((state) => state.clearCoupon);
  const clearCart = useCartStore((state) => state.clearCart);

  // The store hydrates from localStorage, so the first paint must match the
  // server render — show a skeleton until then.
  React.useEffect(() => setMounted(true), []);

  const totals = selectTotals(lines, couponCode);
  const { freeDeliveryAbove, minimumOrder } = siteConfig.commerce;
  const belowMinimum = totals.subtotal > 0 && totals.subtotal < minimumOrder;

  const handleApplyCoupon = (event: React.FormEvent) => {
    event.preventDefault();
    const result = applyCouponCode(couponInput);
    if (result.ok) {
      toast.success(result.message);
      setCouponInput("");
    } else {
      toast.error(result.message);
    }
  };

  if (!mounted) return <CartSkeleton />;

  if (lines.length === 0) return <EmptyCart />;

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      {/* ---- Lines ---- */}
      <div className="lg:col-span-7 xl:col-span-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl text-ink-900">
            {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}
          </h2>
          <Button variant="ghost" size="sm" onClick={clearCart}>
            <Trash2 />
            Clear cart
          </Button>
        </div>

        {totals.freeDeliveryShortfall > 0 && (
          <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 p-5">
            <p className="flex items-center gap-2 text-sm text-brand-700">
              <Truck className="size-4 shrink-0" />
              You&apos;re <strong>{formatPrice(totals.freeDeliveryShortfall)}</strong> away
              from free delivery
            </p>
            <Progress
              value={(totals.subtotal / freeDeliveryAbove) * 100}
              className="mt-3 bg-brand-100"
            />
          </div>
        )}

        <ul className="mt-6 flex flex-col gap-4">
          {lines.map((line) => {
            const key = lineKey(line);
            return (
              <li
                key={key}
                className="flex gap-4 rounded-3xl border border-ink-200/70 bg-white p-4 shadow-soft sm:gap-5 sm:p-5"
              >
                <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-ink-100 sm:size-28">
                  <FoodImage imageId={line.imageId} alt={line.name} sizes="112px" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg leading-snug text-ink-900">
                        {line.name}
                      </h3>
                      {"componentLabels" in line && (
                        <p className="mt-1 text-xs leading-relaxed text-ink-500">
                          {line.componentLabels.join(" · ")}
                        </p>
                      )}
                      {line.note && (
                        <p className="mt-1 text-xs italic text-ink-400">
                          Note: {line.note}
                        </p>
                      )}
                      {(line.addOnTotal ?? 0) > 0 && (
                        <Badge variant="muted" size="sm" className="mt-2">
                          + add-ons {formatPrice(line.addOnTotal ?? 0)}
                        </Badge>
                      )}
                    </div>

                    <button
                      onClick={() => removeLine(key)}
                      aria-label={`Remove ${line.name}`}
                      className="shrink-0 rounded-full p-1.5 text-ink-300 transition-colors hover:bg-red-50 hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <div className="flex items-center gap-1 rounded-full border border-ink-200 p-1">
                      <button
                        onClick={() => updateQuantity(key, line.quantity - 1)}
                        aria-label={`Decrease ${line.name} quantity`}
                        className="flex size-8 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold text-ink-900">
                        {line.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(key, line.quantity + 1)}
                        aria-label={`Increase ${line.name} quantity`}
                        className="flex size-8 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>

                    <span className="font-display text-lg font-semibold text-ink-900">
                      {formatPrice((line.price + (line.addOnTotal ?? 0)) * line.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <Button asChild variant="ghost" className="mt-6">
          <Link href="/menu">
            <Plus />
            Add more dishes
          </Link>
        </Button>
      </div>

      {/* ---- Summary ---- */}
      <div className="lg:col-span-5 xl:col-span-4">
        <div className="sticky top-28 flex flex-col gap-4">
          <div className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-lift">
            <h2 className="font-display text-xl text-ink-900">Order summary</h2>

            {/* Coupon */}
            <div className="mt-5">
              {couponCode ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-fresh-200 bg-fresh-50 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-fresh-700">
                    <Tag className="size-4" />
                    {couponCode} applied
                  </span>
                  <button
                    onClick={clearCoupon}
                    aria-label="Remove coupon"
                    className="text-fresh-600 transition-colors hover:text-fresh-700"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <label htmlFor="coupon" className="sr-only">
                    Coupon code
                  </label>
                  <Input
                    id="coupon"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    className="h-11 flex-1 uppercase"
                  />
                  <Button type="submit" variant="secondary" disabled={!couponInput.trim()}>
                    Apply
                  </Button>
                </form>
              )}

              {!couponCode && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {getFeaturedOffers().map((offer) => (
                    <button
                      key={offer.code}
                      onClick={() => setCouponInput(offer.code)}
                      className="rounded-full border border-dashed border-brand-300 px-2.5 py-1 text-[11px] font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                    >
                      {offer.code}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <BillBreakdown totals={totals} couponCode={couponCode} />

            {belowMinimum && (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Minimum order is {formatPrice(minimumOrder)} — add{" "}
                {formatPrice(minimumOrder - totals.subtotal)} more to check out.
              </p>
            )}

            <Button asChild size="lg" className="mt-5 w-full" disabled={belowMinimum}>
              <Link href="/checkout">
                Proceed to checkout
                <ArrowRight />
              </Link>
            </Button>
          </div>

          <p className="px-2 text-center text-xs leading-relaxed text-ink-400">
            Prices include GST and packaging. Free delivery above{" "}
            {formatPrice(freeDeliveryAbove)}.
          </p>
        </div>
      </div>

      {/* ---- Cross-sell ---- */}
      <div className="lg:col-span-12">
        <Reveal>
          <h2 className="mt-6 font-display text-2xl text-ink-900">
            People usually add these too
          </h2>
        </Reveal>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {getBestSellers(4).map((item) => (
            <DishCard key={item.id} item={item} className="h-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Shared itemised bill — used by the cart page and the checkout summary. */
export function BillBreakdown({
  totals,
  couponCode,
}: {
  totals: ReturnType<typeof selectTotals>;
  couponCode: string | null;
}) {
  return (
    <dl className="mt-5 flex flex-col gap-2.5 border-t border-ink-100 pt-5 text-sm">
      <div className="flex justify-between text-ink-500">
        <dt>Item total</dt>
        <dd className="text-ink-700">{formatPrice(totals.subtotal)}</dd>
      </div>

      {totals.discount > 0 && (
        <div className="flex justify-between font-medium text-fresh-600">
          <dt>Discount ({couponCode})</dt>
          <dd>−{formatPrice(totals.discount)}</dd>
        </div>
      )}

      <div className="flex justify-between text-ink-500">
        <dt>Packaging</dt>
        <dd className="text-ink-700">{formatPrice(totals.packagingFee)}</dd>
      </div>

      <div className="flex justify-between text-ink-500">
        <dt>Delivery</dt>
        <dd>
          {totals.deliveryFee === 0 ? (
            <span className="font-semibold text-fresh-600">FREE</span>
          ) : (
            <span className="text-ink-700">{formatPrice(totals.deliveryFee)}</span>
          )}
        </dd>
      </div>

      <div className="flex justify-between text-ink-500">
        <dt>GST (5%)</dt>
        <dd className="text-ink-700">{formatPrice(totals.gst)}</dd>
      </div>

      <div className="mt-2 flex items-baseline justify-between border-t border-ink-100 pt-4">
        <dt className="font-semibold text-ink-900">To pay</dt>
        <dd className="font-display text-2xl font-semibold text-ink-900">
          {formatPrice(totals.total)}
        </dd>
      </div>
    </dl>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-ink-300 bg-ink-50/50 px-8 py-20 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-white shadow-soft">
        <ShoppingBag className="size-9 text-brand-400" />
      </span>
      <div>
        <p className="font-display text-2xl text-ink-900">Your cart is empty</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
          Nothing here yet. The Paneer Butter Masala has 1,893 reviews and a 4.9
          rating — that is a reasonable place to start.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/menu">Browse the menu</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/tiffin">See tiffin plans</Link>
        </Button>
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="flex flex-col gap-4 lg:col-span-7 xl:col-span-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="shimmer h-36 rounded-3xl" />
        ))}
      </div>
      <div className="lg:col-span-5 xl:col-span-4">
        <div className="shimmer h-96 rounded-3xl" />
      </div>
    </div>
  );
}
