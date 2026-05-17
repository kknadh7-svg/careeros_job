import { z } from "zod";
import { getOpenAIClient, MODEL } from "../openai";
import { logger } from "@/lib/logger";

const coverLetterSchema = z.object({
  content: z.string().min(200).max(3000),
  wordCount: z.number(),
  keyThemes: z.array(z.string()),
  tone: z.string(),
});

export type CoverLetterResult = z.infer<typeof coverLetterSchema> & {
  model: string;
  promptTokens: number;
  completionTokens: number;
};

interface CoverLetterInput {
  resumeText: string;
  parsedData: Record<string, unknown> | null;
  jobTitle: string;
  jobDescription: string;
  company: string;
  tone: "professional" | "enthusiastic" | "concise" | "storytelling";
  additionalContext?: string;
  userId: string;
}

const SYSTEM_PROMPT = `You are an expert career coach who writes compelling, personalized cover letters that get interviews.

Your cover letters:
- Open with a strong hook, not "I am applying for..."
- Connect candidate's specific experience to the role's exact needs
- Show company research and genuine interest
- Use the hiring manager's language from the job description
- Are concise: 3-4 paragraphs, under 400 words
- End with a confident, action-oriented close
- Never sound generic or templated`;

class CoverLetterGenerator {
  async generate(input: CoverLetterInput): Promise<CoverLetterResult | null> {
    const client = getOpenAIClient();

    const toneGuide = {
      professional: "Formal, polished, corporate tone",
      enthusiastic: "Energetic, passionate, startup-friendly tone",
      concise: "Ultra-brief, direct, respects recruiter's time",
      storytelling: "Narrative-driven, draws on personal journey",
    }[input.tone];

    const candidateName = (
      input.parsedData?.contact as { name?: string } | null
    )?.name ?? "the candidate";

    try {
      const response = await client.chat.completions.create({
        model: MODEL.GPT4O,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `
Write a cover letter for ${candidateName} applying to ${input.jobTitle} at ${input.company}.

TONE: ${toneGuide}

CANDIDATE RESUME SUMMARY:
${input.resumeText.slice(0, 3000)}

JOB DESCRIPTION:
${input.jobDescription.slice(0, 2500)}

${input.additionalContext ? `ADDITIONAL CONTEXT:\n${input.additionalContext}` : ""}

Return JSON:
{
  "content": "<full cover letter text, use \\n for line breaks>",
  "wordCount": <number>,
  "keyThemes": ["<theme1>", "<theme2>", "<theme3>"],
  "tone": "<brief description of tone used>"
}`,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message.content;
      if (!content) throw new Error("Empty cover letter response");

      const result = coverLetterSchema.parse(JSON.parse(content));

      return {
        ...result,
        model: MODEL.GPT4O,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      };
    } catch (err) {
      logger.error({ msg: "Cover letter generation failed", userId: input.userId, error: err });
      return null;
    }
  }
}

export const coverLetterGenerator = new CoverLetterGenerator();
