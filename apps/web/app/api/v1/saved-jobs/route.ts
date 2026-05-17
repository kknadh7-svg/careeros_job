import { z } from "zod";
import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { ok, created, notFound, conflict, validationError, internalError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

const saveJobSchema = z.object({
  jobId: z.string().uuid(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().max(2000).optional(),
});

// GET /api/v1/saved-jobs
export const GET = withAuth(async (req, ctx) => {
  try {
    const savedJobs = await db.savedJob.findMany({
      where: { userId: ctx.userId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            companyLogo: true,
            location: true,
            locationType: true,
            jobType: true,
            salary: true,
            skills: true,
            applyUrl: true,
            isActive: true,
            postedAt: true,
          },
        },
      },
      orderBy: { savedAt: "desc" },
    });

    return ok(savedJobs);
  } catch (err) {
    logger.error({ msg: "Failed to list saved jobs", userId: ctx.userId, error: err });
    return internalError(err);
  }
});

// POST /api/v1/saved-jobs
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json();
    const parsed = saveJobSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { jobId, tags, notes } = parsed.data;

    const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true } });
    if (!job) return notFound("Job");

    // Check plan limit for Free tier
    if (ctx.plan === "FREE") {
      const count = await db.savedJob.count({ where: { userId: ctx.userId } });
      if (count >= 5) {
        return conflict("Free plan allows 5 saved jobs. Upgrade to Pro for unlimited.");
      }
    }

    const existing = await db.savedJob.findUnique({
      where: { userId_jobId: { userId: ctx.userId, jobId } },
    });

    if (existing) return conflict("Job already saved");

    const savedJob = await db.savedJob.create({
      data: { userId: ctx.userId, jobId, tags, notes },
      include: {
        job: {
          select: { id: true, title: true, company: true, applyUrl: true },
        },
      },
    });

    return created(savedJob);
  } catch (err) {
    logger.error({ msg: "Failed to save job", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
