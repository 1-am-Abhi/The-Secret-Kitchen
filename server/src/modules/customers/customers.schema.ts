import { z } from "zod";

import { paginationSchema } from "../../utils/pagination";
import { phoneSchema } from "../orders/orders.schema";

export const listCustomersQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(80).optional(),
  sort: z.enum(["newest", "orders", "spend"]).default("newest"),
  /** Only customers with at least one delivered order. */
  hasOrders: z.enum(["true", "false"]).optional(),
});

export const customerIdParamSchema = z.object({ id: z.string().trim().min(1) });

/** Public "my orders" lookup — the phone is the guest credential. */
export const lookupCustomerSchema = z.object({
  phone: phoneSchema,
});

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type LookupCustomerInput = z.infer<typeof lookupCustomerSchema>;
