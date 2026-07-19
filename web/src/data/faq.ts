import type { FaqItem } from "@/types";

/**
 * FAQ content. Rendered on the FAQ page, in a condensed form on the home page,
 * and serialised into FAQPage JSON-LD so answers can surface directly in
 * Google results.
 */

export const faqCategories = [
  { id: "ordering", label: "Ordering" },
  { id: "delivery", label: "Delivery" },
  { id: "tiffin", label: "Tiffin Service" },
  { id: "food", label: "Food & Hygiene" },
  { id: "payments", label: "Payments & Refunds" },
] as const;

export const faqs: FaqItem[] = [
  /* ---- Ordering ---- */
  {
    id: "faq-01",
    category: "ordering",
    question: "What are your ordering hours?",
    answer:
      "Our kitchen takes orders from 8:00 AM to 11:00 PM, all seven days. Breakfast items such as idli and paratha are available until 11:30 AM, and the full menu opens from 11:30 AM onwards. Last orders are accepted at 10:45 PM.",
  },
  {
    id: "faq-02",
    category: "ordering",
    question: "Is there a minimum order value?",
    answer:
      "Yes, the minimum order value is ₹99. Orders above ₹349 get free delivery; below that a flat ₹29 delivery fee applies.",
  },
  {
    id: "faq-03",
    category: "ordering",
    question: "Can I order in bulk for an office lunch or a party?",
    answer:
      "Absolutely. We regularly cater office lunches, birthdays and small gatherings. For orders above 15 people, call or WhatsApp us at least 24 hours in advance and we will build a custom menu and quote at bulk pricing.",
  },
  {
    id: "faq-04",
    category: "ordering",
    question: "Can I customise the spice level of a dish?",
    answer:
      "Yes. Add a note at checkout asking for mild, medium or extra spicy, and our chefs will adjust the tempering. Requests for no onion or no garlic are also honoured — look for the Jain-friendly badge on eligible dishes.",
  },

  /* ---- Delivery ---- */
  {
    id: "faq-05",
    category: "delivery",
    question: "How long does delivery take?",
    answer:
      "Most orders reach you in 30 to 45 minutes. Freshly cooked gravies and parathas take around 25 minutes in the kitchen, plus travel time to your address. You will see a live estimate before you pay.",
  },
  {
    id: "faq-06",
    category: "delivery",
    question: "Which areas do you deliver to?",
    answer:
      "We currently serve Noida Sectors 58 to 63, Sector 71, Noida Extension, Indirapuram, Vaishali and Vasundhara. Enter your pincode on the home page to confirm coverage — we are adding new sectors every quarter.",
  },
  {
    id: "faq-07",
    category: "delivery",
    question: "Do you charge for delivery?",
    answer:
      "Delivery is free on all orders above ₹349 and on every tiffin subscription. Below ₹349 there is a flat ₹29 fee. Tiffin subscribers never pay a delivery charge regardless of order size.",
  },
  {
    id: "faq-08",
    category: "delivery",
    question: "How do you keep the food hot in transit?",
    answer:
      "Every order goes out in food-grade, leak-proof containers inside insulated thermal bags. Our tiffin boxes are double-walled steel that hold above 60°C for up to three hours.",
  },

  /* ---- Tiffin ---- */
  {
    id: "faq-09",
    category: "tiffin",
    question: "How does the monthly tiffin subscription work?",
    answer:
      "Pick a plan (Student, Regular or Premium), choose lunch, dinner or both, and select weekly or monthly billing. Monthly plans include 26 meals — Monday to Saturday across four weeks. Delivery starts the very next day after you subscribe.",
  },
  {
    id: "faq-10",
    category: "tiffin",
    question: "Can I pause my subscription while I travel?",
    answer:
      "Yes, and it is the feature our subscribers use most. Pause from your dashboard any time before 9 PM and every unused meal rolls over to your next cycle. There is no expiry and no penalty for pausing.",
  },
  {
    id: "faq-11",
    category: "tiffin",
    question: "What if I want to skip just one meal?",
    answer:
      "Skip an individual delivery up to four hours before the dispatch window and that meal is credited straight back to your plan balance. You can skip as many individual meals as you like.",
  },
  {
    id: "faq-12",
    category: "tiffin",
    question: "Does the menu repeat?",
    answer:
      "No dish repeats within the same fortnight. We run a rotating 28-day menu that is published a week in advance, and Premium subscribers get a vote on the following week's specials.",
  },
  {
    id: "faq-13",
    category: "tiffin",
    question: "Can I change my plan mid-cycle?",
    answer:
      "You can upgrade at any time — the price difference is prorated against your remaining meals. Downgrades take effect from your next billing cycle so the meals you have already paid for are never devalued.",
  },

  /* ---- Food & hygiene ---- */
  {
    id: "faq-14",
    category: "food",
    question: "Is everything on the menu vegetarian?",
    answer:
      "Yes. The Secret Kitchen is 100% pure vegetarian. No meat, fish or egg enters our kitchen at any point, and we do not share equipment, oil or storage with any non-vegetarian operation.",
  },
  {
    id: "faq-15",
    category: "food",
    question: "Do you offer Jain food without onion and garlic?",
    answer:
      "Many of our dishes are prepared Jain-friendly on request — look for the Jain badge on the menu. Add a note at checkout and our chefs prepare your dish in a separate pan with no onion or garlic.",
  },
  {
    id: "faq-16",
    category: "food",
    question: "What are your hygiene standards?",
    answer:
      "We are FSSAI licensed (No. 12722016000456). The kitchen is deep-cleaned twice daily, all staff undergo quarterly health checks, and we run a HACCP-based checklist covering temperature logs, oil rotation and raw material traceability.",
  },
  {
    id: "faq-17",
    category: "food",
    question: "Where do your ingredients come from?",
    answer:
      "Vegetables are bought fresh every morning from the local mandi — never stored more than 24 hours. Paneer and curd are set in-house daily. We use branded cold-pressed oils and refuse to reuse frying oil beyond a single service.",
  },
  {
    id: "faq-18",
    category: "food",
    question: "Do you list allergens and calories?",
    answer:
      "Every dish page shows calories, protein and serving size. Common allergens — dairy, gluten, nuts and soy — are listed in the quick view. If you have a specific allergy, mention it in the order note and we will confirm before cooking.",
  },

  /* ---- Payments ---- */
  {
    id: "faq-19",
    category: "payments",
    question: "What payment methods do you accept?",
    answer:
      "We accept UPI, all major credit and debit cards, net banking, popular wallets and cash on delivery. Tiffin subscriptions can be paid upfront or set up as an auto-debit UPI mandate.",
  },
  {
    id: "faq-20",
    category: "payments",
    question: "What is your refund policy?",
    answer:
      "If a dish arrives cold, spilled or incorrect, tell us within two hours with a photo and we will refund it in full or resend it free — your choice. Refunds reach the original payment method within 5 to 7 working days.",
  },
  {
    id: "faq-21",
    category: "payments",
    question: "Can I cancel a subscription and get my money back?",
    answer:
      "Yes. Cancel any time and unused meals are refunded on a pro-rata basis, less any promotional discount that was applied to the plan. There is no lock-in and no cancellation fee.",
  },
  {
    id: "faq-22",
    category: "payments",
    question: "Do the prices include taxes?",
    answer:
      "Menu prices are exclusive of GST. A 5% GST and a ₹15 packaging charge are added at checkout, and both are shown clearly in the order summary before you pay.",
  },
];

export function getFaqsByCategory(category: FaqItem["category"]): FaqItem[] {
  return faqs.filter((faq) => faq.category === category);
}

/** Condensed set for the home page — one strong answer per theme. */
export function getHomepageFaqs(): FaqItem[] {
  const ids = ["faq-05", "faq-09", "faq-14", "faq-10", "faq-06", "faq-19"];
  return ids
    .map((id) => faqs.find((faq) => faq.id === id))
    .filter((faq): faq is FaqItem => Boolean(faq));
}
