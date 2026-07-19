import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createCategory,
  createMenuItem,
  deleteCategory,
  deleteMenuItem,
  getMenuItem,
  listCategories,
  listMenu,
  updateCategory,
  updateMenuItem,
} from "./menu.controller";
import {
  createCategorySchema,
  createMenuItemSchema,
  idParamSchema,
  listMenuQuerySchema,
  slugParamSchema,
  updateCategorySchema,
  updateMenuItemSchema,
} from "./menu.schema";

export const menuRouter: Router = Router();

/* Public */
menuRouter.get("/", validate({ query: listMenuQuerySchema }), listMenu);
menuRouter.get("/categories", listCategories);

/* Admin — declared before the `/:slug` catch-all so "items" is not read as a slug. */
menuRouter.post("/items", requireAdmin, validate({ body: createMenuItemSchema }), createMenuItem);
menuRouter.patch(
  "/items/:id",
  requireAdmin,
  validate({ params: idParamSchema, body: updateMenuItemSchema }),
  updateMenuItem,
);
menuRouter.delete("/items/:id", requireAdmin, validate({ params: idParamSchema }), deleteMenuItem);

menuRouter.post(
  "/categories",
  requireAdmin,
  validate({ body: createCategorySchema }),
  createCategory,
);
menuRouter.patch(
  "/categories/:id",
  requireAdmin,
  validate({ params: idParamSchema, body: updateCategorySchema }),
  updateCategory,
);
menuRouter.delete(
  "/categories/:id",
  requireAdmin,
  validate({ params: idParamSchema }),
  deleteCategory,
);

menuRouter.get("/:slug", validate({ params: slugParamSchema }), getMenuItem);
