import type { Metadata } from "next";
import Link from "next/link";

import { OrderTracker } from "@/components/tracking/order-tracker";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { isValidOrderNumber, normaliseOrderNumber } from "@/lib/orders";

interface TrackDetailPageProps {
  params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata({ params }: TrackDetailPageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  const normalised = normaliseOrderNumber(decodeURIComponent(orderNumber));

  return buildMetadata({
    title: `Order ${normalised}`,
    description: "Live status for your Secret Kitchen order.",
    path: `/track/${normalised}`,
    // An order number is the only credential for this page, so it must never
    // reach a search index or a crawler's cache.
    noIndex: true,
  });
}

export default async function TrackDetailPage({ params }: TrackDetailPageProps) {
  const { orderNumber } = await params;
  const normalised = normaliseOrderNumber(decodeURIComponent(orderNumber));

  // Shape is checked on the server so a junk URL never triggers an API call.
  if (!isValidOrderNumber(normalised)) {
    return (
      <section className="pb-24 pt-32 lg:pt-40">
        <div className="container-page">
          <div className="mx-auto max-w-xl rounded-3xl border border-ink-200/70 bg-white p-8 text-center shadow-soft">
            <h1 className="font-display text-2xl text-ink-900">That is not an order ID</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-600">
              Our order IDs look like <span className="font-mono">TSK-2026-00041</span>. Check the
              confirmation screen or your WhatsApp message and try again.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/track">Look up an order</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pb-24 pt-32 lg:pt-40">
      <div className="container-page">
        <OrderTracker orderNumber={normalised} />
      </div>
    </section>
  );
}
