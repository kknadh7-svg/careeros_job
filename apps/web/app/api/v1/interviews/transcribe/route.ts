import { withAuth } from "@/lib/api/middleware";
import { getOpenAIClient } from "@/lib/ai/openai";

export const POST = withAuth(async (req) => {
  let formData: FormData;
  try { formData = await req.formData(); } catch {
    return new Response(JSON.stringify({ error: "Invalid form data" }), { status: 400 });
  }

  const audio = formData.get("audio") as File | null;
  if (!audio || audio.size === 0) {
    return new Response(JSON.stringify({ text: "" }), { headers: { "Content-Type": "application/json" } });
  }

  const context = (formData.get("context") as string | null) ?? "";

  let openai: ReturnType<typeof getOpenAIClient>;
  try { openai = getOpenAIClient(); } catch {
    return new Response(JSON.stringify({ error: "AI unavailable" }), { status: 503 });
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "en",
      // Whisper uses prompt for vocabulary/style context (not instruction following).
      // We pass the full context string the client built (domain hint + previous transcript).
      prompt: context.slice(-500),
    });
    return new Response(JSON.stringify({ text: transcription.text ?? "" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ text: "" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
