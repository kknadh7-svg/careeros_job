import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { ok, notFound, internalError } from "@/lib/api/response";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/ai/anthropic";
import { logger } from "@/lib/logger";

const ENHANCE_PROMPT = `You are an expert resume writer and career coach with 15+ years of experience helping professionals land jobs at top companies.

Your task is to transform the provided raw resume into a polished, professional, ATS-optimized resume.

RULES:
- Keep ALL real information (name, companies, dates, degrees) exactly as provided — never fabricate
- Rewrite descriptions using strong action verbs (Led, Architected, Delivered, Spearheaded, Optimized, etc.)
- Add quantified metrics where logically inferable (e.g., "Improved performance" → "Improved system performance by ~30%")
- Add a compelling Professional Summary at the top (3-4 sentences)
- Group and organize skills clearly under a "Technical Skills" section
- Use bullet points for experience entries, each starting with an action verb
- Use clean ATS-friendly section headers: PROFESSIONAL SUMMARY, EXPERIENCE, TECHNICAL SKILLS, EDUCATION, CERTIFICATIONS (if any)
- Remove weak phrases like "responsible for", "helped with", "worked on"
- Make impact and achievements stand out

OUTPUT FORMAT:
Return ONLY the enhanced resume text in clean plain text. No markdown, no JSON, no preamble.`;

async function extractTextFromBuffer(buffer: ArrayBuffer, fileType: string): Promise<string> {
  if (fileType === "PDF") {
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const result = await pdfParse(Buffer.from(buffer));
    return result.text ?? "";
  } else {
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value ?? "";
  }
}

// POST /api/v1/resumes/:id/enhance
// Accepts: multipart/form-data with optional "file" field, OR JSON with optional "resumeText"
export const POST = withAuth(async (req, ctx, params) => {
  try {
    const resumeId = params?.id;
    if (!resumeId) return notFound("Resume");

    const resume = await db.resume.findFirst({
      where: { id: resumeId, userId: ctx.userId, deletedAt: null },
    });
    if (!resume) return notFound("Resume");

    // Plan gating: FREE users get 1 enhancement total
    const user = await db.user.findUnique({ where: { id: ctx.userId }, select: { plan: true } });
    if (user?.plan === "FREE") {
      const existingEnhancements = await db.resume.count({
        where: { userId: ctx.userId, isTailored: true, deletedAt: null },
      });
      if (existingEnhancements >= 1) {
        return new Response(
          JSON.stringify({ error: { message: "Free plan allows 1 AI enhancement. Upgrade to Pro for unlimited enhancements." } }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    let textToEnhance = resume.rawText?.trim() ?? "";

    // Try to extract from uploaded file if provided
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        const buffer = await file.arrayBuffer();
        const fileType = file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX";
        try {
          textToEnhance = await extractTextFromBuffer(buffer, fileType);
          // Persist extracted text so future enhancements don't need re-upload
          if (textToEnhance.trim().length > 0) {
            await db.resume.update({
              where: { id: resumeId },
              data: { rawText: textToEnhance, status: "READY" },
            });
          }
        } catch (err) {
          logger.warn({ msg: "Text extraction from uploaded file failed", error: err });
        }
      }
    }

    if (!textToEnhance || textToEnhance.length < 50) {
      return new Response(
        JSON.stringify({ error: { message: "Could not read the resume file. Please try uploading it again." } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = getAnthropicClient();
    const startedAt = Date.now();

    const message = await client.messages.create({
      model: CLAUDE_MODEL.SONNET,
      max_tokens: 4096,
      messages: [{ role: "user", content: `${ENHANCE_PROMPT}\n\n---RAW RESUME---\n${textToEnhance}` }],
    });

    const latencyMs = Date.now() - startedAt;
    const enhancedText = message.content[0]?.type === "text" ? message.content[0].text : "";
    if (!enhancedText) return internalError(new Error("AI returned empty response"));

    const enhancedResume = await db.resume.create({
      data: {
        userId: ctx.userId,
        title: `${resume.title} — AI Enhanced`,
        fileType: resume.fileType,
        rawText: enhancedText,
        status: "READY",
        isBase: false,
        isTailored: true,
        parentResumeId: resume.id,
        version: resume.version + 1,
      },
    });

    await db.aiGeneration.create({
      data: {
        userId: ctx.userId,
        feature: "RESUME_OPTIMIZE",
        model: CLAUDE_MODEL.SONNET,
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        latencyMs,
        success: true,
      },
    });

    logger.info({ msg: "Resume enhanced", userId: ctx.userId, resumeId, newResumeId: enhancedResume.id });
    return ok({ resume: enhancedResume, enhancedText });
  } catch (err) {
    logger.error({ msg: "Resume enhancement failed", error: err });
    return internalError(err);
  }
});
