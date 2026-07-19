import type { Metadata } from "next";

import { TrackLookup } from "@/components/tracking/track-lookup";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Track Your Order",
  description:
    "Enter your order ID to follow your Secret Kitchen order from the pass to your door, live.",
  path: "/track",
  keywords: ["track order", "order status", "food delivery tracking"],
});

export default function TrackPage() {
  return (
    <section className="pb-24 pt-32 lg:pt-40">
      <div className="container-page">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-4xl leading-tight text-ink-900 sm:text-5xl">Track your order</h1>
          <p className="mt-3 leading-relaxed text-ink-500">
            Live status, straight from the kitchen — from the moment your order is confirmed to
            the moment it reaches your door.
          </p>
        </div>

        <div className="mt-10">
          <TrackLookup />
        </div>
      </div>
    </section>
  );
}
