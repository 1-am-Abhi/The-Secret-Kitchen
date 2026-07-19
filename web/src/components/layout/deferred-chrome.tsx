"use client";

import dynamic from "next/dynamic";

/**
 * Chrome that is never needed for first paint.
 *
 * The cart drawer, floating dock and toast host together pull in Radix Dialog,
 * Framer Motion and Sonner. None of them are visible on load — the drawer opens
 * on click, the dock fades in after 600px of scroll, and a toast only exists
 * once something has happened. Loading them in a separate chunk keeps that
 * weight off the critical path on every single page.
 *
 * `ssr: false` is correct here: all three are purely client-interactive and
 * render nothing meaningful in the initial HTML.
 */

const CartDrawer = dynamic(
  () => import("@/components/cart/cart-drawer").then((mod) => mod.CartDrawer),
  { ssr: false },
);

const FloatingDock = dynamic(
  () => import("@/components/layout/floating-dock").then((mod) => mod.FloatingDock),
  { ssr: false },
);

const Toaster = dynamic(() => import("sonner").then((mod) => mod.Toaster), {
  ssr: false,
});

export function DeferredChrome() {
  return (
    <>
      <FloatingDock />
      <CartDrawer />
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "rounded-2xl border-ink-200 shadow-lift font-sans",
          },
        }}
      />
    </>
  );
}
