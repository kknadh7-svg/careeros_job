import { z } from "zod";
import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { created, validationError, internalError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

const schema = z.object({
  company: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  location: z.string().max(100).optional(),
  applyUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
  status: z.enum(["APPLIED", "SCREENING", "INTERVIEW", "TECHNICAL", "OFFER", "REJECTED", "WITHDRAWN"]).default("APPLIED"),
});

// POST /api/v1/applications/manual
// Creates a MANUAL Job record + Application in one transaction
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { company, title, location, applyUrl, notes, status } = parsed.data;

    const result = await db.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          title,
          company,
          location: location ?? null,
          source: "MANUAL",
          applyUrl: applyUrl || `https://www.google.com/search?q=${encodeURIComponent(`${title} ${company}`)}`,
          isActive: true,
          postedAt: new Date(),
        },
      });

      const application = await tx.application.create({
        data: {
          userId: ctx.userId,
          jobId: job.id,
          status,
          notes: notes ?? null,
          appliedAt: new Date(),
        },
        include: {
          job: { select: { id: true, title: true, company: true, location: true, applyUrl: true } },
        },
      });

      await tx.applicationStatusHistory.create({
        data: { applicationId: application.id, status, note: "Manually added" },
      });

      return application;
    });

    logger.info({ msg: "Manual application created", userId: ctx.userId, applicationId: result.id });
    return created(result);
  } catch (err) {
    logger.error({ msg: "Failed to create manual application", error: err });
    return internalError(err);
  }
});
