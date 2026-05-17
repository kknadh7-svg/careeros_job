import { z } from "zod";
import { getOpenAIClient, MODEL } from "../openai";
import { atsScorer } from "./ats-scorer";
import { logger } from "@/lib/logger";

const tailorResultSchema = z.object({
  optimizedText: z.string(),
  parsedData: z.record(z.unknown()),
  changes: z.array(
    z.object({
      section: z.string(),
      type: z.enum(["rewrite", "add", "remove", "reorganize"]),
      description: z.string(),
    })
  ),
  addedKeywords: z.array(z.string()),
  removedContent: z.array(z.string()),
  scoreBefore: z.number(),
  scoreAfter: z.number(),
  breakdown: z.record(z.unknown()),
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  latencyMs: z.number(),
});

export type TailorResult = z.infer<typeof tailorResultSchema>;

interface TailorInput {
  resumeText: string;
  parsedData: Record<string, unknown> | null;
  jobTitle: string;
  jobDescription: string;
  jobRequirements: string;
  tone: "professional" | "aggressive" | "conservative";
  targetKeywords: string[];
  userId: string;
}

const TAILOR_SYSTEM_PROMPT = `You are an elite resume strategist and ATS optimization expert.
Your task is to tailor a resume specifically for a job posting to maximize ATS score and recruiter appeal.

RULES:
1. Never fabricate experience or skills — only enhance what exists
2. Rewrite bullets with stronger action verbs and quantified impact
3. Mirror the job description's language and keywords naturally
4. Prioritize the most relevant experience sections
5. Keep the resume under 2 pages equivalent (roughly 700 words max)
6. Return the complete optimized resume text`;

class ResumeTailor {
  async tailor(input: TailorInput): Promise<TailorResult | null> {
    const client = getOpenAIClient();
    const startMs = Date.now();

    try {
      // Step 1: Score original resume
      const originalScore = await atsScorer.score({
        resumeText: input.resumeText,
        jobDescription: `${input.jobDescription}\n${input.jobRequirements}`,
        parsedData: input.parsedData,
      });

      // Step 2: Generate tailored resume
      const toneInstructions = {
        professional: "Maintain a balanced, professional tone suitable for corporate environments.",
        aggressive: "Use high-impact, confident language that emphasizes achievements and leadership.",
        conservative: "Use measured, traditional language appropriate for traditional industries.",
      }[input.tone];

      const response = await client.chat.completions.create({
        model: MODEL.GPT4O,
        messages: [
          { role: "system", content: TAILOR_SYSTEM_PROMPT },
          {
            role: "user",
            content: `
JOB TITLE: ${input.jobTitle}

JOB DESCRIPTION:
${input.jobDescription.slice(0, 3000)}

REQUIREMENTS:
${input.jobRequirements.slice(0, 1500)}

CURRENT RESUME:
${input.resumeText.slice(0, 5000)}

INSTRUCTIONS:
- ${toneInstructions}
- Naturally incorporate these keywords if relevant: ${input.targetKeywords.join(", ")}
- Current ATS score: ${originalScore.overallScore}/100
- Missing keywords to add: ${originalScore.missingKeywords.slice(0, 10).join(", ")}
- Top issues to fix: ${originalScore.topIssues.join("; ")}

Return a JSON object with:
{
  "optimizedText": "<full optimized resume text>",
  "changes": [
    {"section": string, "type": "rewrite"|"add"|"remove"|"reorganize", "description": string}
  ],
  "addedKeywords": string[],
  "removedContent": string[]
}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const latencyMs = Date.now() - startMs;
      const content = response.choices[0]?.message.content;
      if (!content) throw new Error("Empty response from tailoring");

      const tailored = JSON.parse(content) as {
        optimizedText: string;
        changes: Array<{ section: string; type: string; description: string }>;
        addedKeywords: string[];
        removedContent: string[];
      };

      // Step 3: Score optimized resume
      const optimizedScore = await atsScorer.score({
        resumeText: tailored.optimizedText,
        jobDescription: `${input.jobDescription}\n${input.jobRequirements}`,
        parsedData: null,
      });

      return {
        optimizedText: tailored.optimizedText,
        parsedData: input.parsedData ?? {},
        changes: tailored.changes.map((c) => ({
          ...c,
          type: c.type as "rewrite" | "add" | "remove" | "reorganize",
        })),
        addedKeywords: tailored.addedKeywords ?? [],
        removedContent: tailored.removedContent ?? [],
        scoreBefore: originalScore.overallScore,
        scoreAfter: optimizedScore.overallScore,
        breakdown: optimizedScore,
        model: MODEL.GPT4O,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        latencyMs,
      };
    } catch (err) {
      logger.error({ msg: "Resume tailoring failed", userId: input.userId, error: err });
      return null;
    }
  }
}

export const resumeTailor = new ResumeTailor();
