import { z } from "zod";
import { withAuth } from "@/lib/api/middleware";
import { ok, validationError, internalError, aiUnavailable } from "@/lib/api/response";
import { getOpenAIClient, MODEL } from "@/lib/ai/openai";

const bodySchema = z.object({
  text: z.string().min(5).max(3000),
});

const IMPROVE_PROMPT = `You are a professional interview coach. The candidate just gave a spoken or typed answer to an interview question — it may be rough, fragmented, or grammatically imperfect because it came from live speech.

Your job: rewrite their answer to sound polished and professional while:
- Keeping EVERY point, experience, and fact they mentioned — do NOT add or invent anything
- Fixing grammar, filler words ("um", "like", "you know"), and run-on sentences
- Structuring it clearly (use STAR: Situation → Task → Action → Result where it fits naturally)
- Keeping a natural, first-person conversational tone (not robotic or overly formal)
- Staying within a similar length — don't pad or cut important content
- Starting directly with the answer (no "Certainly!" or preamble)

Return ONLY the improved answer. No quotes, no commentary, no explanation.`;

export const POST = withAuth(async (req) => {
  let body: unknown;
  try { body = await req.json(); } catch { return internalError(new Error("Invalid JSON")); }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { text } = parsed.data;

  let openai: ReturnType<typeof getOpenAIClient>;
  try { openai = getOpenAIClient(); } catch { return aiUnavailable(); }

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL.GPT4O,
      messages: [
        { role: "system", content: IMPROVE_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.35,
      max_tokens: 500,
    });

    const improved = completion.choices[0]?.message?.content?.trim() ?? text;
    return ok({ improved, original: text });
  } catch (err) { return internalError(err); }
});
