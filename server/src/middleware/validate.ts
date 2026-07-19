import type { RequestHandler } from "express";
import { ZodError, type ZodTypeAny, type z } from "zod";

import { AppError } from "../utils/AppError";

/**
 * Zod request validation. The parsed (and therefore coerced/defaulted) result
 * is written back onto the request, so controllers read normalised values —
 * `req.query.page` is a number, not the string Express handed us.
 */

export interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function issuesFrom(error: ZodError, source: string): Array<Record<string, string>> {
  return error.issues.map((issue) => ({
    source,
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const problems: Array<Record<string, string>> = [];

    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    } catch (error) {
      if (error instanceof ZodError) problems.push(...issuesFrom(error, "params"));
      else return next(error);
    }

    try {
      if (schemas.query) {
        // Express 5 makes req.query a getter; assigning through
        // Object.defineProperty keeps this forward-compatible.
        const parsed = schemas.query.parse(req.query) as typeof req.query;
        Object.defineProperty(req, "query", { value: parsed, writable: true, configurable: true });
      }
    } catch (error) {
      if (error instanceof ZodError) problems.push(...issuesFrom(error, "query"));
      else return next(error);
    }

    try {
      if (schemas.body) req.body = schemas.body.parse(req.body) as unknown;
    } catch (error) {
      if (error instanceof ZodError) problems.push(...issuesFrom(error, "body"));
      else return next(error);
    }

    if (problems.length) {
      return next(new AppError("Validation failed.", 422, "VALIDATION_ERROR", problems));
    }
    return next();
  };
}

/** Helper for controllers: `const body = parsed<typeof schema>(req.body)`. */
export type Infer<T extends ZodTypeAny> = z.infer<T>;
