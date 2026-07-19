import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { siteConfig, fullAddress, hasFssaiLicense } from "@/config/site";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description: `The terms governing orders, tiffin subscriptions and delivery from ${siteConfig.name}.`,
  path: "/terms",
});

const sections: LegalSection[] = [
  {
    heading: "1. Who we are",
    paragraphs: [
      `${siteConfig.name} is a pure-vegetarian cloud kitchen and tiffin service operating from ${fullAddress}${
        hasFssaiLicense ? `, under FSSAI licence number ${siteConfig.fssaiLicense}` : ""
      }.`,
      "By placing an order or subscribing to a tiffin plan you agree to these terms. If you do not agree with any part of them, please do not use the service.",
    ],
  },
  {
    heading: "2. Orders",
    bullets: [
      "The minimum order value is ₹99. Orders below this cannot be processed.",
      "An order is confirmed only once payment succeeds or, for cash on delivery, once we confirm it by phone or WhatsApp.",
      "Menu prices exclude GST. A 5% GST and a ₹15 packaging charge are added at checkout and shown in full before you pay.",
      "We may decline or cancel an order if an item is unavailable, the delivery address falls outside our service area, or we cannot verify your contact number. You are refunded in full in every such case.",
      "Once cooking has started an order cannot be modified. Call us immediately if you need a change and we will do what we can.",
    ],
  },
  {
    heading: "3. Delivery",
    bullets: [
      "We deliver within the areas listed on our home page. Delivery times are estimates, not guarantees, and can extend during heavy rain or peak demand.",
      "Delivery is free on orders above ₹349 and on all tiffin subscriptions. A flat ₹29 applies below that threshold.",
      "Someone must be reachable on the number provided. If our rider cannot reach you after three attempts across ten minutes, the order is marked undelivered and is not refunded.",
      "For contactless delivery, the order is left at your door and responsibility passes to you at that point.",
    ],
  },
  {
    heading: "4. Tiffin subscriptions",
    bullets: [
      "Subscriptions are prepaid for the chosen billing cycle. Monthly plans cover 26 meals across four weeks, Monday to Saturday.",
      "You may pause a subscription any time before 9:00 PM for the following day. Unused meals roll over and never expire.",
      "Individual meals can be skipped up to four hours before the dispatch window and are credited back to your balance.",
      "Upgrades take effect immediately and are prorated. Downgrades take effect from the next billing cycle.",
      "Cancel any time. Unused meals are refunded pro rata, less any promotional discount applied to the plan. There is no cancellation fee.",
    ],
  },
  {
    heading: "5. Food, allergens and dietary claims",
    paragraphs: [
      "Our kitchen is 100% vegetarian. No meat, fish or egg is stored, prepared or cooked on the premises, and no equipment is shared with any non-vegetarian operation.",
      "Dishes marked Jain-friendly are prepared without onion or garlic in a separate pan on request. Please add the request as an order note.",
      "Our kitchen handles dairy, gluten, nuts and soy. We cannot guarantee the absence of trace cross-contact between these. If you have a severe allergy, tell us before ordering so we can advise honestly.",
    ],
  },
  {
    heading: "6. Offers and coupons",
    bullets: [
      "Each coupon carries its own conditions, which are listed on the offers page and shown at checkout.",
      "Only one coupon may be applied per order unless explicitly stated otherwise.",
      "We may withdraw or modify an offer at any time, but never after it has been applied to a confirmed order.",
      "Coupons have no cash value and cannot be exchanged or transferred.",
    ],
  },
  {
    heading: "7. Payments",
    paragraphs: [
      "We accept UPI, credit and debit cards, net banking, wallets and cash on delivery. Online payments are handled by our payment partner over an encrypted connection; we never store your card details on our servers.",
      "If an amount is debited but the order does not confirm, it is auto-reversed by your bank, usually within 5 to 7 working days. Contact us with the transaction reference if it is not.",
    ],
  },
  {
    heading: "8. Your responsibilities",
    bullets: [
      "Provide an accurate delivery address and a contact number you will answer.",
      "Do not misuse the service, including placing fraudulent orders or repeatedly refusing accepted deliveries.",
      "Treat our delivery and kitchen staff with basic courtesy. We reserve the right to refuse service in cases of abuse.",
    ],
  },
  {
    heading: "9. Limitation of liability",
    paragraphs: [
      "Our liability for any order is limited to the value of that order. We are not liable for indirect or consequential losses.",
      "Nothing in these terms limits liability that cannot be limited under applicable Indian law, including liability arising from proven negligence in food safety.",
    ],
  },
  {
    heading: "10. Changes and governing law",
    paragraphs: [
      "We may update these terms from time to time. The version in force is the one published on this page at the moment you place your order.",
      `These terms are governed by the laws of India, and the courts at Gautam Buddh Nagar, Uttar Pradesh have exclusive jurisdiction. Questions? Write to ${siteConfig.contact.email}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="The agreement between you and our kitchen when you order food or subscribe to a tiffin plan. We have kept it in plain English."
      updatedAt="2026-06-01"
      sections={sections}
    />
  );
}
