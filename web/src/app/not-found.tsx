import Link from "next/link";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mainNav } from "@/config/navigation";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center bg-cream py-24">
      <div className="container-page">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex size-20 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <UtensilsCrossed className="size-9" />
          </span>

          <p className="mt-8 font-display text-7xl font-bold text-brand-500">404</p>
          <h1 className="mt-3 text-3xl leading-tight text-ink-900 sm:text-4xl">
            This dish isn&apos;t on the menu
          </h1>
          <p className="mt-4 text-ink-500">
            The page you were looking for has moved or never existed. The good
            news is that everything else is still cooking.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/menu">
                <UtensilsCrossed />
                Browse the menu
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">
                <ArrowLeft />
                Back to home
              </Link>
            </Button>
          </div>

          <nav aria-label="Site sections" className="mt-12 border-t border-ink-200 pt-8">
            <p className="text-xs uppercase tracking-wide text-ink-400">
              Or try one of these
            </p>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-ink-600 underline-offset-4 transition-colors hover:text-brand-600 hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </main>
  );
}
