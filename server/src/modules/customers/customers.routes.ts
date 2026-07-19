import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { publicWriteLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { getCustomer, listCustomers, lookupByPhone } from "./customers.controller";
import {
  customerIdParamSchema,
  listCustomersQuerySchema,
  lookupCustomerSchema,
} from "./customers.schema";

export const customersRouter: Router = Router();

customersRouter.post(
  "/lookup",
  publicWriteLimiter,
  validate({ body: lookupCustomerSchema }),
  lookupByPhone,
);

customersRouter.get("/", requireAdmin, validate({ query: listCustomersQuerySchema }), listCustomers);
customersRouter.get("/:id", requireAdmin, validate({ params: customerIdParamSchema }), getCustomer);
