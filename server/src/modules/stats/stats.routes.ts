import { Router } from "express";

import { publicStats } from "./stats.controller";

export const statsRouter: Router = Router();

statsRouter.get("/", publicStats);
