import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { publicWriteLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { createEnquiry, listEnquiries, updateEnquiry } from "./enquiries.controller";
import {
  createEnquirySchema,
  enquiryIdParamSchema,
  listEnquiriesQuerySchema,
  updateEnquirySchema,
} from "./enquiries.schema";

export const enquiriesRouter: Router = Router();

enquiriesRouter.post("/", publicWriteLimiter, validate({ body: createEnquirySchema }), createEnquiry);

enquiriesRouter.get("/", requireAdmin, validate({ query: listEnquiriesQuerySchema }), listEnquiries);
enquiriesRouter.patch(
  "/:id",
  requireAdmin,
  validate({ params: enquiryIdParamSchema, body: updateEnquirySchema }),
  updateEnquiry,
);
