import { z } from "zod";

import { paginationSchema } from "../../utils/pagination";

export const listReviewsQuerySchema = paginationSchema.extend({
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  featured: z.enum(["true", "false"]).optional(),
  includeUnpublished: z.enum(["true", "false"]).default("false"),
});

export const createReviewSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().max(80).default("Customer"),
  location: z.string().trim().min(2).max(120),
  rating: z.number().int().min(1).max(5),
  quote: z.string().trim().min(10).max(1000),
  reviewDate: z.coerce.date().optional(),
  verified: z.boolean().default(false),
});

export const updateReviewSchema = createReviewSchema
  .partial()
  .extend({ published: z.boolean().optional(), featured: z.boolean().optional() });

export const reviewIdParamSchema = z.object({ id: z.string().trim().min(1) });

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
