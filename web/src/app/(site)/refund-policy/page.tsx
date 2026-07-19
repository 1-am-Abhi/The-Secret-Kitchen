import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Refund & Cancellation Policy",
  description: `How refunds, replacements and subscription cancellations work at ${siteConfig.name}.`,
  path: "/refund-policy",
});

const sections: LegalSection[] = [
  {
    heading: "1. Our promise",
    paragraphs: [
      "If the food we sent you is not right, we fix it. No arguments, no forms, no making you prove it three different ways.",
      "Tell us within two hours of delivery with a photo, and we will either refund that item in full or resend it free. Which of the two happens is your choice, not ours.",
    ],
  },
  {
    heading: "2. When we refund or replace",
    bullets: [
      "The wrong item was delivered.",
      "An item was missing from your order.",
      "The food arrived cold, spilled or damaged in transit.",
      "The food was spoiled or of clearly unacceptable quality.",
      "Your order never arrived despite the address and phone number being correct.",
    ],
  },
  {
    heading: "3. When we cannot refund",
    bullets: [
      "The food was eaten in full and the complaint is about taste preference rather than quality.",
      "An incorrect or incomplete address was provided and the rider could not deliver.",
      "Nobody was reachable on the number provided after three attempts across ten minutes.",
      "The request comes more than 24 hours after delivery.",
      "A dish was customised at your request in a way that changed the result — for example asking for no spice and then finding it bland.",
    ],
  },
  {
    heading: "4. How to raise a request",
    bullets: [
      `WhatsApp us on ${siteConfig.contact.whatsapp} with your order reference and a photo — this is the fastest route.`,
      `Call the kitchen on ${siteConfig.contact.phone} during service hours.`,
      `Email ${siteConfig.contact.supportEmail} if you would rather have it in writing.`,
    ],
    paragraphs: [
      "Include your order reference number. It is on your confirmation page and in the WhatsApp message we sent when the order was placed.",
    ],
  },
  {
    heading: "5. How long refunds take",
    paragraphs: [
      "Approved refunds are initiated the same day. The money reaches you depending on how you paid:",
    ],
    bullets: [
      "UPI and wallets: 1 to 3 working days.",
      "Credit and debit cards: 5 to 7 working days, depending on your bank.",
      "Net banking: 3 to 5 working days.",
      "Cash on delivery: refunded to a UPI ID of your choice within 24 hours.",
    ],
  },
  {
    heading: "6. Order cancellation",
    bullets: [
      "Cancel free of charge any time before we start cooking — usually a two to three minute window after you order.",
      "Once cooking has started we cannot offer a full refund, because the food is made specifically for you and cannot be resold.",
      "If we cancel your order for any reason, you are refunded in full, always.",
    ],
  },
  {
    heading: "7. Tiffin subscription cancellation",
    bullets: [
      "Cancel a subscription any time from your dashboard or by calling us. There is no lock-in and no cancellation fee.",
      "Unused meals are refunded on a pro-rata basis, less any promotional discount that was applied to the plan.",
      "If you would rather not cancel outright, pausing costs nothing and your meals roll over indefinitely.",
      "Refunds for cancelled subscriptions are processed within 7 working days.",
    ],
  },
  {
    heading: "8. Still not happy?",
    paragraphs: [
      `If you feel a decision was unfair, ask for it to be escalated to the founder. Message us on WhatsApp and say so — we would much rather lose a few rupees than lose your trust.`,
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      intro={`If the food isn't right, we fix it. Tell us within two hours with a photo and you choose: a full refund on that item, or we cook it again and resend it free.`}
      updatedAt="2026-06-01"
      sections={sections}
    />
  );
}
