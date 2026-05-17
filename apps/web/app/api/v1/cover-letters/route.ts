import { z } from "zod";
import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import {
  ok,
  created,
  notFound,
  validationError,
  forbidden,
  internalError,
  aiUnavailable,
} from "@/lib/api/response";
import { coverLetterGenerator } from "@/lib/ai/agents/cover-letter-generator";
import { logger } from "@/lib/logger";

const generateSchema = z.object({
  jobId: z.string().uuid(),
  resumeId: z.string().uuid().optional(),
  tone: z
    .enum(["professional", "enthusiastic", "concise", "storytelling"])
    .default("professional"),
  additionalContext: z.string().max(500).optional(),
});

// GET /api/v1/cover-letters
export const GET = withAuth(async (req, ctx) => {
  try {
    const letters = await db.coverLetter.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        title: true,
        tone: true,
        wordCount: true,
        jobId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(letters);
  } catch (err) {
    return internalError(err);
  }
});

// POST /api/v1/cover-letters — generate with AI
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    // Plan gate: Free tier can generate 3 cover letters/month
    if (ctx.plan === "FREE") {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const count = await db.aiGeneration.count({
        where: {
          userId: ctx.userId,
          feature: "COVER_LETTER",
          createdAt: { gte: thisMonth },
        },
      });

      if (count >= 3) {
        return forbidden("Free plan: 3 cover letters/month. Upgrade to Pro.");
      }
    }

    const [job, resume] = await Promise.all([
      db.job.findUnique({
        where: { id: parsed.data.jobId },
        select: { id: true, title: true, company: true, description: true },
      }),
      parsed.data.resumeId
        ? db.resume.findFirst({
            where: {
              id: parsed.data.resumeId,
              userId: ctx.userId,
              deletedAt: null,
            },
          })
        : db.resume.findFirst({
            where: { userId: ctx.userId, isBase: true, deletedAt: null, status: "READY" },
          }),
    ]);

    if (!job) return notFound("Job");
    if (!resume) return notFound("Resume — please upload a resume first");

    const result = await coverLetterGenerator.generate({
      resumeText: resume.rawText ?? "",
      parsedData: resume.parsedData as Record<string, unknown> | null,
      jobTitle: job.title,
      jobDescription: job.description,
      company: job.company,
      tone: parsed.data.tone,
      additionalContext: parsed.data.additionalContext,
      userId: ctx.userId,
    });

    if (!result) return aiUnavailable();

    const coverLetter = await db.coverLetter.create({
      data: {
        userId: ctx.userId,
        jobId: job.id,
        title: `${job.company} — ${job.title}`,
        content: result.content,
        tone: parsed.data.tone,
        wordCount: result.wordCount,
      },
    });

    // Log AI usage
    await db.aiGeneration.create({
      data: {
        userId: ctx.userId,
        feature: "COVER_LETTER",
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.promptTokens + result.completionTokens,
        success: true,
        metadata: { jobId: job.id, tone: parsed.data.tone },
      },
    });

    return created({ ...coverLetter, keyThemes: result.keyThemes });
  } catch (err) {
    logger.error({ msg: "Cover letter generation failed", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
