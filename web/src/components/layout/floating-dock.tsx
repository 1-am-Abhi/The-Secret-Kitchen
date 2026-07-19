"use client";

import * as React from "react";
import { ArrowUp, MessageCircle, Phone, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import { motion } from "@/components/motion";
import { siteConfig, telLink, whatsappLink } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Floating action dock: WhatsApp, call and back-to-top.
 *
 * On mobile the actions collapse behind a single toggle so they never obscure
 * content; on desktop they stack permanently in the corner.
 */
export function FloatingDock() {
  const [showTop, setShowTop] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () =>
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });

  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-8 sm:right-6">
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            onClick={scrollToTop}
            aria-label="Scroll back to top"
            className="flex size-11 items-center justify-center rounded-full glass text-ink-700 shadow-lift transition-colors hover:bg-white hover:text-brand-600"
          >
            <ArrowUp className="size-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Secondary actions — always visible on desktop, toggled on mobile. */}
      <AnimatePresence>
        {expanded && (
          <motion.a
            key="call"
            initial={{ opacity: 0, scale: 0.6, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            href={telLink()}
            aria-label={`Call ${siteConfig.name}`}
            className="flex size-12 items-center justify-center rounded-full bg-ink-800 text-white shadow-lift transition-colors hover:bg-ink-900 sm:hidden"
          >
            <Phone className="size-5" />
          </motion.a>
        )}
      </AnimatePresence>

      <a
        href={telLink()}
        aria-label={`Call ${siteConfig.name}`}
        className="hidden size-12 items-center justify-center rounded-full bg-ink-800 text-white shadow-lift transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink-900 sm:flex"
      >
        <Phone className="size-5" />
      </a>

      <a
        href={whatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className={cn(
          "group relative flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_36px_-6px_rgb(37_211_102/0.55)] transition-all duration-300 hover:-translate-y-0.5",
          !expanded && "max-sm:hidden",
        )}
      >
        {/* Pulsing halo draws the eye without being loud. */}
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40 [animation-duration:2.5s]" />
        <MessageCircle className="size-6" />
      </a>

      {/* Mobile toggle */}
      <button
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-label={expanded ? "Hide contact options" : "Show contact options"}
        className="flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[var(--shadow-glow)] transition-transform sm:hidden"
      >
        {expanded ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
