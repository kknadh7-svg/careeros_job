import { z } from "zod";
import { getOpenAIClient, MODEL } from "../openai";
import { logger } from "@/lib/logger";

const atsResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  formatScore: z.number().min(0).max(100),
  keywordScore: z.number().min(0).max(100),
  contentScore: z.number().min(0).max(100),
  quantificationScore: z.number().min(0).max(100),
  topIssues: z.array(z.string()).max(5),
  topStrengths: z.array(z.string()).max(5),
  missingKeywords: z.array(z.string()).max(20),
  presentKeywords: z.array(z.string()).max(20),
  recommendations: z.array(
    z.object({
      priority: z.enum(["high", "medium", "low"]),
      section: z.string(),
      issue: z.string(),
      fix: z.string(),
    })
  ).max(10),
});

export type ATSResult = z.infer<typeof atsResultSchema> & {
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
};

interface ScorerInput {
  resumeText: string;
  jobDescription?: string;
  parsedData: Record<string, unknown> | null;
}

const SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) analyst with deep knowledge of how ATS software parses and scores resumes.

Your task is to score a resume across these dimensions:
1. FORMAT SCORE (25%): Single column, standard sections, no tables/graphics, clean parsing
2. KEYWORD SCORE (40%): Relevant keywords present, density appropriate, no keyword stuffing
3. CONTENT SCORE (20%): Action verbs, quantified achievements, clear impact
4. QUANTIFICATION SCORE (15%): Numbers, percentages, dollar amounts, scale

Analyze the resume and return a structured JSON score. Be precise and actionable.`;

class ATSScorer {
  async score(input: ScorerInput): Promise<ATSResult> {
    const client = getOpenAIClient();
    const startMs = Date.now();

    const userPrompt = `
RESUME TEXT:
${input.resumeText.slice(0, 6000)}

${input.jobDescription ? `JOB DESCRIPTION (score keywords against this):\n${input.jobDescription.slice(0, 3000)}` : "Score against general ATS best practices."}

Return a JSON object matching exactly this schema:
{
  "overallScore": number 0-100,
  "formatScore": number 0-100,
  "keywordScore": number 0-100,
  "contentScore": number 0-100,
  "quantificationScore": number 0-100,
  "topIssues": string[] (max 5, most critical problems),
  "topStrengths": string[] (max 5, what's working well),
  "missingKeywords": string[] (max 20, important missing keywords),
  "presentKeywords": string[] (max 20, well-placed keywords found),
  "recommendations": [
    {
      "priority": "high"|"medium"|"low",
      "section": string (which section),
      "issue": string (what's wrong),
      "fix": string (exactly how to fix it)
    }
  ]
}
Overall = formatScore*0.25 + keywordScore*0.40 + contentScore*0.20 + quantificationScore*0.15`;

    try {
      const response = await client.chat.completions.create({
        model: MODEL.GPT4O,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const latencyMs = Date.now() - startMs;
      const content = response.choices[0]?.message.content;

      if (!content) throw new Error("Empty response from OpenAI");

      const parsed = atsResultSchema.parse(JSON.parse(content));

      return {
        ...parsed,
        model: MODEL.GPT4O,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        latencyMs,
      };
    } catch (err) {
      logger.error({ msg: "ATS scorer failed", error: err });
      throw err;
    }
  }
}

export const atsScorer = new ATSScorer();
