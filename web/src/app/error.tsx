"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Home, Phone, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteConfig, telLink } from "@/config/site";

/**
 * Root error boundary.
 *
 * Never surfaces the raw error text to customers — a stack trace is noise to
 * them and can leak internals. The digest is shown instead so support can
 * correlate a report with the server log.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center bg-cream py-24">
      <div className="container-page">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex size-20 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle className="size-9" />
          </span>

          <h1 className="mt-8 text-3xl leading-tight text-ink-900 sm:text-4xl">
            Something went wrong in our kitchen
          </h1>
          <p className="mt-4 text-ink-500">
            An unexpected error stopped that page from loading. Your cart is
            safe — try again, and if it keeps happening just call us and
            we&apos;ll take your order over the phone.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={reset}>
              <RotateCcw />
              Try again
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">
                <Home />
                Back to home
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href={telLink()}>
                <Phone />
                {siteConfig.contact.phone}
              </a>
            </Button>
          </div>

          {error.digest && (
            <p className="mt-8 text-xs text-ink-400">
              Reference code: <code className="font-mono">{error.digest}</code>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
