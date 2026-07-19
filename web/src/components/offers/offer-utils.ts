import type { Offer } from "@/types";

/**
 * Discount presentation. Kept here rather than inline in the cards so the
 * featured hero, the grid and any future cart banner all label an offer the
 * same way — the discount *maths* stays in src/data/offers.ts.
 */
export function discountLabel(offer: Offer): string {
  switch (offer.discountType) {
    case "percentage":
      return `${offer.discountValue}%`;
    case "flat":
      return `₹${offer.discountValue}`;
    case "freebie":
      return "FREE";
  }
}

export function discountCaption(offer: Offer): string {
  return offer.discountType === "freebie" ? "on us" : "off";
}

/** Whole days between now and the offer's expiry, floored at zero. */
export function daysRemaining(validUntil: string, from: Date = new Date()): number {
  const diff = new Date(validUntil).getTime() - from.getTime();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}
