import { z } from "zod";

import { paginationSchema } from "../../utils/pagination";
import { phoneSchema } from "../orders/orders.schema";

export const createEnquirySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: phoneSchema,
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(2000),
  /** Honeypot: real users never fill a hidden field. */
  website: z.string().max(0).optional(),
});

export const listEnquiriesQuerySchema = paginationSchema.extend({
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]).optional(),
  search: z.string().trim().min(1).max(80).optional(),
});

export const updateEnquirySchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const enquiryIdParamSchema = z.object({ id: z.string().trim().min(1) });

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
export type ListEnquiriesQuery = z.infer<typeof listEnquiriesQuerySchema>;
export type UpdateEnquiryInput = z.infer<typeof updateEnquirySchema>;
