import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { getOrder, listOrders, updateOrder } from "./orders.controller";
import {
  listOrdersQuerySchema,
  orderIdParamSchema,
  updateOrderSchema,
} from "./orders.schema";
import { streamOrders } from "./orders.stream";

/**
 * Admin order routes, mounted at `/api/admin/orders`.
 *
 * This is the canonical path documented in docs/order-flow.md and the one the
 * admin panel calls. The older `/api/orders/admin/*` mounting still resolves to
 * the same handlers so nothing built against it breaks, but new work should use
 * this router — grouping admin surface under a single `/admin` prefix makes it
 * trivial to reason about (and to block at the edge) which routes are
 * privileged.
 */
export const adminOrdersRouter: Router = Router();

// Declared before `/:id` so the literal segment is not captured as an id.
adminOrdersRouter.get("/stream", requireAdmin, streamOrders);

adminOrdersRouter.get(
  "/",
  requireAdmin,
  validate({ query: listOrdersQuerySchema }),
  listOrders,
);

adminOrdersRouter.get(
  "/:id",
  requireAdmin,
  validate({ params: orderIdParamSchema }),
  getOrder,
);

adminOrdersRouter.patch(
  "/:id",
  requireAdmin,
  validate({ params: orderIdParamSchema, body: updateOrderSchema }),
  updateOrder,
);
