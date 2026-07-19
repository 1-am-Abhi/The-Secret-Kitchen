"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/ui/food-image";
import { Progress } from "@/components/ui/form-controls";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/utils";
import { lineKey, selectTotals, useCartStore } from "@/store/cart-store";

/**
 * Slide-out cart. Opened from the navbar badge or after adding an item, so a
 * customer can review and check out without losing their place in the menu.
 */
export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const lines = useCartStore((state) => state.lines);
  const couponCode = useCartStore((state) => state.couponCode);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeLine = useCartStore((state) => state.removeLine);

  const totals = selectTotals(lines, couponCode);
  const { freeDeliveryAbove } = siteConfig.commerce;
  const progress = Math.min(100, (totals.subtotal / freeDeliveryAbove) * 100);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="p-0">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-brand-500" />
            Your cart
            {totals.itemCount > 0 && (
              <span className="text-sm font-normal text-ink-400">
                ({totals.itemCount} {totals.itemCount === 1 ? "item" : "items"})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <EmptyCart onBrowse={closeCart} />
        ) : (
          <>
            {/* Free-delivery nudge */}
            {totals.freeDeliveryShortfall > 0 && (
              <div className="mx-6 rounded-2xl bg-brand-50 p-4">
                <p className="flex items-center gap-2 text-sm text-brand-700">
                  <Truck className="size-4 shrink-0" />
                  Add{" "}
                  <strong>{formatPrice(totals.freeDeliveryShortfall)}</strong> more for
                  free delivery
                </p>
                <Progress value={progress} className="mt-3 bg-brand-100" />
              </div>
            )}

            <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto px-6">
              {lines.map((line) => {
                const key = lineKey(line);
                return (
                  <li key={key} className="flex gap-4 py-4">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-ink-100">
                      <FoodImage imageId={line.imageId} alt={line.name} sizes="80px" />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-ink-900">
                          {line.name}
                        </h3>
                        <button
                          onClick={() => removeLine(key)}
                          aria-label={`Remove ${line.name} from cart`}
                          className="shrink-0 text-ink-300 transition-colors hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      {"componentLabels" in line && (
                        <p className="mt-0.5 truncate text-xs text-ink-400">
                          {line.componentLabels.join(" · ")}
                        </p>
                      )}
                      {line.note && (
                        <p className="mt-0.5 truncate text-xs italic text-ink-400">
                          &ldquo;{line.note}&rdquo;
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <div className="flex items-center gap-1 rounded-full border border-ink-200 p-0.5">
                          <button
                            onClick={() => updateQuantity(key, line.quantity - 1)}
                            aria-label={`Decrease ${line.name} quantity`}
                            className="flex size-7 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="min-w-6 text-center text-sm font-semibold">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(key, line.quantity + 1)}
                            aria-label={`Increase ${line.name} quantity`}
                            className="flex size-7 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-ink-900">
                          {formatPrice((line.price + (line.addOnTotal ?? 0)) * line.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-ink-100 p-6">
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between text-ink-500">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(totals.subtotal)}</dd>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-fresh-600">
                    <dt>Discount ({couponCode})</dt>
                    <dd>−{formatPrice(totals.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-ink-500">
                  <dt>Delivery</dt>
                  <dd>
                    {totals.deliveryFee === 0 ? (
                      <span className="font-medium text-fresh-600">FREE</span>
                    ) : (
                      formatPrice(totals.deliveryFee)
                    )}
                  </dd>
                </div>
                <div className="mt-2 flex justify-between border-t border-ink-100 pt-3 text-base font-semibold text-ink-900">
                  <dt>Total</dt>
                  <dd>{formatPrice(totals.total)}</dd>
                </div>
                <p className="text-xs text-ink-400">Inclusive of taxes and packaging</p>
              </dl>

              <div className="mt-4 grid gap-2">
                <Button asChild size="lg" onClick={closeCart}>
                  <Link href="/checkout">Checkout · {formatPrice(totals.total)}</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" onClick={closeCart}>
                  <Link href="/cart">View full cart</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EmptyCart({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-brand-50">
        <ShoppingBag className="size-9 text-brand-400" />
      </div>
      <div>
        <p className="font-display text-xl text-ink-900">Your cart is empty</p>
        <p className="mt-1.5 text-sm text-ink-500">
          Nothing here yet. Our Paneer Butter Masala is a very good place to start.
        </p>
      </div>
      <Button asChild onClick={onBrowse}>
        <Link href="/menu">Browse the menu</Link>
      </Button>
    </div>
  );
}
