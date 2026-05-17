import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { ok, created, internalError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

// GET /api/v1/resumes — list user's resumes
export const GET = withAuth(async (_req, ctx) => {
  try {
    const resumes = await db.resume.findMany({
      where: { userId: ctx.userId, deletedAt: null },
      select: {
        id: true,
        title: true,
        fileType: true,
        fileUrl: true,
        atsScore: true,
        isBase: true,
        isTailored: true,
        status: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        tailoredForJobId: true,
        tailoredForJob: { select: { title: true, company: true } },
      },
      orderBy: [{ isBase: "desc" }, { createdAt: "desc" }],
    });

    return ok(resumes);
  } catch (err) {
    logger.error({ msg: "Failed to list resumes", userId: ctx.userId, error: err });
    return internalError(err);
  }
});

// POST /api/v1/resumes — upload resume file directly (multipart form data)
export const POST = withAuth(async (req, ctx) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: { message: "No file provided" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fileName = file.name;
    const fileType = fileName.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX";

    // Check plan limits
    const resumeCount = await db.resume.count({
      where: { userId: ctx.userId, deletedAt: null, isBase: true },
    });

    if (ctx.plan === "FREE" && resumeCount >= 1) {
      return new Response(
        JSON.stringify({ error: { message: "Free plan allows 1 resume. Upgrade to Pro for unlimited." } }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract text from file in-memory
    const buffer = await file.arrayBuffer();
    let rawText = "";

    try {
      if (fileType === "PDF") {
        const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
        const result = await pdfParse(Buffer.from(buffer));
        rawText = result.text;
      } else {
        const { default: mammoth } = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
        rawText = result.value;
      }
    } catch (parseErr) {
      logger.warn({ msg: "Text extraction failed, storing empty text", error: parseErr });
      rawText = "";
    }

    const title = fileName.replace(/\.(pdf|docx)$/i, "");

    const resume = await db.resume.create({
      data: {
        userId: ctx.userId,
        title,
        fileType,
        rawText,
        status: rawText ? "READY" : "PROCESSING",
        isBase: resumeCount === 0,
        version: 1,
      },
    });

    return created({ resume });
  } catch (err) {
    logger.error({ msg: "Failed to upload resume", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
