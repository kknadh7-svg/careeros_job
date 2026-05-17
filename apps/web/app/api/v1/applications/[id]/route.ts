import { z } from "zod";
import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { ok, notFound, validationError, internalError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  status: z.enum(["DRAFT", "APPLIED", "SCREENING", "INTERVIEW", "TECHNICAL", "OFFER", "ACCEPTED", "REJECTED", "WITHDRAWN"]).optional(),
  notes: z.string().max(2000).optional(),
  interviewAt: z.string().datetime().optional().nullable(),
});

// PATCH /api/v1/applications/:id
export const PATCH = withAuth(async (req, ctx, params) => {
  try {
    const applicationId = params?.id;
    if (!applicationId) return notFound("Application");

    const app = await db.application.findFirst({
      where: { id: applicationId, userId: ctx.userId },
      select: { id: true, status: true },
    });
    if (!app) return notFound("Application");

    const body = await req.json() as unknown;
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { status, notes, interviewAt } = parsed.data;

    const updated = await db.application.update({
      where: { id: applicationId },
      data: {
        ...(status != null && { status }),
        ...(notes !== undefined && { notes }),
        ...(interviewAt !== undefined && { interviewAt: interviewAt ? new Date(interviewAt) : null }),
        ...(status === "INTERVIEW" && { interviewAt: new Date() }),
        ...(status === "OFFER" && { offerAt: new Date() }),
        ...(status === "REJECTED" && { rejectedAt: new Date() }),
      },
      include: {
        job: { select: { title: true, company: true, location: true, applyUrl: true } },
      },
    });

    if (status && status !== app.status) {
      await db.applicationStatusHistory.create({
        data: { applicationId, status, note: `Status changed to ${status}` },
      });
    }

    logger.info({ msg: "Application updated", userId: ctx.userId, applicationId, status });
    return ok(updated);
  } catch (err) {
    logger.error({ msg: "Failed to update application", error: err });
    return internalError(err);
  }
});

// DELETE /api/v1/applications/:id
export const DELETE = withAuth(async (_req, ctx, params) => {
  try {
    const applicationId = params?.id;
    if (!applicationId) return notFound("Application");

    const app = await db.application.findFirst({
      where: { id: applicationId, userId: ctx.userId },
      select: { id: true },
    });
    if (!app) return notFound("Application");

    await db.application.delete({ where: { id: applicationId } });
    return ok({ deleted: true });
  } catch (err) {
    logger.error({ msg: "Failed to delete application", error: err });
    return internalError(err);
  }
});
