import { z } from "zod";
import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { ok, notFound, validationError, internalError, aiUnavailable } from "@/lib/api/response";
import { interviewCoach } from "@/lib/ai/agents/interview-coach";
import { logger } from "@/lib/logger";

const answerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string().min(10).max(5000),
  generateFollowUp: z.boolean().default(false),
});

// POST /api/v1/interviews/:id/answer
export const POST = withAuth(async (req, ctx, params) => {
  try {
    const interviewId = params?.id;
    if (!interviewId) return notFound("Interview");

    const body = await req.json();
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const [interview, question] = await Promise.all([
      db.interview.findFirst({
        where: { id: interviewId, userId: ctx.userId },
        select: { id: true, type: true, status: true },
      }),
      db.interviewQuestion.findFirst({
        where: { id: parsed.data.questionId, interviewId },
        select: { id: true, question: true },
      }),
    ]);

    if (!interview) return notFound("Interview");
    if (!question) return notFound("Question");

    // Mark interview as in-progress
    if (interview.status === "PENDING") {
      await db.interview.update({
        where: { id: interviewId },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });
    }

    // Score the answer with AI
    const feedback = await interviewCoach.scoreAnswer({
      question: question.question,
      answer: parsed.data.answer,
      interviewType: interview.type,
      generateFollowUp: parsed.data.generateFollowUp,
      userId: ctx.userId,
    }).catch((err) => {
      logger.error({ msg: "Answer scoring failed", error: err });
      return null;
    });

    if (!feedback) return aiUnavailable();

    // Update question with answer and feedback
    const updatedQuestion = await db.interviewQuestion.update({
      where: { id: question.id },
      data: {
        userAnswer: parsed.data.answer,
        aiScore: feedback.score,
        aiFeedback: JSON.stringify({
          strengths: feedback.strengths,
          improvements: feedback.improvements,
          missedKeywords: feedback.missedKeywords,
          starCompliance: feedback.starCompliance,
          improvedAnswer: feedback.improvedAnswer,
        }),
      },
    });

    return ok({
      questionId: question.id,
      score: feedback.score,
      feedback,
    });
  } catch (err) {
    logger.error({ msg: "Answer submission failed", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
