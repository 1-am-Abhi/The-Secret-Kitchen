import type { Offer } from "@prisma/client";

import { DELIVERY_WAIVER_CODE, commerce } from "../config/commerce";

/**
 * Authoritative bill calculation.
 *
 * This is the server-side mirror of `selectTotals` in web/src/store/cart-store.ts.
 * The client computes the same numbers so the customer sees a live total, but
 * the client is never trusted: prices are re-read from the database and the
 * bill is recomputed here before an order row is written.
 */

export interface PricedLine {
  /** Catalogue price of the dish at the time of ordering, whole rupees. */
  unitPrice: number;
  quantity: number;
  /** Sum of the selected add-ons for ONE unit of this line. */
  addOnTotal: number;
}

export interface Bill {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  packagingFee: number;
  gst: number;
  total: number;
  itemCount: number;
  freeDeliveryShortfall: number;
}

export function calculateSubtotal(lines: PricedLine[]): number {
  return lines.reduce((sum, line) => sum + (line.unitPrice + line.addOnTotal) * line.quantity, 0);
}

export function calculateItemCount(lines: PricedLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export interface CouponEvaluation {
  ok: boolean;
  discount: number;
  message: string;
  offer?: Offer;
}

/**
 * Coupon semantics ported verbatim from web/src/data/offers.ts::applyCoupon so
 * the storefront and the API can never disagree about what a code is worth.
 * Percentage offers are capped by `maxDiscount`; a freebie discounts the value
 * of the gifted item so the saving is visible on the bill; nothing may ever
 * exceed the subtotal itself.
 */
export function evaluateCoupon(
  offer: Offer | null,
  subtotal: number,
  context: "ORDER" | "SUBSCRIPTION" = "ORDER",
  now = new Date(),
): CouponEvaluation {
  if (!offer || !offer.active) {
    return { ok: false, discount: 0, message: "That coupon code is not valid." };
  }

  if (offer.appliesTo !== context) {
    const target = offer.appliesTo === "SUBSCRIPTION" ? "tiffin plans" : "menu orders";
    return { ok: false, discount: 0, message: `This code only works on ${target}.` };
  }

  if (offer.validFrom > now) {
    return { ok: false, discount: 0, message: "This coupon is not active yet." };
  }

  if (offer.validUntil < now) {
    return { ok: false, discount: 0, message: "This coupon has expired." };
  }

  if (offer.usageLimit !== null && offer.usedCount >= offer.usageLimit) {
    return { ok: false, discount: 0, message: "This coupon has been fully redeemed." };
  }

  if (subtotal < offer.minOrder) {
    const shortfall = offer.minOrder - subtotal;
    return { ok: false, discount: 0, message: `Add ₹${shortfall} more to use ${offer.code}.` };
  }

  let discount =
    offer.discountType === "PERCENTAGE"
      ? Math.round((subtotal * offer.discountValue) / 100)
      : offer.discountValue;

  if (offer.maxDiscount !== null) discount = Math.min(discount, offer.maxDiscount);
  discount = Math.min(discount, subtotal);

  return {
    ok: true,
    discount,
    offer,
    message:
      offer.discountType === "FREEBIE"
        ? `${offer.title} applied — enjoy!`
        : `${offer.code} applied. You saved ₹${discount}.`,
  };
}

/**
 * The single bill calculation. Order of operations is deliberate:
 *  1. discount comes off the subtotal first;
 *  2. delivery is assessed against the ORIGINAL subtotal, so a coupon can never
 *     accidentally push a cart back below the free-delivery threshold and
 *     re-add a fee the customer had already earned away;
 *  3. GST applies to the discounted food value plus packaging, but NOT to the
 *     delivery fee, which is charged as a pass-through.
 */
export function calculateBill(lines: PricedLine[], coupon?: CouponEvaluation | null): Bill {
  const { deliveryFee, freeDeliveryAbove, packagingFee, gstRate } = commerce;

  const subtotal = calculateSubtotal(lines);
  const itemCount = calculateItemCount(lines);

  const isEmpty = itemCount === 0;
  const qualifiesFree = subtotal >= freeDeliveryAbove;

  // FREEDEL waives the delivery fee rather than discounting the food, so its
  // rupee value must not also come off the subtotal — that would double-count it.
  const waivedByCoupon = Boolean(coupon?.ok && coupon.offer?.code === DELIVERY_WAIVER_CODE);
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
  };
}

/** Whether a cart clears the kitchen's minimum order value. */
export function meetsMinimumOrder(subtotal: number): boolean {
  return subtotal >= commerce.minimumOrder;
}

/**
 * Price one billing period of a tiffin plan. Mirrors
 * web/src/data/tiffin.ts::calculatePlanTotal — picking both lunch and dinner
 * doubles the meal count for the period rather than changing the per-meal rate.
 */
export function calculatePlanPeriod(input: {
  weeklyPricePerMeal: number;
  monthlyPricePerMeal: number;
  weeklyMeals: number;
  monthlyMeals: number;
  cycle: "WEEKLY" | "MONTHLY" | "CUSTOM";
  slot: "LUNCH" | "DINNER" | "BOTH";
  /** Required for CUSTOM cycles, ignored otherwise. */
  customMeals?: number;
}): { meals: number; pricePerMeal: number; amount: number } {
  const bothSlots = input.slot === "BOTH";
  const isWeekly = input.cycle === "WEEKLY";

  // CUSTOM bills an explicit meal count at the monthly (best) rate, which is
  // how the storefront's "build your own schedule" flow is presented.
  const baseMeals =
    input.cycle === "CUSTOM"
      ? Math.max(1, input.customMeals ?? input.monthlyMeals)
      : isWeekly
        ? input.weeklyMeals
        : input.monthlyMeals;

  const pricePerMeal = isWeekly ? input.weeklyPricePerMeal : input.monthlyPricePerMeal;
  const meals = baseMeals * (bothSlots ? 2 : 1);

  return { meals, pricePerMeal, amount: meals * pricePerMeal };
}
