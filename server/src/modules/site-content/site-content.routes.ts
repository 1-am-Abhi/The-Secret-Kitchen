import { Router } from "express";

import { attachAdmin, requireAdmin } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  deleteContent,
  getContent,
  listContent,
  upsertContent,
} from "./site-content.controller";
import {
  contentKeyParamSchema,
  listContentQuerySchema,
  upsertContentSchema,
} from "./site-content.schema";

export const siteContentRouter: Router = Router();

siteContentRouter.get("/", attachAdmin, validate({ query: listContentQuerySchema }), listContent);
siteContentRouter.get("/:key", validate({ params: contentKeyParamSchema }), getContent);

siteContentRouter.put(
  "/:key",
  requireAdmin,
  validate({ params: contentKeyParamSchema, body: upsertContentSchema }),
  upsertContent,
);
siteContentRouter.delete(
  "/:key",
  requireAdmin,
  validate({ params: contentKeyParamSchema }),
  deleteContent,
);
