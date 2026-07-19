import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Your Cart",
  description: "Review your order from The Secret Kitchen before checking out.",
  path: "/cart",
  // A personalised cart has no business in search results.
  noIndex: true,
});

export default function CartPage() {
  return (
    <section className="pb-24 pt-32 lg:pt-40">
      <div className="container-page">
        <h1 className="text-4xl leading-tight text-ink-900 sm:text-5xl">Your cart</h1>
        <p className="mt-3 text-ink-500">
          Review everything before you pay. Nothing is cooked until you confirm.
        </p>

        <div className="mt-10">
          <CartView />
        </div>
      </div>
    </section>
  );
}
