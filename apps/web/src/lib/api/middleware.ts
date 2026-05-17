import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { getRateLimiters } from "@/lib/cache/redis";
import { unauthorized, forbidden, rateLimited, internalError } from "./response";
import { logger } from "@/lib/logger";
import type { NextResponse } from "next/server";
import type { UserRole, PlanTier } from "@prisma/client";

export interface AuthContext {
  userId: string;
  clerkId: string;
  role: UserRole;
  plan: PlanTier;
}

type RouteHandler = (
  req: Request,
  ctx: AuthContext,
  params?: Record<string, string>
) => Promise<Response>;

/**
 * Wraps a route handler with auth, rate limiting, and error handling.
 * Supports both sync and async params (Next.js 15 made params async).
 */
export function withAuth(handler: RouteHandler) {
  return async (req: Request, context: { params: Promise<Record<string, string>> }) => {
    try {
      const params = await context.params;
      const { userId: clerkId } = await auth();

      if (!clerkId) {
        return unauthorized();
      }

      const user = await db.user.findUnique({
        where: { clerkId },
        select: { id: true, clerkId: true, role: true, plan: true, deletedAt: true },
      });

      if (!user || user.deletedAt) {
        return unauthorized("Account not found or has been deleted");
      }

      // Rate limit by plan (no-op when Redis is not configured)
      const limiters = await getRateLimiters();
      const limiter = limiters[user.plan.toLowerCase() as keyof typeof limiters] ?? limiters.free;
      if (limiter) {
        const identifier = `${user.id}:${req.method}`;
        const { success, limit, remaining, reset } = await limiter.limit(identifier);

        if (!success) {
          const response = rateLimited();
          response.headers.set("X-RateLimit-Limit", String(limit));
          response.headers.set("X-RateLimit-Remaining", String(remaining));
          response.headers.set("X-RateLimit-Reset", String(reset));
          return response;
        }
      }

      const ctx: AuthContext = {
        userId: user.id,
        clerkId: user.clerkId,
        role: user.role,
        plan: user.plan,
      };

      return handler(req, ctx, params ?? undefined);
    } catch (err) {
      logger.error({ msg: "Route handler error", error: err });
      return internalError(err);
    }
  };
}

/**
 * Admin-only route guard.
 */
export function withAdmin(handler: RouteHandler) {
  return withAuth(async (req, ctx, params) => {
    if (ctx.role !== "ADMIN" && ctx.role !== "SUPER_ADMIN") {
      return forbidden("Admin access required");
    }
    return handler(req, ctx, params);
  });
}

/**
 * AI-endpoint rate limiter (stricter).
 */
export function withAIRateLimit(handler: RouteHandler) {
  return withAuth(async (req, ctx, params) => {
    const limiters = await getRateLimiters();
    if (limiters.ai) {
      const { success } = await limiters.ai.limit(`ai:${ctx.userId}`);
      if (!success) return rateLimited();
    }
    return handler(req, ctx, params);
  });
}
