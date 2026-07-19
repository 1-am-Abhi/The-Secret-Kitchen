import { z } from "zod";

export const dashboardQuerySchema = z.object({
  /** Trailing window for revenue/growth series. */
  days: z.coerce.number().int().min(7).max(365).default(30),
  topDishes: z.coerce.number().int().min(1).max(25).default(8),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
