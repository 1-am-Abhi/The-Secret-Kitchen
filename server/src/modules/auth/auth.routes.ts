import { Router } from "express";

import { requireAdmin } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { changePassword, login, me } from "./auth.controller";
import { changePasswordSchema, loginSchema } from "./auth.schema";

export const authRouter: Router = Router();

authRouter.post("/login", authLimiter, validate({ body: loginSchema }), login);
authRouter.get("/me", requireAdmin, me);
authRouter.post(
  "/change-password",
  requireAdmin,
  validate({ body: changePasswordSchema }),
  changePassword,
);
