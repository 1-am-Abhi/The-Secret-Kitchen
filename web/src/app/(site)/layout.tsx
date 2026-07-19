import { Toaster } from "sonner";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { FloatingDock } from "@/components/layout/floating-dock";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

/**
 * Storefront shell.
 *
 * Lives in a route group so the admin panel can render its own chrome without
 * inheriting the customer navbar, footer or floating dock.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />

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
    </div>
  );
}
