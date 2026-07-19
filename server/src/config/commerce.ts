/**
 * Commerce rules. These MUST stay in lockstep with web/src/config/site.ts —
 * the storefront shows the customer a bill computed from these numbers and the
 * server recomputes it authoritatively before writing the order. If they ever
 * diverge, checkout starts rejecting totals the customer just agreed to.
 */
export const commerce = {
  currency: "INR",
  deliveryFee: 29,
  freeDeliveryAbove: 349,
  packagingFee: 15,
  gstRate: 0.05,
  minimumOrder: 99,
  averagePrepMinutes: 28,
} as const;

/**
 * FREEDEL is modelled as a flat ₹29 offer for display purposes, but it waives
 * the delivery fee rather than discounting food. Pricing needs to know that by
 * code, exactly as the cart store does.
 */
export const DELIVERY_WAIVER_CODE = "FREEDEL";

export const business = {
  name: "The Secret Kitchen",
  supportEmail: "support@thesecretkitchen.in",
  fssaiLicense: "12722016000456",
} as const;
