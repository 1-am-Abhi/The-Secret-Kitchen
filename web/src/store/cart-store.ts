"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { siteConfig } from "@/config/site";
import { applyCoupon, type CouponResult } from "@/data/offers";
import type { CartLine, MenuItem } from "@/types";

/**
 * Cart state, persisted to localStorage so a customer never loses their basket
 * on refresh or when they navigate away to compare dishes.
 *
 * All money maths lives in `selectTotals` — pages read derived numbers from
 * there rather than recomputing, so the cart page, the header badge and the
 * checkout summary can never disagree about the bill.
 */

/** Custom tiffin boxes enter the cart as a synthetic line item. */
export interface CustomTiffinLine extends CartLine {
  isCustomTiffin: true;
  componentIds: string[];
  componentLabels: string[];
}

export type AnyCartLine = CartLine | CustomTiffinLine;

interface CartState {
  lines: AnyCartLine[];
  couponCode: string | null;
  /** Slide-out cart visibility, kept in the store so any component can open it. */
  isOpen: boolean;

  addItem: (item: MenuItem, quantity?: number, addOnIds?: string[], note?: string) => void;
  addCustomTiffin: (line: Omit<CustomTiffinLine, "isCustomTiffin">) => void;
  removeLine: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  setNote: (lineKey: string, note: string) => void;
  applyCouponCode: (code: string) => CouponResult;
  clearCoupon: () => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

/**
 * Identity for a cart line. The same dish ordered twice with different add-ons
 * must occupy two separate lines, so the key folds in the add-on selection.
 */
export function lineKey(line: AnyCartLine): string {
  const addOns = [...(line.addOnIds ?? [])].sort().join("+");
  return addOns ? `${line.itemId}::${addOns}` : line.itemId;
}

function sumAddOns(item: MenuItem, addOnIds: string[] = []): number {
  return (item.addOns ?? [])
    .filter((addOn) => addOnIds.includes(addOn.id))
    .reduce((sum, addOn) => sum + addOn.price, 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      couponCode: null,
      isOpen: false,

      addItem: (item, quantity = 1, addOnIds = [], note) => {
        const addOnTotal = sumAddOns(item, addOnIds);
        const candidate: CartLine = {
          itemId: item.id,
          slug: item.slug,
          name: item.name,
          price: item.price,
          imageId: item.imageId,
          quantity,
          addOnIds,
          addOnTotal,
          note,
        };
        const key = lineKey(candidate);

        set((state) => {
          const existing = state.lines.find((line) => lineKey(line) === key);
          if (existing) {
            // Same dish, same add-ons — bump the quantity instead of duplicating.
            return {
              lines: state.lines.map((line) =>
                lineKey(line) === key
                  ? { ...line, quantity: line.quantity + quantity }
                  : line,
              ),
            };
          }
          return { lines: [...state.lines, candidate] };
        });
      },

      addCustomTiffin: (line) => {
        set((state) => ({
          lines: [...state.lines, { ...line, isCustomTiffin: true as const }],
        }));
      },

      removeLine: (key) =>
        set((state) => ({ lines: state.lines.filter((line) => lineKey(line) !== key) })),

      updateQuantity: (key, quantity) =>
        set((state) => ({
          // Dropping to zero removes the line rather than leaving an empty row.
          lines:
            quantity <= 0
              ? state.lines.filter((line) => lineKey(line) !== key)
              : state.lines.map((line) =>
                  lineKey(line) === key ? { ...line, quantity } : line,
                ),
        })),

      setNote: (key, note) =>
        set((state) => ({
          lines: state.lines.map((line) =>
            lineKey(line) === key ? { ...line, note } : line,
          ),
        })),

      applyCouponCode: (code) => {
        const subtotal = selectSubtotal(get().lines);
        const result = applyCoupon(code, subtotal, "order");
        if (result.ok) set({ couponCode: result.offer?.code ?? code.toUpperCase() });
        return result;
      },

      clearCoupon: () => set({ couponCode: null }),
      clearCart: () => set({ lines: [], couponCode: null }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "tsk-cart",
      storage: createJSONStorage(() => localStorage),
      // `isOpen` is ephemeral UI state — never restore an open cart on load.
      partialize: (state) => ({ lines: state.lines, couponCode: state.couponCode }),
      version: 1,
    },
  ),
);

/* ==========================================================================
   Selectors — pure functions so they can also run on the server / in tests.
   ========================================================================== */

export function selectSubtotal(lines: AnyCartLine[]): number {
  return lines.reduce(
    (sum, line) => sum + (line.price + (line.addOnTotal ?? 0)) * line.quantity,
    0,
  );
}

export function selectItemCount(lines: AnyCartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  packagingFee: number;
  gst: number;
  total: number;
  itemCount: number;
  /** Rupees still needed to unlock free delivery; zero once unlocked. */
  freeDeliveryShortfall: number;
  couponMessage?: string;
}

/**
 * The single bill calculation. Order of operations matters and is deliberate:
 * discount comes off the subtotal first, delivery is then assessed against the
 * *original* subtotal (so a coupon cannot accidentally re-add a delivery fee),
 * and GST applies to the discounted food value plus packaging.
 */
export function selectTotals(lines: AnyCartLine[], couponCode: string | null): CartTotals {
  const { deliveryFee, freeDeliveryAbove, packagingFee, gstRate } = siteConfig.commerce;

  const subtotal = selectSubtotal(lines);
  const itemCount = selectItemCount(lines);

  const coupon = couponCode ? applyCoupon(couponCode, subtotal, "order") : null;

  const isEmpty = itemCount === 0;
  const qualifiesFree = subtotal >= freeDeliveryAbove;
  // FREEDEL waives the delivery fee rather than discounting the food, so its
  // value must not also come off the subtotal — that would double-count it.
  const waivedByCoupon = Boolean(coupon?.ok && coupon.offer?.code === "FREEDEL");
  const discount = coupon?.ok && !waivedByCoupon ? coupon.discount : 0;
  const charge = isEmpty || qualifiesFree || waivedByCoupon ? 0 : deliveryFee;

  const packaging = isEmpty ? 0 : packagingFee;
  const taxable = Math.max(0, subtotal - discount) + packaging;
  const gst = Math.round(taxable * gstRate);

  return {
    subtotal,
    discount,
    deliveryFee: charge,
    packagingFee: packaging,
    gst,
    total: Math.max(0, taxable + gst + charge),
    itemCount,
    freeDeliveryShortfall: qualifiesFree || isEmpty ? 0 : freeDeliveryAbove - subtotal,
    couponMessage: coupon?.message,
  };
}
