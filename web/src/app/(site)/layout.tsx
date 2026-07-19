import { DeferredChrome } from "@/components/layout/deferred-chrome";
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

      {/* Cart drawer, floating dock and toasts — loaded off the critical path. */}
      <DeferredChrome />
    </div>
  );
}
