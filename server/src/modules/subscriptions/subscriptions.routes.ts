import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { publicWriteLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import {
  cancelSubscription,
  createPlan,
  createSubscription,
  getSubscription,
  listPlans,
  listSubscriptions,
  pauseSubscription,
  resumeSubscription,
  skipDelivery,
  updatePlan,
} from "./subscriptions.controller";
import {
  createPlanSchema,
  createSubscriptionSchema,
  lifecycleSchema,
  listSubscriptionsQuerySchema,
  skipSchema,
  subscriptionIdParamSchema,
  updatePlanSchema,
} from "./subscriptions.schema";

/** Mounted at /api/plans — the public tiffin plan catalogue. */
export const plansRouter: Router = Router();

plansRouter.get("/", listPlans);
plansRouter.post("/", requireAdmin, validate({ body: createPlanSchema }), createPlan);
plansRouter.patch(
  "/:id",
  requireAdmin,
  validate({ params: subscriptionIdParamSchema, body: updatePlanSchema }),
  updatePlan,
);

/** Mounted at /api/subscriptions. */
export const subscriptionsRouter: Router = Router();

subscriptionsRouter.post(
  "/",
  publicWriteLimiter,
  validate({ body: createSubscriptionSchema }),
  createSubscription,
);

subscriptionsRouter.get(
  "/admin",
  requireAdmin,
  validate({ query: listSubscriptionsQuerySchema }),
  listSubscriptions,
);

subscriptionsRouter.get(
  "/:id",
  validate({ params: subscriptionIdParamSchema }),
  getSubscription,
);

subscriptionsRouter.patch(
  "/:id/pause",
  validate({ params: subscriptionIdParamSchema, body: lifecycleSchema }),
  pauseSubscription,
);
subscriptionsRouter.patch(
  "/:id/resume",
  validate({ params: subscriptionIdParamSchema, body: lifecycleSchema }),
  resumeSubscription,
);
subscriptionsRouter.patch(
  "/:id/skip",
  validate({ params: subscriptionIdParamSchema, body: skipSchema }),
  skipDelivery,
);
subscriptionsRouter.patch(
  "/:id/cancel",
  validate({ params: subscriptionIdParamSchema, body: lifecycleSchema }),
  cancelSubscription,
);
