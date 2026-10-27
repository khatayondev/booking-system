import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function successResponse<T>(data: T, message?: string, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message ? { message } : {}),
    },
    { status }
  );
}

export function errorResponse(
  message: string,
  code = "INTERNAL_SERVER_ERROR",
  status = 500,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

/**
 * Handles errors for routes that cannot use withErrorHandler due to dynamic parameter signatures.
 */
export function handleRouteError(err: unknown) {
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.code}]: ${err.message}`, {
      details: err.details,
    });
    return errorResponse(err.message, err.code, err.statusCode, err.details);
  }

  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    logger.warn("Validation error in API route", { issues });
    return errorResponse("Validation failed", "VALIDATION_ERROR", 422, issues);
  }

  logger.error("Unhandled API error", err);
  return errorResponse(
    process.env.NODE_ENV === "production" ? "Internal server error" : String(err),
    "INTERNAL_SERVER_ERROR",
    500
  );
}

/**
 * Higher-order wrapper for API route handlers to guarantee consistent error handling and logging.
 */
export function withErrorHandler<T>(
  handler: (req: Request) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (req: Request): Promise<NextResponse<ApiResponse<T>>> => {
    try {
      return await handler(req);
    } catch (err) {
      return handleRouteError(err) as NextResponse<ApiResponse<T>>;
    }
  };
}

