import { withAuth } from "@/lib/api/middleware";
import { ok, internalError } from "@/lib/api/response";
import { db } from "@/lib/db/client";

const DAILY_LIMITS = { FREE: 2, PRO: 999 } as const;

export const GET = withAuth(async (_, ctx) => {
  try {
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { plan: true },
    });

    const plan = (user?.plan as "FREE" | "PRO") ?? "FREE";
    const dailyLimit = DAILY_LIMITS[plan] ?? 2;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sessionsUsedToday = await db.aiGeneration.count({
      where: {
        userId: ctx.userId,
        feature: "INTERVIEW_FEEDBACK",
        createdAt: { gte: todayStart },
        success: true,
      },
    });

    const remaining = Math.max(0, dailyLimit - sessionsUsedToday);

    return ok({ sessionsUsedToday, dailyLimit, plan, remaining });
  } catch (err) {
    return internalError(err);
  }
});
