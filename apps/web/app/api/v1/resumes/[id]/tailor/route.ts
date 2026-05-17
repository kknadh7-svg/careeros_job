import { z } from "zod";
import { db } from "@/lib/db/client";
import { withAIRateLimit } from "@/lib/api/middleware";
import {
  ok,
  notFound,
  validationError,
  internalError,
  aiUnavailable,
  forbidden,
} from "@/lib/api/response";
import { resumeTailor } from "@/lib/ai/agents/resume-tailor";
import { logger } from "@/lib/logger";

const tailorSchema = z.object({
  jobId: z.string().uuid(),
  tone: z.enum(["professional", "aggressive", "conservative"]).default("professional"),
  targetKeywords: z.array(z.string()).optional(),
});

// POST /api/v1/resumes/:id/tailor
export const POST = withAIRateLimit(async (req, ctx, params) => {
  try {
    const resumeId = params?.id;
    if (!resumeId) return notFound("Resume");

    const body = await req.json();
    const parsed = tailorSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    // Plan gate
    if (ctx.plan === "FREE") {
      return forbidden("Resume tailoring requires Pro or Enterprise plan");
    }

    const [resume, job] = await Promise.all([
      db.resume.findFirst({
        where: { id: resumeId, userId: ctx.userId, deletedAt: null },
      }),
      db.job.findUnique({
        where: { id: parsed.data.jobId },
      }),
    ]);

    if (!resume) return notFound("Resume");
    if (!job) return notFound("Job");
    if (!resume.rawText) return ok({ error: "Resume not fully processed yet" });

    const result = await resumeTailor.tailor({
      resumeText: resume.rawText,
      parsedData: resume.parsedData as Record<string, unknown> | null,
      jobTitle: job.title,
      jobDescription: job.description,
      jobRequirements: job.requirements ?? "",
      tone: parsed.data.tone,
      targetKeywords: parsed.data.targetKeywords ?? [],
      userId: ctx.userId,
    });

    if (!result) return aiUnavailable();

    // Create new tailored resume record
    const tailoredResume = await db.resume.create({
      data: {
        userId: ctx.userId,
        title: `${resume.title} — ${job.company} (${job.title})`,
        fileType: resume.fileType,
        rawText: result.optimizedText,
        parsedData: result.parsedData as Parameters<typeof db.resume.create>[0]["data"]["parsedData"],
        isTailored: true,
        tailoredForJobId: job.id,
        parentResumeId: resume.id,
        version: resume.version + 1,
        status: "READY",
        atsScore: result.scoreAfter,
        atsBreakdown: result.breakdown as Parameters<typeof db.resume.create>[0]["data"]["atsBreakdown"],
      },
    });

    // Log AI usage
    await db.aiGeneration.create({
      data: {
        userId: ctx.userId,
        feature: "RESUME_TAILOR",
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.promptTokens + result.completionTokens,
        latencyMs: result.latencyMs,
        success: true,
        metadata: { jobId: job.id, scoreBefore: result.scoreBefore, scoreAfter: result.scoreAfter },
      },
    });

    return ok({
      tailoredResumeId: tailoredResume.id,
      matchScoreBefore: result.scoreBefore,
      matchScoreAfter: result.scoreAfter,
      changes: result.changes,
      addedKeywords: result.addedKeywords,
    });
  } catch (err) {
    logger.error({ msg: "Resume tailoring failed", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
