import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  pagination?: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
    total?: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

function buildMeta(requestId?: string): ApiMeta {
  return {
    requestId: requestId ?? crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

export function ok<T>(data: T, meta?: Partial<ApiMeta>): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { data, meta: { ...buildMeta(), ...meta } },
    { status: 200 }
  );
}

export function created<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { data, meta: buildMeta() },
    { status: 201 }
  );
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function validationError(error: ZodError): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten().fieldErrors,
      },
      meta: buildMeta(),
    },
    { status: 400 }
  );
}

export function unauthorized(message = "Authentication required"): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message }, meta: buildMeta() },
    { status: 401 }
  );
}

export function forbidden(message = "Insufficient permissions"): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: "FORBIDDEN", message }, meta: buildMeta() },
    { status: 403 }
  );
}

export function notFound(resource = "Resource"): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: `${resource} not found` }, meta: buildMeta() },
    { status: 404 }
  );
}

export function conflict(message: string): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: "CONFLICT", message }, meta: buildMeta() },
    { status: 409 }
  );
}

export function rateLimited(): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please slow down.",
      },
      meta: buildMeta(),
    },
    { status: 429 }
  );
}

export function internalError(err: unknown): NextResponse<ApiError> {
  logger.error({ msg: "Internal server error", error: err });
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again.",
      },
      meta: buildMeta(),
    },
    { status: 500 }
  );
}

export function aiUnavailable(): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: {
        code: "AI_UNAVAILABLE",
        message: "AI services are temporarily unavailable. Please try again.",
      },
      meta: buildMeta(),
    },
    { status: 503 }
  );
}
