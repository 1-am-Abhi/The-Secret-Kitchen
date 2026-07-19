import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { couponLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { createOffer, deleteOffer, listOffers, updateOffer, validateCoupon } from "./offers.controller";
import {
  createOfferSchema,
  listOffersQuerySchema,
  offerIdParamSchema,
  updateOfferSchema,
  validateCouponSchema,
} from "./offers.schema";

export const offersRouter: Router = Router();

offersRouter.get("/", validate({ query: listOffersQuerySchema }), listOffers);
offersRouter.post(
  "/validate",
  couponLimiter,
  validate({ body: validateCouponSchema }),
  validateCoupon,
);

offersRouter.post("/", requireAdmin, validate({ body: createOfferSchema }), createOffer);
offersRouter.patch(
  "/:id",
  requireAdmin,
  validate({ params: offerIdParamSchema, body: updateOfferSchema }),
  updateOffer,
);
offersRouter.delete("/:id", requireAdmin, validate({ params: offerIdParamSchema }), deleteOffer);
