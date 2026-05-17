import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { ok, internalError } from "@/lib/api/response";
import { withCache, cacheKey } from "@/lib/cache/redis";
import { logger } from "@/lib/logger";
import { startOfMonth, subMonths } from "date-fns";

// GET /api/v1/applications/stats
export const GET = withAuth(async (req, ctx) => {
  try {
    const cKey = cacheKey("application-stats", ctx.userId);

    const stats = await withCache(
      cKey,
      async () => {
        const [
          totalByStatus,
          responseRate,
          recentApplications,
          weeklyTrend,
        ] = await Promise.all([
          // Applications grouped by status
          db.application.groupBy({
            by: ["status"],
            where: { userId: ctx.userId },
            _count: { status: true },
          }),

          // Response rate (any status beyond APPLIED)
          db.application.count({
            where: {
              userId: ctx.userId,
              status: {
                in: ["SCREENING", "INTERVIEW", "TECHNICAL", "OFFER", "ACCEPTED"],
              },
            },
          }),

          // Last 30 days activity
          db.application.count({
            where: {
              userId: ctx.userId,
              createdAt: { gte: subMonths(new Date(), 1) },
            },
          }),

          // Weekly applications for last 12 weeks
          db.$queryRaw<Array<{ week: string; count: bigint }>>`
            SELECT
              to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
              COUNT(*) as count
            FROM applications
            WHERE user_id = ${ctx.userId}::uuid
              AND created_at >= NOW() - INTERVAL '12 weeks'
            GROUP BY week
            ORDER BY week ASC
          `,
        ]);

        const statusMap = Object.fromEntries(
          (totalByStatus as { status: string; _count: { status: number } }[]).map((s) => [s.status, s._count.status])
        );

        const totalApplications = Object.values(statusMap).reduce((a: number, b: number) => a + b, 0);
        const interviewRate = totalApplications > 0
          ? Math.round(
              (((statusMap.INTERVIEW ?? 0) +
                (statusMap.TECHNICAL ?? 0) +
                (statusMap.OFFER ?? 0) +
                (statusMap.ACCEPTED ?? 0)) /
                totalApplications) *
                100
            )
          : 0;

        const responseRatePercent = totalApplications > 0
          ? Math.round((responseRate / totalApplications) * 100)
          : 0;

        return {
          totalApplications,
          byStatus: statusMap,
          responseRate: responseRatePercent,
          interviewRate,
          recentApplications,
          weeklyTrend: weeklyTrend.map((w) => ({
            week: w.week,
            count: Number(w.count),
          })),
        };
      },
      300 // 5 min cache
    );

    return ok(stats);
  } catch (err) {
    logger.error({ msg: "Failed to get application stats", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
