import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { noContent, notFound, internalError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

// DELETE /api/v1/saved-jobs/:id
export const DELETE = withAuth(async (_req, ctx, params) => {
  try {
    const jobId = params?.id;
    if (!jobId) return notFound("Job");

    const existing = await db.savedJob.findUnique({
      where: { userId_jobId: { userId: ctx.userId, jobId } },
    });

    if (!existing) return notFound("Saved job");

    await db.savedJob.delete({
      where: { userId_jobId: { userId: ctx.userId, jobId } },
    });

    return noContent();
  } catch (err) {
    logger.error({ msg: "Failed to delete saved job", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
