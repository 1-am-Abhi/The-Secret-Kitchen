"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, Search, ShoppingBag } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { motion, useReducedMotion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { mainNav, secondaryNav } from "@/config/navigation";
import { siteConfig, telLink } from "@/config/site";
import { selectItemCount, useCartStore } from "@/store/cart-store";
import { cn } from "@/lib/utils";

/**
 * Sticky glass navbar.
 *
 * Transparent over the hero and frosted once scrolled, so the header never
 * competes with the hero image but stays legible over page content.
 */
export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer whenever the route changes.
  React.useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[var(--ease-out-expo)]",
        scrolled ? "py-2" : "py-4",
      )}
    >
      <div className="container-page">
        <nav
          aria-label="Main"
          className={cn(
            "flex items-center justify-between gap-4 rounded-full px-4 py-2.5 transition-all duration-500 ease-[var(--ease-out-expo)] sm:px-5",
            scrolled ? "glass shadow-lift" : "bg-transparent",
          )}
        >
          <Logo />

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 lg:flex">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "text-brand-600"
                      : "text-ink-600 hover:text-ink-900",
                  )}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-full bg-brand-50"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="hidden sm:inline-flex"
              aria-label="Search the menu"
            >
              <Link href="/menu">
                <Search />
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="hidden sm:inline-flex"
              aria-label={`Call ${siteConfig.name}`}
            >
              <a href={telLink()}>
                <Phone />
              </a>
            </Button>

            <CartButton />

            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link href="/menu">Order Now</Link>
            </Button>

            {/* Mobile drawer */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[86%] max-w-sm">
                <SheetHeader>
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <Logo />
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6">
                  <ul className="flex flex-col gap-1">
                    {mainNav.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex flex-col rounded-2xl px-4 py-3 transition-colors",
                            isActive(item.href)
                              ? "bg-brand-50 text-brand-700"
                              : "text-ink-700 hover:bg-ink-50",
                          )}
                        >
                          <span className="font-medium">{item.label}</span>
                          {item.description && (
                            <span className="text-xs text-ink-400">{item.description}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <div className="my-4 h-px bg-ink-100" />

                  <ul className="flex flex-col gap-1">
                    {secondaryNav.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block rounded-2xl px-4 py-3 text-ink-600 transition-colors hover:bg-ink-50"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-2 border-t border-ink-100 p-6">
                  <Button asChild size="lg">
                    <Link href="/menu">Order Now</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/tiffin">Subscribe Tiffin</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
}

/**
 * Cart trigger with a live item count.
 *
 * The count renders only after mount: the store hydrates from localStorage on
 * the client, so rendering it during SSR would produce a hydration mismatch.
 */
function CartButton() {
  const [mounted, setMounted] = React.useState(false);
  const lines = useCartStore((state) => state.lines);
  const openCart = useCartStore((state) => state.openCart);
  const shouldReduceMotion = useReducedMotion();

  React.useEffect(() => setMounted(true), []);

  const count = mounted ? selectItemCount(lines) : 0;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={openCart}
      className="relative"
      aria-label={count > 0 ? `Open cart, ${count} items` : "Open cart"}
    >
      <ShoppingBag />
      {count > 0 && (
        <motion.span
          key={count}
          initial={shouldReduceMotion ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white ring-2 ring-white"
        >
          {count > 9 ? "9+" : count}
        </motion.span>
      )}
    </Button>
  );
}
