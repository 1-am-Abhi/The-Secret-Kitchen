import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { dashboard } from "./analytics.controller";
import { dashboardQuerySchema } from "./analytics.schema";

export const analyticsRouter: Router = Router();

analyticsRouter.get(
  "/dashboard",
  requireAdmin,
  validate({ query: dashboardQuerySchema }),
  dashboard,
);
