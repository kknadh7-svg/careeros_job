import { z } from "zod";
import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { ok, created, notFound, validationError, internalError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  resumeId: z.string().uuid().optional(),
  coverLetterId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
});

const applicationQuerySchema = z.object({
  status: z
    .enum([
      "DRAFT",
      "APPLIED",
      "SCREENING",
      "INTERVIEW",
      "TECHNICAL",
      "OFFER",
      "ACCEPTED",
      "REJECTED",
      "WITHDRAWN",
    ])
    .optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

// GET /api/v1/applications
export const GET = withAuth(async (req, ctx) => {
  try {
    const url = new URL(req.url);
    const query = applicationQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries())
    );

    const cursorId = query.cursor
      ? Buffer.from(query.cursor, "base64").toString("utf-8")
      : undefined;

    const applications = await db.application.findMany({
      where: {
        userId: ctx.userId,
        ...(query.status && { status: query.status }),
      },
      take: query.limit + 1,
      ...(cursorId && { cursor: { id: cursorId }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            companyLogo: true,
            location: true,
            locationType: true,
            salary: true,
            applyUrl: true,
          },
        },
        resume: { select: { id: true, title: true, atsScore: true } },
      },
    });

    const hasMore = applications.length > query.limit;
    const items = hasMore ? applications.slice(0, query.limit) : applications;
    const lastItem = items[items.length - 1];

    const nextCursor = hasMore && lastItem ? Buffer.from(lastItem.id).toString("base64") : undefined;
    return ok(items, {
      pagination: {
        limit: query.limit,
        hasMore,
        ...(nextCursor && { nextCursor }),
      },
    });
  } catch (err) {
    logger.error({ msg: "Failed to list applications", userId: ctx.userId, error: err });
    return internalError(err);
  }
});

// POST /api/v1/applications
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json();
    const parsed = createApplicationSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { jobId, resumeId, coverLetterId, notes } = parsed.data;

    const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true } });
    if (!job) return notFound("Job");

    if (resumeId) {
      const resume = await db.resume.findFirst({
        where: { id: resumeId, userId: ctx.userId, deletedAt: null },
        select: { id: true },
      });
      if (!resume) return notFound("Resume");
    }

    const application = await db.application.create({
      data: {
        userId: ctx.userId,
        jobId,
        ...(resumeId != null && { resumeId }),
        ...(coverLetterId != null && { coverLetterId }),
        ...(notes != null && { notes }),
        status: "APPLIED",
        appliedAt: new Date(),
      },
      include: {
        job: {
          select: { id: true, title: true, company: true, applyUrl: true },
        },
      },
    });

    // Record status history
    await db.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        status: "APPLIED",
        note: "Application created",
      },
    });

    return created(application);
  } catch (err) {
    logger.error({ msg: "Failed to create application", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
