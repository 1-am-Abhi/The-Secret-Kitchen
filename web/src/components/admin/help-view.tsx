"use client";

import Link from "next/link";
import * as React from "react";

import { PageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  type OrderStatus,
} from "@/lib/admin-orders";

/**
 * Operating reference for whoever is running the kitchen.
 *
 * The order lifecycle below is read from the same maps the orders screen
 * renders from, so this page cannot drift out of date when a status is added
 * or renamed — it would be worse than useless if it described a pipeline the
 * software no longer has.
 */

/** The happy path, in the order the kitchen actually moves through it. */
const PIPELINE: { status: OrderStatus; meaning: string }[] = [
  {
    status: "PENDING_CUSTOMER_CONFIRMATION",
    meaning:
      "Saved to the database and waiting for the customer to confirm over WhatsApp. The order already exists and already has its number — WhatsApp is only how we reach them.",
  },
  { status: "CONFIRMED", meaning: "The customer confirmed. Safe to start buying against it." },
  { status: "PREPARING", meaning: "Prep has started — chopping, marinating, batter." },
  { status: "COOKING", meaning: "On the fire." },
  { status: "PACKED", meaning: "Boxed, sealed and labelled, waiting for a rider." },
  { status: "OUT_FOR_DELIVERY", meaning: "With the rider. The customer's tracking page shows this." },
  { status: "DELIVERED", meaning: "Handed over. Counts towards the customer's lifetime spend." },
];

const SECTIONS: { href: string; label: string; what: string }[] = [
  { href: "/admin/orders", label: "Orders", what: "Every order, newest first. Move an order along its pipeline here." },
  { href: "/admin/menu", label: "Menu", what: "Dishes, prices and availability. Marking a dish unavailable hides it from the storefront immediately." },
  { href: "/admin/specials", label: "Today's Special", what: "The rotating dish featured on the home page and menu." },
  { href: "/admin/customers", label: "Customers", what: "Everyone who has ordered, with their order count and delivered spend." },
  { href: "/admin/subscribers", label: "Subscribers", what: "Active tiffin plans, their cycle and how many meals remain." },
  { href: "/admin/gallery", label: "Gallery", what: "The photographs on the public gallery page." },
  { href: "/admin/offers", label: "Offers", what: "Coupon codes, their discount and expiry." },
  { href: "/admin/content", label: "Site Content", what: "Homepage statistics, section copy and published reviews." },
  { href: "/admin/outlets", label: "Outlets", what: "Kitchen locations and the areas each one delivers to." },
  { href: "/admin/analytics", label: "Analytics", what: "Revenue, order volume and what is selling." },
];

const TROUBLESHOOTING: { symptom: string; cause: string }[] = [
  {
    symptom: "New orders are not appearing on their own",
    cause:
      "The live stream has dropped. Settings shows its state — if it says Disconnected, reload the page. Orders are never lost by this; they are in the database either way and a reload shows them.",
  },
  {
    symptom: "Every screen is empty and nothing loads",
    cause:
      "Usually the API is unreachable or asleep. Check Settings → Connection. If the admin API says Missing, the deployment has no API URL configured and an environment variable needs setting.",
  },
  {
    symptom: "A customer says they never got a WhatsApp message",
    cause:
      "The order still exists — it is saved before WhatsApp ever opens. Find it under Orders by their phone number and confirm it manually.",
  },
  {
    symptom: "Signing in says the server did not respond",
    cause:
      "The API container may be waking from idle. Wait a few seconds and try once more before assuming the password is wrong.",
  },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function HelpView() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Reference"
        title="Help &amp; support"
        description="How the panel works, and what to check when something looks wrong."
      />

      <Card title="The life of an order">
        <p className="text-sm text-ink-500">
          An order is written to the database the moment it is placed, and gets its number then —
          before any message is sent. The database is the only record of whether an order exists.
        </p>
        <ol className="mt-4 flex flex-col gap-3">
          {PIPELINE.map(({ status, meaning }, index) => (
            <li key={status} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-600">
                {index + 1}
              </span>
              <div className="min-w-0">
                <StatusPill tone={ORDER_STATUS_TONE[status]} label={ORDER_STATUS_LABEL[status]} />
                <p className="mt-1 text-sm text-ink-600">{meaning}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-ink-500">
          An order can be cancelled from any stage before delivery. Cancelling is final — there is
          no route back, by design, so a mis-click cannot quietly resurrect an order the kitchen
          has already stopped cooking.
        </p>
      </Card>

      <Card title="What each section does">
        <ul className="flex flex-col">
          {SECTIONS.map((section) => (
            <li
              key={section.href}
              className="flex flex-col gap-1 border-b border-ink-100 py-3 last:border-0 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <Link
                href={section.href}
                className="shrink-0 text-sm font-medium text-brand-600 underline-offset-4 hover:underline sm:w-40"
              >
                {section.label}
              </Link>
              <p className="text-sm text-ink-600">{section.what}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="When something looks wrong">
        <dl className="flex flex-col">
          {TROUBLESHOOTING.map((item) => (
            <div key={item.symptom} className="border-b border-ink-100 py-3 last:border-0">
              <dt className="text-sm font-medium text-ink-900">{item.symptom}</dt>
              <dd className="mt-1 text-sm text-ink-600">{item.cause}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Still stuck">
        <p className="text-sm text-ink-600">
          For anything this page does not cover, reach the people who run the kitchen.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
          </Button>
          <Button asChild variant="outline">
            <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}>
              {siteConfig.contact.phone}
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/settings">Check connection status</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
