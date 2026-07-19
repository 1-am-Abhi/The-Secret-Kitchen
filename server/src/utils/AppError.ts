/**
 * The only error type route handlers are expected to throw. Everything the
 * central handler needs to build the `{ message, code?, details? }` response
 * lives on the instance, so no handler ever writes a response itself.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  /** Distinguishes errors we raised deliberately from genuine crashes. */
  readonly isOperational = true;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, "BAD_REQUEST", details);
  }

  static unauthorized(message = "Authentication required."): AppError {
    return new AppError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message = "You do not have access to this resource."): AppError {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static notFound(message = "Resource not found."): AppError {
    return new AppError(message, 404, "NOT_FOUND");
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, 409, "CONFLICT", details);
  }

  static unprocessable(message: string, details?: unknown): AppError {
    return new AppError(message, 422, "UNPROCESSABLE_ENTITY", details);
  }

  static internal(message = "Something went wrong."): AppError {
    return new AppError(message, 500, "INTERNAL_ERROR");
  }
}
