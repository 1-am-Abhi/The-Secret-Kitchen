import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 does not await handlers, so a rejected promise inside an async
 * controller would otherwise become an unhandled rejection instead of a 500.
 * Wrapping forwards the rejection to the central error handler.
 */
export function asyncHandler<Req extends Request = Request>(
  handler: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req as Req, res, next).catch(next);
  };
}
