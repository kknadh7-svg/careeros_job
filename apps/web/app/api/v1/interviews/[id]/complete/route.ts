import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { ok, notFound, internalError, aiUnavailable } from "@/lib/api/response";
import { interviewCoach } from "@/lib/ai/agents/interview-coach";
import { logger } from "@/lib/logger";

// POST /api/v1/interviews/:id/complete
export const POST = withAuth(async (req, ctx, params) => {
  try {
    const interviewId = params?.id;
    if (!interviewId) return notFound("Interview");

    const interview = await db.interview.findFirst({
      where: { id: interviewId, userId: ctx.userId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!interview) return notFound("Interview");
    if (interview.status === "COMPLETED") {
      return ok({ interview, message: "Already completed" });
    }

    const answeredQuestions = interview.questions.filter((q) => q.userAnswer);

    if (answeredQuestions.length === 0) {
      return ok({ error: "No answers submitted yet" });
    }

    const transcript = answeredQuestions.map((q) => ({
      question: q.question,
      answer: q.userAnswer ?? "",
      score: q.aiScore ?? undefined,
      feedback: q.aiFeedback ?? undefined,
    }));

    // Generate comprehensive feedback
    const feedback = await interviewCoach.generateFinalFeedback({
      transcript,
      interviewType: interview.type,
      userId: ctx.userId,
    }).catch((err) => {
      logger.error({ msg: "Final feedback generation failed", error: err });
      return null;
    });

    if (!feedback) return aiUnavailable();

    const startedAt = interview.startedAt ?? interview.createdAt;
    const durationSeconds = Math.round(
      (new Date().getTime() - startedAt.getTime()) / 1000
    );

    const completed = await db.interview.update({
      where: { id: interviewId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        duration: durationSeconds,
        overallScore: feedback.overallScore,
        feedback: feedback,
        improvements: feedback.improvements,
        transcript: transcript,
      },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
      },
    });

    // Log AI usage
    await db.aiGeneration.create({
      data: {
        userId: ctx.userId,
        feature: "INTERVIEW_FEEDBACK",
        model: "gpt-4o",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        success: true,
        metadata: { interviewId, overallScore: feedback.overallScore },
      },
    });

    return ok({ interview: completed, feedback });
  } catch (err) {
    logger.error({ msg: "Interview completion failed", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
