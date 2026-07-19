import type { Offer } from "./types";

/**
 * Promotional offers. `code` values are validated in the cart by
 * `applyCoupon` below, which is the single place discount maths lives so the
 * cart, checkout summary and offers page can never disagree.
 */
export const offers: Offer[] = [
  {
    id: "off-01",
    code: "SECRET50",
    title: "Flat 50% off your first order",
    description:
      "New here? Your first meal is half price. Order anything from the full menu and watch half the bill disappear at checkout.",
    discountType: "percentage",
    discountValue: 50,
    minOrder: 199,
    maxDiscount: 150,
    validUntil: "2026-12-31",
    terms: [
      "Valid on your first order only",
      "Minimum order value ₹199",
      "Maximum discount ₹150",
      "Cannot be combined with other offers",
    ],
    imageId: "offer-1",
    featured: true,
    appliesTo: "order",
  },
  {
    id: "off-02",
    code: "TIFFIN15",
    title: "15% off any monthly tiffin plan",
    description:
      "Commit to a month of homemade meals and take 15% off the entire plan. Works on Student, Regular and Premium.",
    discountType: "percentage",
    discountValue: 15,
    minOrder: 1999,
    maxDiscount: 800,
    validUntil: "2026-09-30",
    terms: [
      "Valid on monthly billing cycles only",
      "Applies to the first billing cycle",
      "Maximum discount ₹800",
      "Pause and skip benefits remain unchanged",
    ],
    imageId: "offer-2",
    featured: true,
    appliesTo: "subscription",
  },
  {
    id: "off-03",
    code: "STUDENT10",
    title: "Extra 10% off for students",
    description:
      "Show a valid student ID on WhatsApp once and this code stays active on your account all year — on top of the Student Plan's already low pricing.",
    discountType: "percentage",
    discountValue: 10,
    minOrder: 149,
    maxDiscount: 100,
    validUntil: "2027-03-31",
    terms: [
      "Requires one-time student ID verification",
      "Valid on both à la carte orders and tiffin plans",
      "Maximum discount ₹100 per order",
    ],
    imageId: "offer-3",
    featured: true,
    appliesTo: "order",
  },
  {
    id: "off-04",
    code: "FREEDEL",
    title: "Free delivery, no minimum",
    description:
      "Craving just a plate of Maggi at midnight? Use this code and we will waive the delivery fee entirely, whatever your cart size.",
    discountType: "flat",
    discountValue: 29,
    minOrder: 99,
    validUntil: "2026-10-31",
    terms: [
      "Waives the ₹29 delivery fee",
      "Minimum order value ₹99",
      "Valid once per day per account",
    ],
    imageId: "offer-4",
    appliesTo: "order",
  },
  {
    id: "off-05",
    code: "WEEKEND100",
    title: "₹100 off on weekend orders above ₹599",
    description:
      "Saturday and Sunday family orders get a flat ₹100 off. Perfect for a paneer-heavy weekend spread.",
    discountType: "flat",
    discountValue: 100,
    minOrder: 599,
    validUntil: "2026-12-31",
    terms: [
      "Valid Saturday and Sunday only",
      "Minimum order value ₹599",
      "One use per account per weekend",
    ],
    imageId: "offer-5",
    appliesTo: "order",
  },
  {
    id: "off-06",
    code: "SWEETTOOTH",
    title: "Free gulab jamun above ₹499",
    description:
      "Every order over ₹499 comes with two house-made gulab jamuns, still warm from the syrup. On the house.",
    discountType: "freebie",
    discountValue: 69,
    minOrder: 499,
    validUntil: "2026-11-30",
    terms: [
      "Two pieces of gulab jamun added free",
      "Minimum order value ₹499",
      "Subject to availability",
    ],
    imageId: "offer-6",
    appliesTo: "order",
  },
];

export const offerByCode = new Map(offers.map((offer) => [offer.code, offer]));

export interface CouponResult {
  ok: boolean;
  /** Rupees taken off the subtotal. Zero when the coupon does not apply. */
  discount: number;
  message: string;
  offer?: Offer;
}

/**
 * Validate a coupon against a subtotal and return the rupee discount.
 * Percentage offers are capped by `maxDiscount`; freebies discount the value
 * of the gifted item so the customer sees the saving on the bill.
 */
export function applyCoupon(
  code: string,
  subtotal: number,
  context: "order" | "subscription" = "order",
): CouponResult {
  const offer = offerByCode.get(code.trim().toUpperCase());

  if (!offer) {
    return { ok: false, discount: 0, message: "That coupon code is not valid." };
  }

  if (offer.appliesTo && offer.appliesTo !== context) {
    const target = offer.appliesTo === "subscription" ? "tiffin plans" : "menu orders";
    return { ok: false, discount: 0, message: `This code only works on ${target}.` };
  }

  if (new Date(offer.validUntil) < new Date()) {
    return { ok: false, discount: 0, message: "This coupon has expired." };
  }

  if (subtotal < offer.minOrder) {
    const shortfall = offer.minOrder - subtotal;
    return {
      ok: false,
      discount: 0,
      message: `Add ₹${shortfall} more to use ${offer.code}.`,
    };
  }

  let discount =
    offer.discountType === "percentage"
      ? Math.round((subtotal * offer.discountValue) / 100)
      : offer.discountValue;

  if (offer.maxDiscount) discount = Math.min(discount, offer.maxDiscount);
  // Never let a coupon exceed the bill itself.
  discount = Math.min(discount, subtotal);

  return {
    ok: true,
    discount,
    offer,
    message:
      offer.discountType === "freebie"
        ? `${offer.title} applied — enjoy!`
        : `${offer.code} applied. You saved ₹${discount}.`,
  };
}

export function getFeaturedOffers(): Offer[] {
  return offers.filter((offer) => offer.featured);
}
