import { Router } from "express";

import { env } from "../config/env";
import { pingDatabase } from "../config/prisma";
import { analyticsRouter } from "../modules/analytics/analytics.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { contentRouter } from "../modules/content/content.routes";
import { customersRouter } from "../modules/customers/customers.routes";
import { enquiriesRouter } from "../modules/enquiries/enquiries.routes";
import { galleryRouter } from "../modules/gallery/gallery.routes";
import { menuRouter } from "../modules/menu/menu.routes";
import { newsletterRouter } from "../modules/newsletter/newsletter.routes";
import { offersRouter } from "../modules/offers/offers.routes";
import { adminOrdersRouter } from "../modules/orders/orders.admin.routes";
import { ordersRouter } from "../modules/orders/orders.routes";
import { reviewsRouter } from "../modules/reviews/reviews.routes";
import { specialsRouter } from "../modules/specials/specials.routes";
import {
  plansRouter,
  subscriptionsRouter,
} from "../modules/subscriptions/subscriptions.routes";

export const apiRouter: Router = Router();

/**
 * Health check. Pings the database rather than returning a static 200, because
 * an API that cannot reach Postgres is not healthy — and the platform's
 * autoscaler needs to know that before it routes traffic to this instance.
 */
apiRouter.get("/health", async (_req, res) => {
  const databaseUp = await pingDatabase();
  res.status(databaseUp ? 200 : 503).json({
    status: databaseUp ? "ok" : "degraded",
    service: "the-secret-kitchen-api",
    environment: env.NODE_ENV,
    database: databaseUp ? "up" : "down",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/menu", menuRouter);
apiRouter.use("/specials", specialsRouter);
apiRouter.use("/plans", plansRouter);
apiRouter.use("/subscriptions", subscriptionsRouter);
apiRouter.use("/orders", ordersRouter);
// Canonical admin surface. Grouping privileged routes under one prefix makes
// them easy to reason about and to restrict at the edge.
apiRouter.use("/admin/orders", adminOrdersRouter);
apiRouter.use("/customers", customersRouter);
apiRouter.use("/offers", offersRouter);
apiRouter.use("/reviews", reviewsRouter);
apiRouter.use("/gallery", galleryRouter);
apiRouter.use("/newsletter", newsletterRouter);
apiRouter.use("/enquiries", enquiriesRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/", contentRouter);
