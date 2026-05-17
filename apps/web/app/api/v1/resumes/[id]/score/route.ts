import { z } from "zod";
import { db } from "@/lib/db/client";
import { withAuth, withAIRateLimit } from "@/lib/api/middleware";
import { ok, notFound, validationError, internalError, aiUnavailable } from "@/lib/api/response";
import { atsScorer } from "@/lib/ai/agents/ats-scorer";
import { logger } from "@/lib/logger";
import { TTL, withCache, cacheKey } from "@/lib/cache/redis";

const scoreSchema = z.object({
  jobId: z.string().uuid().optional(),
});

// POST /api/v1/resumes/:id/score
export const POST = withAIRateLimit(async (req, ctx, params) => {
  try {
    const resumeId = params?.id;
    if (!resumeId) return notFound("Resume");

    const body = await req.json().catch(() => ({}));
    const parsed = scoreSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const resume = await db.resume.findFirst({
      where: { id: resumeId, userId: ctx.userId, deletedAt: null },
    });

    if (!resume) return notFound("Resume");
    if (!resume.rawText) {
      return ok({ error: "Resume has not been parsed yet. Please wait." });
    }

    let jobDescription: string | undefined;
    if (parsed.data.jobId) {
      const job = await db.job.findUnique({
        where: { id: parsed.data.jobId },
        select: { description: true, requirements: true },
      });
      jobDescription = job
        ? `${job.description}\n\nRequirements:\n${job.requirements ?? ""}`
        : undefined;
    }

    const cKey = cacheKey("ats", resumeId, parsed.data.jobId ?? "base");
    const result = await withCache(
      cKey,
      async () => {
        try {
          return await atsScorer.score({
            resumeText: resume.rawText!,
            jobDescription,
            parsedData: resume.parsedData as Record<string, unknown> | null,
          });
        } catch {
          return null;
        }
      },
      TTL.ATS_SCORE
    );

    if (!result) return aiUnavailable();

    // Persist score back to resume
    await db.resume.update({
      where: { id: resumeId },
      data: {
        atsScore: result.overallScore,
        atsBreakdown: result,
      },
    });

    // Log AI usage
    await db.aiGeneration.create({
      data: {
        userId: ctx.userId,
        feature: "RESUME_SCORE",
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.promptTokens + result.completionTokens,
        latencyMs: result.latencyMs,
        success: true,
      },
    });

    return ok(result);
  } catch (err) {
    logger.error({ msg: "ATS scoring failed", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
