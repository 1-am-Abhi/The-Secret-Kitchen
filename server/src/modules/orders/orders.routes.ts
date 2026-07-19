import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { orderLimiter, trackingLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import {
  cancelOrderByNumber,
  createOrder,
  getOrder,
  listOrders,
  markHandoffOpened,
  trackOrder,
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
import { streamOrders } from "./orders.stream";

export const ordersRouter: Router = Router();

/* -------------------------------------------------------------------------- */
/* Public                                                                     */
/* -------------------------------------------------------------------------- */

ordersRouter.post("/", orderLimiter, validate({ body: createOrderSchema }), createOrder);

ordersRouter.get(
  "/track/:orderNumber",
  trackingLimiter,
  validate({ params: orderNumberParamSchema }),
  trackOrder,
);

ordersRouter.post(
  "/:orderNumber/handoff-opened",
  orderLimiter,
  validate({ params: orderNumberParamSchema }),
  markHandoffOpened,
);

ordersRouter.post(
  "/:orderNumber/cancel",
  orderLimiter,
  validate({ params: orderNumberParamSchema, body: cancelOrderSchema }),
  cancelOrderByNumber,
);

/* -------------------------------------------------------------------------- */
/* Admin — literal segments declared before `/:orderNumber` so they win        */
/* -------------------------------------------------------------------------- */

/**
 * SSE live feed.
 *
 * EventSource cannot set an Authorization header, so `requireAdmin` also
 * accepts the token from a query parameter for this route. That is a real
 * trade-off — query strings can end up in access logs — and it is acceptable
 * only because the admin token is short-lived and the connection is same-origin
 * over TLS. If that ever changes, issue a single-use stream ticket instead of
 * passing the session token.
 */
ordersRouter.get("/admin/stream", requireAdmin, streamOrders);

ordersRouter.get("/admin", requireAdmin, validate({ query: listOrdersQuerySchema }), listOrders);
ordersRouter.get("/admin/:id", requireAdmin, validate({ params: orderIdParamSchema }), getOrder);
ordersRouter.patch(
  "/admin/:id",
  requireAdmin,
  validate({ params: orderIdParamSchema, body: updateOrderSchema }),
  updateOrder,
);

/**
 * Legacy alias for the old public lookup, so any bookmarked confirmation link
 * keeps working. New clients use /track/:orderNumber.
 */
ordersRouter.get(
  "/:orderNumber",
  trackingLimiter,
  validate({ params: orderNumberParamSchema }),
  trackOrder,
);
