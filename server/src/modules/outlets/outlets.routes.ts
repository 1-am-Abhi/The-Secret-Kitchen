import { Router } from "express";

import { attachAdmin, requireAdmin } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  checkCoverage,
  createDeliveryArea,
  createOutlet,
  deleteDeliveryArea,
  deleteOutlet,
  listOutlets,
  updateDeliveryArea,
  updateOutlet,
} from "./outlets.controller";
import {
  areaIdParamSchema,
  coverageQuerySchema,
  createDeliveryAreaSchema,
  createOutletSchema,
  listOutletsQuerySchema,
  outletIdParamSchema,
  updateDeliveryAreaSchema,
  updateOutletSchema,
} from "./outlets.schema";

export const outletsRouter: Router = Router();

outletsRouter.get("/", attachAdmin, validate({ query: listOutletsQuerySchema }), listOutlets);
outletsRouter.get("/coverage", validate({ query: coverageQuerySchema }), checkCoverage);

outletsRouter.post("/", requireAdmin, validate({ body: createOutletSchema }), createOutlet);
outletsRouter.patch(
  "/:id",
  requireAdmin,
  validate({ params: outletIdParamSchema, body: updateOutletSchema }),
  updateOutlet,
);
outletsRouter.delete(
  "/:id",
  requireAdmin,
  validate({ params: outletIdParamSchema }),
  deleteOutlet,
);

outletsRouter.post(
  "/:id/areas",
  requireAdmin,
  validate({ params: outletIdParamSchema, body: createDeliveryAreaSchema }),
  createDeliveryArea,
);
outletsRouter.patch(
  "/:id/areas/:areaId",
  requireAdmin,
  validate({ params: areaIdParamSchema, body: updateDeliveryAreaSchema }),
  updateDeliveryArea,
);
outletsRouter.delete(
  "/:id/areas/:areaId",
  requireAdmin,
  validate({ params: areaIdParamSchema }),
  deleteDeliveryArea,
);
