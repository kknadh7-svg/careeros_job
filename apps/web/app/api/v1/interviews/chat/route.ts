import { z } from "zod";
import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { ok, validationError, internalError, aiUnavailable } from "@/lib/api/response";
import { getOpenAIClient, MODEL } from "@/lib/ai/openai";

// FREE: 6 questions, PRO: 10 questions
const PLAN_MAX_QUESTIONS = { FREE: 6, PRO: 10 } as const;
// FREE: 1 hint per session, PRO: unlimited
const PLAN_MAX_HINTS = { FREE: 1, PRO: 99 } as const;
// FREE: 2 sessions/day, PRO: unlimited
const PLAN_DAILY_SESSIONS = { FREE: 2, PRO: 999 } as const;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema),
  interviewType: z.string().min(1),
  questionNumber: z.number().int().min(1),
  endSession: z.boolean().optional().default(false),
  requestHint: z.boolean().optional().default(false),
  hintsUsed: z.number().int().min(0).optional().default(0),
});

const SYSTEM_PROMPT = `You are an expert interviewer at a top-tier tech company. Conduct a realistic, professional job interview.

Rules:
- Ask exactly ONE question per response. No preamble, no "Great answer!", no filler.
- Build on what the candidate mentions — go deeper each round.
- Phase 1 (Q1–2): Background and work experience overview.
- Phase 2 (Q3–5): Deep-dive on specific skills and projects they mentioned.
- Phase 3 (last questions): Challenging behavioral/situational scenarios.
- Never repeat a question already asked.
- Keep questions concise and direct.`;

const FIRST_QUESTION = "Hi! I'm your AI interviewer today. Let's get started — could you tell me about yourself and walk me through your most recent work experience?";

function buildFeedbackPrompt(maxQ: number, hasAnswers: boolean): string {
  if (!hasAnswers) {
    return `The candidate ended the session without answering any questions. Generate feedback as valid JSON only.

{
  "overallScore": 0,
  "scoreBreakdown": { "communication": 0, "technicalDepth": 0, "structuredThinking": 0, "specificExamples": 0 },
  "feedback": "No answers were provided in this session. Please complete at least one question to receive meaningful feedback.",
  "strengths": [],
  "improvements": ["Answer the questions asked before ending the session", "Take time to complete the full interview", "Practice speaking clearly and concisely"],
  "questionReviews": []
}`;
  }

  return `The interview is now complete (${maxQ} questions answered). Generate a comprehensive feedback report as valid JSON only. No markdown, no explanation — just the JSON object.

{
  "overallScore": <integer 40–100 based on clarity, depth, specificity, use of examples>,
  "scoreBreakdown": {
    "communication": <integer 0–100>,
    "technicalDepth": <integer 0–100>,
    "structuredThinking": <integer 0–100>,
    "specificExamples": <integer 0–100>
  },
  "feedback": "<3–4 sentence honest overall assessment>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "improvements": ["<specific area 1 with advice>", "<specific area 2 with advice>", "<specific area 3 with advice>"],
  "questionReviews": [
    {
      "question": "<exact interviewer question>",
      "userAnswer": "<brief summary of candidate's answer>",
      "modelAnswer": "<what an ideal 3–5 sentence answer would cover>",
      "score": <integer 0–100>
    }
  ]
}

Be honest. If the candidate gave vague answers, reflect that in the score (40–60 range). Strong, specific, example-driven answers should score 75–95.`;
}

function buildHintPrompt(lastQuestion: string): string {
  return `The interviewer just asked: "${lastQuestion}"

Give a SHORT hint (2–3 bullet points) on what a GOOD answer to this question should include. Be specific and practical. No fluff. Format as plain text bullet points starting with "•".`;
}

export const POST = withAuth(async (req, ctx) => {
  let body: unknown;
  try { body = await req.json(); } catch { return internalError(new Error("Invalid JSON body")); }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { messages, interviewType, questionNumber, endSession, requestHint, hintsUsed } = parsed.data;

  // Get user plan
  const user = await db.user.findUnique({ where: { id: ctx.userId }, select: { plan: true } });
  const plan = (user?.plan as "FREE" | "PRO") ?? "FREE";
  const maxQuestions = PLAN_MAX_QUESTIONS[plan];
  const maxHints = PLAN_MAX_HINTS[plan];
  const dailySessionLimit = PLAN_DAILY_SESSIONS[plan];

  let openai: ReturnType<typeof getOpenAIClient>;
  try { openai = getOpenAIClient(); } catch { return aiUnavailable(); }

  // ── HINT REQUEST ──────────────────────────────────────────────────────────
  if (requestHint) {
    if (hintsUsed >= maxHints) {
      return new Response(
        JSON.stringify({
          data: {
            isHint: true,
            hint: null,
            error: plan === "FREE"
              ? "Free plan includes 1 hint per session. Upgrade to Pro for unlimited hints."
              : "No more hints available.",
            hintsRemaining: 0,
          },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const lastAIMessage = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAIMessage) return ok({ isHint: true, hint: "No question to hint on yet.", hintsRemaining: maxHints - hintsUsed - 1 });

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL.GPT4O,
        messages: [{ role: "user", content: buildHintPrompt(lastAIMessage.content) }],
        temperature: 0.4,
        max_tokens: 200,
      });
      const hint = completion.choices[0]?.message?.content?.trim() ?? "";
      return ok({ isHint: true, hint, hintsRemaining: maxHints - hintsUsed - 1, plan, maxHints });
    } catch (err) { return internalError(err); }
  }

  // ── FIRST QUESTION — check daily session limit ────────────────────────────
  if (questionNumber === 1 && messages.length === 0) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sessionsToday = await db.aiGeneration.count({
      where: {
        userId: ctx.userId,
        feature: "INTERVIEW_FEEDBACK",
        createdAt: { gte: todayStart },
        success: true,
      },
    });

    if (sessionsToday >= dailySessionLimit) {
      return new Response(
        JSON.stringify({
          error: {
            code: "DAILY_LIMIT_REACHED",
            message: plan === "FREE"
              ? `You've used all ${dailySessionLimit} free mock interview sessions for today. Upgrade to Pro for unlimited sessions.`
              : `Daily session limit reached.`,
            sessionsUsed: sessionsToday,
            dailyLimit: dailySessionLimit,
            plan,
          },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log the session NOW (at start) so abandoned/dropped sessions still consume a try
    await db.aiGeneration.create({
      data: {
        userId: ctx.userId,
        feature: "INTERVIEW_FEEDBACK",
        model: MODEL.GPT4O,
        success: true,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    }).catch(() => { /* non-blocking — don't fail the request */ });

    return ok({
      isComplete: false,
      message: FIRST_QUESTION,
      questionNumber: 1,
      plan,
      maxQuestions,
      hintsAllowed: maxHints,
      sessionsUsed: sessionsToday + 1,
      dailySessionLimit,
    });
  }

  // ── FEEDBACK (session end or max questions reached) ───────────────────────
  const shouldGenerateFeedback = endSession || questionNumber > maxQuestions;

  if (shouldGenerateFeedback) {
    const userAnswers = messages.filter((m) => m.role === "user");
    const hasAnswers = userAnswers.length > 0;

    try {
      let fb: {
        overallScore: number;
        scoreBreakdown: { communication: number; technicalDepth: number; structuredThinking: number; specificExamples: number };
        feedback: string;
        strengths: string[];
        improvements: string[];
        questionReviews: { question: string; userAnswer: string; modelAnswer: string; score: number }[];
      };

      if (!hasAnswers) {
        fb = {
          overallScore: 0,
          scoreBreakdown: { communication: 0, technicalDepth: 0, structuredThinking: 0, specificExamples: 0 },
          feedback: "No answers were provided in this session. Please complete at least one question to receive meaningful feedback.",
          strengths: [],
          improvements: [
            "Answer the questions asked before ending the session",
            "Take time to complete the full interview for accurate feedback",
            "Practice speaking clearly and concisely using the STAR method",
          ],
          questionReviews: [],
        };
      } else {
        const feedbackMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content: buildFeedbackPrompt(maxQuestions, true) },
        ];

        const completion = await openai.chat.completions.create({
          model: MODEL.GPT4O,
          messages: feedbackMessages,
          temperature: 0.3,
          response_format: { type: "json_object" },
          max_tokens: 2000,
        });

        const raw = completion.choices[0]?.message?.content ?? "{}";
        let parsedJson: Record<string, unknown>;
        try { parsedJson = JSON.parse(raw) as Record<string, unknown>; } catch { parsedJson = {}; }

        const feedbackSchema = z.object({
          overallScore: z.number().int().min(1).max(100).catch(60),
          scoreBreakdown: z.object({
            communication: z.number().catch(60),
            technicalDepth: z.number().catch(60),
            structuredThinking: z.number().catch(60),
            specificExamples: z.number().catch(60),
          }).catch({ communication: 60, technicalDepth: 60, structuredThinking: 60, specificExamples: 60 }),
          feedback: z.string().catch("Good effort. Keep practicing to sharpen your answers."),
          strengths: z.array(z.string()).catch(["Communication", "Enthusiasm"]),
          improvements: z.array(z.string()).catch(["Use more specific examples", "Structure with STAR method"]),
          questionReviews: z.array(z.object({
            question: z.string(),
            userAnswer: z.string(),
            modelAnswer: z.string(),
            score: z.number().int().min(0).max(100),
          })).catch([]),
        });

        fb = feedbackSchema.parse(parsedJson);
      }

      return ok({
        isComplete: true,
        overallScore: fb.overallScore,
        scoreBreakdown: fb.scoreBreakdown,
        feedback: fb.feedback,
        strengths: fb.strengths,
        improvements: fb.improvements,
        questionReviews: fb.questionReviews,
        hasAnswers,
        plan,
        maxQuestions,
      });
    } catch (err) { return internalError(err); }
  }

  // ── SUBSEQUENT QUESTIONS ──────────────────────────────────────────────────
  try {
    const interviewContext = interviewType === "TECHNICAL"
      ? " Focus on technical depth, system design thinking, and problem-solving approach."
      : interviewType === "SYSTEM_DESIGN"
      ? " Focus on scalability, trade-offs, architecture decisions, and real-world constraints."
      : " Focus on behavioral depth using STAR method situations.";

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT + interviewContext },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: MODEL.GPT4O,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 150,
    });

    const message = completion.choices[0]?.message?.content?.trim() ?? "Tell me about a challenging situation you've faced at work.";

    return ok({ isComplete: false, message, questionNumber, plan, maxQuestions });
  } catch (err) { return internalError(err); }
});
