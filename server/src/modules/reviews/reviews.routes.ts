import { Router } from "express";

import { attachAdmin, requireAdmin } from "../../middleware/auth";
import { publicWriteLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { createReview, deleteReview, listReviews, updateReview } from "./reviews.controller";
import {
  createReviewSchema,
  listReviewsQuerySchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from "./reviews.schema";

export const reviewsRouter: Router = Router();

reviewsRouter.get("/", attachAdmin, validate({ query: listReviewsQuerySchema }), listReviews);
reviewsRouter.post("/", publicWriteLimiter, validate({ body: createReviewSchema }), createReview);

reviewsRouter.patch(
  "/:id",
  requireAdmin,
  validate({ params: reviewIdParamSchema, body: updateReviewSchema }),
  updateReview,
);
reviewsRouter.delete("/:id", requireAdmin, validate({ params: reviewIdParamSchema }), deleteReview);
