import { ChevronDown } from "lucide-react";

import { cn, formatDate } from "@/lib/utils";

/**
 * Collapsible terms.
 *
 * Native <details>/<summary> instead of the Radix Accordion: it is keyboard and
 * screen-reader accessible with zero JavaScript, which keeps the whole offer
 * card a server component. Only the copy button and countdown need to ship JS.
 */
export function OfferTerms({
  terms,
  validUntil,
  tone = "light",
}: {
  terms: string[];
  validUntil: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <details className="group mt-5">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors [&::-webkit-details-marker]:hidden",
          dark ? "text-white/60 hover:text-white" : "text-ink-400 hover:text-ink-700",
        )}
      >
        Terms &amp; conditions
        <ChevronDown
          className="size-4 transition-transform duration-300 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul
        className={cn(
          "mt-3 space-y-2 text-sm leading-relaxed",
          dark ? "text-white/70" : "text-ink-600",
        )}
      >
        {terms.map((term) => (
          <li key={term} className="flex gap-2.5">
            <span
              aria-hidden
              className={cn(
                "mt-2 size-1 shrink-0 rounded-full",
                dark ? "bg-white/40" : "bg-brand-400",
              )}
            />
            {term}
          </li>
        ))}
        <li className="flex gap-2.5">
          <span
            aria-hidden
            className={cn("mt-2 size-1 shrink-0 rounded-full", dark ? "bg-white/40" : "bg-brand-400")}
          />
          Offer valid until {formatDate(validUntil)}
        </li>
      </ul>
    </details>
  );
}
