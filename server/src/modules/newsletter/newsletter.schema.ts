import { z } from "zod";

import { paginationSchema } from "../../utils/pagination";

export const subscribeSchema = z.object({
  email: z.string().email("Enter a valid email address.").toLowerCase().trim(),
  name: z.string().trim().max(80).optional(),
  /** Where the signup came from — footer, popup, checkout … */
  source: z.string().trim().max(60).optional(),
});

export const unsubscribeSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const listSubscribersQuerySchema = paginationSchema.extend({
  subscribed: z.enum(["true", "false", "all"]).default("true"),
  search: z.string().trim().min(1).max(80).optional(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;
export type ListSubscribersQuery = z.infer<typeof listSubscribersQuerySchema>;
