import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { publicWriteLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { listSubscribers, subscribe, unsubscribe } from "./newsletter.controller";
import {
  listSubscribersQuerySchema,
  subscribeSchema,
  unsubscribeSchema,
} from "./newsletter.schema";

export const newsletterRouter: Router = Router();

newsletterRouter.post("/", publicWriteLimiter, validate({ body: subscribeSchema }), subscribe);
newsletterRouter.post(
  "/unsubscribe",
  publicWriteLimiter,
  validate({ body: unsubscribeSchema }),
  unsubscribe,
);

newsletterRouter.get(
  "/subscribers",
  requireAdmin,
  validate({ query: listSubscribersQuerySchema }),
  listSubscribers,
);
