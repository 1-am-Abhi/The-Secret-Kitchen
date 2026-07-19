import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { orderLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import {
  cancelOrderByNumber,
  createOrder,
  getOrder,
  getOrderByNumber,
  listOrders,
  updateOrder,
} from "./orders.controller";
import {
  cancelOrderSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  orderNumberParamSchema,
  updateOrderSchema,
} from "./orders.schema";

export const ordersRouter: Router = Router();

/* Public */
ordersRouter.post("/", orderLimiter, validate({ body: createOrderSchema }), createOrder);

/* Admin — before `/:orderNumber` so the literal segments win. */
ordersRouter.get("/admin", requireAdmin, validate({ query: listOrdersQuerySchema }), listOrders);
ordersRouter.get("/admin/:id", requireAdmin, validate({ params: orderIdParamSchema }), getOrder);
ordersRouter.patch(
  "/admin/:id",
  requireAdmin,
  validate({ params: orderIdParamSchema, body: updateOrderSchema }),
  updateOrder,
);

ordersRouter.get("/:orderNumber", validate({ params: orderNumberParamSchema }), getOrderByNumber);
ordersRouter.post(
  "/:orderNumber/cancel",
  orderLimiter,
  validate({ params: orderNumberParamSchema, body: cancelOrderSchema }),
  cancelOrderByNumber,
);
