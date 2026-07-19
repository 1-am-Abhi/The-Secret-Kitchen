import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Checkout",
  description: "Complete your order from The Secret Kitchen.",
  path: "/checkout",
  noIndex: true,
});

export default function CheckoutPage() {
  return (
    <section className="pb-24 pt-32 lg:pt-40">
      <div className="container-page">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl leading-tight text-ink-900 sm:text-5xl">Checkout</h1>
            <p className="mt-3 text-ink-500">
              Three quick steps and your food goes straight to the pass.
            </p>
          </div>
          <p className="flex items-center gap-2 text-sm text-fresh-700">
            <ShieldCheck className="size-4" />
            Secure checkout · FSSAI licensed kitchen
          </p>
        </div>

        <div className="mt-10">
          <CheckoutFlow />
        </div>
      </div>
    </section>
  );
}
