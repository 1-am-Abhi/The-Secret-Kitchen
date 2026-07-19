import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createSpecial,
  deleteSpecial,
  getTodaysSpecials,
  listSpecials,
  updateSpecial,
} from "./specials.controller";
import {
  createSpecialSchema,
  specialIdParamSchema,
  specialsQuerySchema,
  updateSpecialSchema,
} from "./specials.schema";

export const specialsRouter: Router = Router();

specialsRouter.get("/today", validate({ query: specialsQuerySchema }), getTodaysSpecials);

specialsRouter.get("/", requireAdmin, listSpecials);
specialsRouter.post("/", requireAdmin, validate({ body: createSpecialSchema }), createSpecial);
specialsRouter.patch(
  "/:id",
  requireAdmin,
  validate({ params: specialIdParamSchema, body: updateSpecialSchema }),
  updateSpecial,
);
specialsRouter.delete(
  "/:id",
  requireAdmin,
  validate({ params: specialIdParamSchema }),
  deleteSpecial,
);
