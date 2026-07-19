import { Suspense } from "react";
import type { Metadata } from "next";

import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Order Confirmed",
  description: "Your order from The Secret Kitchen has been confirmed.",
  path: "/checkout/success",
  noIndex: true,
});

export default function CheckoutSuccessPage() {
  return (
    <section className="pb-24 pt-32 lg:pt-40">
      <div className="container-page">
        {/* useSearchParams needs a Suspense boundary during prerender. */}
        <Suspense fallback={<div className="shimmer mx-auto h-96 max-w-2xl rounded-3xl" />}>
          <OrderConfirmation />
        </Suspense>
      </div>
    </section>
  );
}
