import Link from "next/link";
import { BadgeCheck, MessageSquarePlus, Quote, Star } from "lucide-react";

import { Section, SectionHeading } from "@/components/layout/section";
import { Marquee } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { getPublishedReviews, type PublicReview } from "@/lib/storefront-data";
import { cn } from "@/lib/utils";

/**
 * Customer reviews.
 *
 * Every card here is a moderated row in Postgres written by a real customer.
 * There is no sample set behind this component: until someone reviews us the
 * section renders an invitation to be the first, which is the truthful version
 * of social proof for a kitchen that does not have any yet.
 */
export async function Testimonials() {
  const { reviews, average, count } = await getPublishedReviews(12);

  if (reviews.length === 0) {
    return (
      <Section tone="muted">
        <div className="container-page">
          <SectionHeading
            eyebrow="Customer reviews"
            title="No customer reviews yet"
            description="Be the first customer to review us — order a meal and tell us honestly how it was."
          />
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg">
              <Link href="/menu">
                <MessageSquarePlus />
                Order and leave the first review
              </Link>
            </Button>
          </div>
        </div>
      </Section>
    );
  }

  const mid = Math.ceil(reviews.length / 2);
  const rowOne = reviews.slice(0, mid);
  const rowTwo = reviews.slice(mid);

  return (
    <Section tone="muted" className="overflow-hidden">
      <div className="container-page">
        <SectionHeading
          eyebrow="Customer reviews"
          title="What our customers actually said"
          description={
            average === null
              ? `${count.toLocaleString("en-IN")} verified ${count === 1 ? "review" : "reviews"} from real orders.`
              : `Rated ${average} out of 5 across ${count.toLocaleString("en-IN")} verified ${count === 1 ? "review" : "reviews"}.`
          }
        />
      </div>

      <div className="mt-14 flex flex-col gap-5">
        <Marquee speed={64}>
          {rowOne.map((review) => (
            <ReviewCard key={review.id} review={review} className="mx-2.5" />
          ))}
        </Marquee>

        {/* Second row runs slower and starts offset so the two never align.
            Skipped when there is only enough feedback to fill one row. */}
        {rowTwo.length > 0 && (
          <Marquee speed={78} className="[direction:rtl]">
            {rowTwo.map((review) => (
              <ReviewCard key={review.id} review={review} className="mx-2.5 [direction:ltr]" />
            ))}
          </Marquee>
        )}
      </div>
    </Section>
  );
}

function ReviewCard({ review, className }: { review: PublicReview; className?: string }) {
  return (
    <figure
      className={cn(
        "flex w-[19rem] shrink-0 flex-col rounded-3xl border border-ink-200/60 bg-white p-6 shadow-soft transition-shadow duration-500 hover:shadow-lift sm:w-[22rem]",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={cn(
                "size-3.5",
                index < review.rating
                  ? "fill-brand-400 text-brand-400"
                  : "fill-ink-200 text-ink-200",
              )}
            />
          ))}
        </div>
        <Quote className="size-7 text-brand-100" />
      </div>

      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-600">
        &ldquo;{review.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-sm font-semibold text-brand-700">
          {review.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-ink-900">{review.name}</span>
            {review.verified && (
              <BadgeCheck
                className="size-3.5 shrink-0 text-fresh-500"
                aria-label="Verified order"
              />
            )}
          </span>
          {/* Role and location are optional on a submission; a missing one is
              simply absent rather than filled in with something plausible. */}
          {(review.role || review.location) && (
            <span className="block truncate text-xs text-ink-400">
              {[review.role, review.location].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}
