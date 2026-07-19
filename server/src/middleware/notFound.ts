import type { RequestHandler } from "express";

import { AppError } from "../utils/AppError";

/** Terminal 404 for unmatched routes, funnelled through the error handler. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} does not exist.`, 404, "ROUTE_NOT_FOUND"));
};
