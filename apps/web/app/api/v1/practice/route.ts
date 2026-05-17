import { z } from "zod";
import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/ai/anthropic";
import { logger } from "@/lib/logger";

// Credits per day: Free = 3 generations, Pro = 25 generations
// Per generation: Free = 5 questions, Pro = 15 questions
const PLAN_CONFIG = {
  FREE: { dailyLimit: 3, questionsPerGen: 5 },
  PRO:  { dailyLimit: 25, questionsPerGen: 15 },
};

const schema = z.object({
  skills: z.array(z.string().min(1).max(60)).min(1).max(10),
  level: z.enum(["JUNIOR", "MID", "SENIOR"]).default("MID"),
  role: z.string().max(100).optional(),
});

function buildPrompt(skills: string[], level: string, role: string | undefined, count: number): string {
  const year = new Date().getFullYear();
  const levelLabel = level === "JUNIOR" ? "Junior (0-2 yrs)" : level === "MID" ? "Mid-level (2-5 yrs)" : "Senior (5+ yrs)";
  const roleContext = role ? ` for a ${role} role` : "";

  return `You are a senior technical interviewer at a top tech company. Generate ${count} interview questions${roleContext} for a ${levelLabel} candidate with skills in: ${skills.join(", ")}.

The year is ${year}. Questions must be current, practical, and reflect today's industry expectations.

Mix these types proportionally:
- "CONCEPTUAL": Theory, how-it-works, definitions, best practices
- "SCENARIO": Real-world situations ("Given a system that...", "Your team is facing...", "How would you design...")
- "BEHAVIORAL": Soft skills, past experience ("Tell me about a time...", "How did you handle...")
- "CODING": Algorithm, code design, debugging (describe the problem clearly, no actual code needed)

STRICT OUTPUT FORMAT — return ONLY a valid JSON array, nothing else:
[
  {
    "question": "Full question text",
    "type": "CONCEPTUAL" | "SCENARIO" | "BEHAVIORAL" | "CODING",
    "skill": "which skill this tests",
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "keyPoints": ["key point 1", "key point 2", "key point 3"],
    "followUp": "A natural follow-up question",
    "whyAsked": "One sentence: why interviewers ask this"
  }
]

Rules:
- Make questions specific to the skill, not generic
- Scenario questions must describe a realistic, concrete situation
- keyPoints are what a GOOD answer should cover (3-4 bullet hints)
- No duplicate questions
- No markdown, no preamble, no trailing text — ONLY the JSON array`;
}

// GET /api/v1/practice — return today's usage
export const GET = withAuth(async (_req, ctx) => {
  const user = await db.user.findUnique({ where: { id: ctx.userId }, select: { plan: true } });
  const plan = (user?.plan as "FREE" | "PRO") ?? "FREE";
  const config = PLAN_CONFIG[plan];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const usedToday = await db.aiGeneration.count({
    where: {
      userId: ctx.userId,
      feature: "INTERVIEW_QUESTION",
      createdAt: { gte: todayStart },
      success: true,
    },
  });

  return new Response(
    JSON.stringify({
      data: {
        plan,
        dailyLimit: config.dailyLimit,
        usedToday,
        remaining: Math.max(0, config.dailyLimit - usedToday),
        questionsPerGen: config.questionsPerGen,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});

// POST /api/v1/practice — generate questions
export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: { message: "Invalid input. Provide 1-10 skills." } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { skills, level, role } = parsed.data;

    // Check plan and daily limit
    const user = await db.user.findUnique({ where: { id: ctx.userId }, select: { plan: true } });
    const plan = (user?.plan as "FREE" | "PRO") ?? "FREE";
    const config = PLAN_CONFIG[plan];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const usedToday = await db.aiGeneration.count({
      where: {
        userId: ctx.userId,
        feature: "INTERVIEW_QUESTION",
        createdAt: { gte: todayStart },
        success: true,
      },
    });

    if (usedToday >= config.dailyLimit) {
      return new Response(
        JSON.stringify({
          error: {
            message: plan === "FREE"
              ? `Free plan allows ${config.dailyLimit} question sets per day. Upgrade to Pro for 25/day.`
              : `Daily limit of ${config.dailyLimit} reached. Resets at midnight.`,
            code: "LIMIT_REACHED",
            plan,
            remaining: 0,
          },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = getAnthropicClient();
    const startedAt = Date.now();
    const prompt = buildPrompt(skills, level, role, config.questionsPerGen);

    const message = await client.messages.create({
      model: CLAUDE_MODEL.SONNET,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const latencyMs = Date.now() - startedAt;
    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

    // Parse JSON — strip any accidental markdown fences
    const jsonStr = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    let questions: unknown[];
    try {
      questions = JSON.parse(jsonStr) as unknown[];
    } catch {
      logger.error({ msg: "Failed to parse AI questions JSON", raw });
      return new Response(
        JSON.stringify({ error: { message: "AI returned malformed response. Please try again." } }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log usage
    await db.aiGeneration.create({
      data: {
        userId: ctx.userId,
        feature: "INTERVIEW_QUESTION",
        model: CLAUDE_MODEL.SONNET,
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        latencyMs,
        success: true,
        metadata: { skills, level, role: role ?? null, count: questions.length },
      },
    });

    logger.info({ msg: "Interview questions generated", userId: ctx.userId, skills, count: questions.length });

    return new Response(
      JSON.stringify({
        data: {
          questions,
          skills,
          level,
          role: role ?? null,
          generatedAt: new Date().toISOString(),
          remaining: Math.max(0, config.dailyLimit - usedToday - 1),
          plan,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error({ msg: "Practice question generation failed", error: err });
    return new Response(
      JSON.stringify({ error: { message: "Failed to generate questions. Please try again." } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
