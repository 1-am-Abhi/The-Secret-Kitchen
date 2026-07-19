import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: `How ${siteConfig.name} collects, uses and protects your personal information.`,
  path: "/privacy",
});

const sections: LegalSection[] = [
  {
    heading: "1. What we collect",
    paragraphs: [
      "We collect the minimum needed to cook your food and get it to you. Nothing more.",
    ],
    bullets: [
      "Contact details: your name, mobile number and — if you provide one — your email address.",
      "Delivery details: your address, landmark and any delivery instructions you add.",
      "Order details: what you ordered, when, any kitchen notes, and the amount paid.",
      "Subscription details: your plan, delivery slot, and the dates you pause or skip.",
      "Technical data: basic analytics such as pages visited and device type, used only to fix problems and improve the site.",
    ],
  },
  {
    heading: "2. What we do not collect",
    paragraphs: [
      "We never see or store your full card number, CVV or UPI PIN. Online payments are processed entirely by our payment partner; we receive only a success or failure result and a transaction reference.",
      "We do not track you across other websites, and we do not run advertising pixels that build a profile of you.",
    ],
  },
  {
    heading: "3. How we use your information",
    bullets: [
      "To prepare, pack and deliver your order, and to let our rider contact you.",
      "To send order and delivery updates over WhatsApp or SMS.",
      "To manage your tiffin subscription, including pauses, skips and renewals.",
      "To respond to enquiries, complaints and refund requests.",
      "To send the weekly menu and offers, but only if you subscribed to our newsletter. Every email carries a one-click unsubscribe link.",
      "To meet our legal and food-safety record-keeping obligations.",
    ],
  },
  {
    heading: "4. Who we share it with",
    paragraphs: [
      "We do not sell your data. Ever. We share it only with the parties needed to deliver the service:",
    ],
    bullets: [
      "Our delivery riders, who see your name, address and phone number for the duration of your delivery.",
      "Our payment gateway, which processes your transaction.",
      "Our messaging provider, which sends order updates.",
      "Government authorities, where we are legally required to disclose information.",
    ],
  },
  {
    heading: "5. How long we keep it",
    paragraphs: [
      "Order records are retained for seven years to satisfy tax and FSSAI record-keeping requirements. Marketing contact details are deleted as soon as you unsubscribe. Analytics data is retained in aggregate form only after 14 months.",
    ],
  },
  {
    heading: "6. Your rights",
    bullets: [
      "Ask for a copy of the personal data we hold about you.",
      "Ask us to correct anything that is inaccurate.",
      "Ask us to delete your data, subject to the retention periods above.",
      "Withdraw consent for marketing at any time.",
    ],
    paragraphs: [
      `To exercise any of these, write to ${siteConfig.contact.email}. We respond within 30 days.`,
    ],
  },
  {
    heading: "7. Cookies and local storage",
    paragraphs: [
      "We use your browser's local storage to remember your cart between visits, so you do not lose your basket on refresh. This never leaves your device until you place an order.",
      "We use privacy-respecting analytics to understand which pages are useful. No third-party advertising cookies are set.",
    ],
  },
  {
    heading: "8. Security",
    paragraphs: [
      "The site is served entirely over HTTPS. Access to customer data is restricted to the staff who need it to do their job, and administrative access is protected by individual credentials.",
      "No system is perfectly secure. If a breach ever affects your data, we will tell you and the relevant authority promptly and honestly.",
    ],
  },
  {
    heading: "9. Children",
    paragraphs: [
      "Our service is not directed at children under 13, and we do not knowingly collect their data. If you believe a child has provided us information, contact us and we will delete it.",
    ],
  },
  {
    heading: "10. Contact",
    paragraphs: [
      `Questions about this policy? Email ${siteConfig.contact.email} or call ${siteConfig.contact.phone}. We would rather answer a question than leave you guessing.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="We collect the minimum needed to cook your food and deliver it. We never sell your data. Here is exactly what we hold and why."
      updatedAt="2026-06-01"
      sections={sections}
    />
  );
}
