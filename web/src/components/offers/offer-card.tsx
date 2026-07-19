import Link from "next/link";
import { ArrowUpRight, Gift, Percent, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import type { Offer } from "@/types";

import { CopyCodeButton } from "./copy-code-button";
import { OfferCountdown } from "./offer-countdown";
import { OfferTerms } from "./offer-terms";
import { discountCaption, discountLabel } from "./offer-utils";

const TYPE_ICON = {
  percentage: Percent,
  flat: Ticket,
  freebie: Gift,
} as const;

export function OfferCard({ offer }: { offer: Offer }) {
  const Icon = TYPE_ICON[offer.discountType];
  const isSubscription = offer.appliesTo === "subscription";

  return (
    <article className="group flex h-full flex-col rounded-3xl border border-ink-200/70 bg-white p-6 shadow-soft transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="text-right">
          <p className="font-display text-3xl leading-none text-ink-900">
            {discountLabel(offer)}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-ink-400">
            {discountCaption(offer)}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge variant={isSubscription ? "success" : "muted"} size="sm">
          {isSubscription ? "Tiffin plans" : "Menu orders"}
        </Badge>
        <Badge variant="outline" size="sm">
          Min. {formatPrice(offer.minOrder)}
        </Badge>
        {offer.maxDiscount && (
          <Badge variant="outline" size="sm">
            Up to {formatPrice(offer.maxDiscount)}
          </Badge>
        )}
      </div>

      <h3 className="mt-4 text-xl leading-snug text-ink-900">{offer.title}</h3>
      <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{offer.description}</p>

      <OfferTerms terms={offer.terms} validUntil={offer.validUntil} />

      {/* mt-auto pins the action block to the card bottom so a row of cards with
          different copy lengths still lines its buttons up. */}
      <div className="mt-auto pt-6">
        <CopyCodeButton code={offer.code} />
        <div className="mt-4 flex items-center justify-between gap-3">
          <OfferCountdown validUntil={offer.validUntil} />
          <Link
            href={isSubscription ? "/tiffin" : "/menu"}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
          >
            {isSubscription ? "View plans" : "Use it now"}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
