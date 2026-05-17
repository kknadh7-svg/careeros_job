import { z } from "zod";
import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { ok, created, notFound, validationError, forbidden, internalError, aiUnavailable } from "@/lib/api/response";
import { interviewCoach } from "@/lib/ai/agents/interview-coach";
import { logger } from "@/lib/logger";

const createInterviewSchema = z.object({
  type: z.enum(["HR", "TECHNICAL", "BEHAVIORAL", "CASE_STUDY", "SYSTEM_DESIGN"]),
  mode: z.enum(["TEXT", "VOICE"]).default("TEXT"),
  applicationId: z.string().uuid().optional(),
  jobTitle: z.string().optional(),
  jobDescription: z.string().optional(),
});

// GET /api/v1/interviews
export const GET = withAuth(async (req, ctx) => {
  try {
    const interviews = await db.interview.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        type: true,
        mode: true,
        status: true,
        overallScore: true,
        duration: true,
        completedAt: true,
        createdAt: true,
        application: {
          select: {
            job: { select: { title: true, company: true } },
          },
        },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(interviews);
  } catch (err) {
    return internalError(err);
  }
});

// POST /api/v1/interviews — create and generate questions
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json();
    const parsed = createInterviewSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    // Plan gate: Free has no voice interviews
    if (parsed.data.mode === "VOICE" && ctx.plan === "FREE") {
      return forbidden("Voice interviews require Pro or Enterprise plan");
    }

    // Get user's base resume
    const resume = await db.resume.findFirst({
      where: { userId: ctx.userId, isBase: true, deletedAt: null, status: "READY" },
      select: { rawText: true },
    });

    if (!resume?.rawText) {
      return ok({ error: "Please upload a resume before starting an interview" });
    }

    // Generate questions
    const questions = await interviewCoach.generateQuestions({
      interviewType: parsed.data.type,
      resumeText: resume.rawText,
      jobTitle: parsed.data.jobTitle,
      jobDescription: parsed.data.jobDescription,
      userId: ctx.userId,
    }).catch((err) => {
      logger.error({ msg: "Question generation failed", error: err });
      return null;
    });

    if (!questions) return aiUnavailable();

    // Create interview + questions in one transaction
    const interview = await db.interview.create({
      data: {
        userId: ctx.userId,
        type: parsed.data.type,
        mode: parsed.data.mode,
        applicationId: parsed.data.applicationId,
        status: "PENDING",
        questions: {
          createMany: {
            data: questions.map((q, i) => ({
              question: q.question,
              category: q.category,
              difficulty: q.difficulty,
              keywords: q.keywords,
              orderIndex: i,
            })),
          },
        },
      },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    // Log AI usage
    await db.aiGeneration.create({
      data: {
        userId: ctx.userId,
        feature: "INTERVIEW_QUESTION",
        model: "gpt-4o",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        success: true,
        metadata: { interviewType: parsed.data.type, questionCount: questions.length },
      },
    });

    return created(interview);
  } catch (err) {
    logger.error({ msg: "Interview creation failed", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
