import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { mapReview } from "../../utils/mappers";
import { paginated, toSkipTake } from "../../utils/pagination";
import type { CreateReviewInput, ListReviewsQuery, UpdateReviewInput } from "./reviews.schema";

/** Initials for the avatar when no photo exists — "Ananya Sharma" → "AS". */
function deriveInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListReviewsQuery;

  // Unmoderated submissions are only ever visible to the kitchen — a public
  // caller cannot opt into them by flipping a query flag.
  const adminView = query.includeUnpublished === "true" && Boolean(req.admin);

  const where: Prisma.ReviewWhereInput = {};
  if (!adminView) where.published = true;
  if (query.minRating) where.rating = { gte: query.minRating };
  if (query.featured) where.featured = query.featured === "true";

  const { skip, take } = toSkipTake(query);
  const [reviews, total, aggregate] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ featured: "desc" }, { reviewDate: "desc" }],
      skip,
      take,
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where: { published: true }, _avg: { rating: true }, _count: true }),
  ]);

  // Moderation state is meaningless to a customer and essential to an admin.
  const shape = adminView
    ? (review: (typeof reviews)[number]) => ({
        ...mapReview(review),
        published: review.published,
        featured: review.featured,
      })
    : mapReview;

  res.json({
    ...paginated(reviews.map(shape), total, query),
    summary: {
      // One decimal place, matching the storefront's `averageRating`.
      average: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
      count: aggregate._count,
    },
  });
});

/**
 * Public submissions land unpublished. Anyone can post, so nothing reaches the
 * storefront until an admin approves it.
 */
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateReviewInput;

  const review = await prisma.review.create({
    data: {
      name: body.name,
      role: body.role,
      location: body.location,
      rating: body.rating,
      quote: body.quote,
      initials: deriveInitials(body.name),
      reviewDate: body.reviewDate ?? new Date(),
      verified: false,
      published: false,
    },
  });

  res.status(201).json({
    data: mapReview(review),
    message: "Thanks! Your review will appear once our team has verified it.",
  });
});

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateReviewInput;

  const review = await prisma.review.update({
    where: { id: String(req.params.id) },
    data: {
      ...body,
      ...(body.name ? { initials: deriveInitials(body.name) } : {}),
    },
  });

  res.json({ data: mapReview(review) });
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  await prisma.review.delete({ where: { id: String(req.params.id) } });
  res.json({ message: "Review deleted." });
});
