import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import type { ResumeFileType } from "@prisma/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "resumes";
const SIGNED_URL_EXPIRES_IN = 3600; // 1 hour

class ResumeService {
  async createUploadUrl(resumeId: string, fileType: ResumeFileType): Promise<string> {
    const extension = fileType === "PDF" ? "pdf" : fileType === "DOCX" ? "docx" : "txt";
    const path = `${resumeId}.${extension}`;

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new Error(`Failed to create upload URL: ${error?.message}`);
    }

    // Update resume with the expected file URL
    const publicUrl = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(path).data.publicUrl;

    await db.resume.update({
      where: { id: resumeId },
      data: { fileUrl: publicUrl },
    });

    return data.signedUrl;
  }

  async downloadAndExtractText(
    resumeId: string,
    fileUrl: string,
    fileType: ResumeFileType
  ): Promise<string> {
    const response = await fetch(fileUrl, {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Failed to download resume: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    if (fileType === "PDF") {
      return this.extractPdfText(buffer);
    } else if (fileType === "DOCX") {
      return this.extractDocxText(buffer);
    } else {
      return new TextDecoder().decode(buffer);
    }
  }

  private async extractPdfText(buffer: ArrayBuffer): Promise<string> {
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const result = await pdfParse(Buffer.from(buffer));
    return result.text;
  }

  private async extractDocxText(buffer: ArrayBuffer): Promise<string> {
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  }

  async getSignedDownloadUrl(path: string): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_EXPIRES_IN);

    if (error || !data) {
      throw new Error(`Failed to create download URL: ${error?.message}`);
    }

    return data.signedUrl;
  }
}

export const resumeService = new ResumeService();
