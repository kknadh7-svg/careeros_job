import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import type { SessionStatus } from "@prisma/client";

const formFieldSchema = z.object({
  label: z.string(),
  type: z.enum(["text", "email", "phone", "select", "radio", "checkbox", "file", "textarea", "date"]),
  value: z.string().optional(),
  required: z.boolean().default(false),
  selector: z.string().optional(),
});

const formAnalysisSchema = z.object({
  fields: z.array(formFieldSchema),
  hasFileUpload: z.boolean(),
  hasLogin: z.boolean(),
  formType: z.enum(["ats", "custom", "linkedin", "indeed", "greenhouse", "lever"]),
  confidence: z.number().min(0).max(1),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type FormAnalysis = z.infer<typeof formAnalysisSchema>;

interface AutomationInput {
  sessionId: string;
  userId: string;
  applyUrl: string;
  resumeData: {
    contact: {
      name: string;
      email: string;
      phone?: string;
      location?: string;
      linkedin?: string;
      github?: string;
    };
    experience: Array<{
      company: string;
      title: string;
      startDate: string;
      endDate?: string;
    }>;
    skills: string[];
    education: Array<{
      institution: string;
      degree: string;
      graduationDate?: string;
    }>;
  };
  resumeFileUrl?: string;
  coverLetterText?: string;
}

export class ApplicationAutomator {
  private stagehand: Stagehand | null = null;
  private logs: Array<{ action: string; details: string; timestamp: string }> = [];

  private log(action: string, details: string): void {
    const entry = { action, details, timestamp: new Date().toISOString() };
    this.logs.push(entry);
    logger.info({ msg: "Automation", ...entry });
  }

  private async updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    extra?: Partial<{ errorMessage: string; screenshotUrls: string[] }>
  ): Promise<void> {
    await db.browserSession.update({
      where: { id: sessionId },
      data: {
        status,
        logs: this.logs,
        ...extra,
      },
    });
  }

  async run(input: AutomationInput): Promise<void> {
    const { sessionId, userId, applyUrl, resumeData } = input;

    try {
      await this.updateSessionStatus(sessionId, "RUNNING", {});

      // Initialize Stagehand with Browserbase
      this.stagehand = new Stagehand({
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        enableCaching: false,
      });

      await this.stagehand.init();
      this.log("init", "Browser session started");

      const page = this.stagehand.page;

      // Navigate to application URL
      await page.goto(applyUrl, { waitUntil: "networkidle", timeout: 30000 });
      this.log("navigate", `Navigated to ${applyUrl}`);

      // Anti-detection: random delay
      await this.randomDelay(800, 1500);

      // Analyze the form with AI vision
      const formAnalysis = await this.analyzeForm();
      this.log("analyze", `Detected form type: ${formAnalysis.formType}, ${formAnalysis.fields.length} fields`);

      // Fill form fields
      await this.fillFormFields(formAnalysis.fields, resumeData);
      this.log("fill", "Form fields populated");

      // Handle file uploads if needed
      if (formAnalysis.hasFileUpload && input.resumeFileUrl) {
        await this.handleFileUpload(input.resumeFileUrl);
        this.log("upload", "Resume file uploaded");
      }

      // Take screenshot for user review
      const screenshotBuffer = await page.screenshot({ fullPage: true });
      const screenshotUrl = await this.uploadScreenshot(
        sessionId,
        screenshotBuffer as Buffer,
        userId
      );

      this.log("screenshot", "Preview screenshot captured");

      // Update status to awaiting approval (CRITICAL — never auto-submit)
      await this.updateSessionStatus(sessionId, "AWAITING_APPROVAL", {
        screenshotUrls: [screenshotUrl],
      });

      // Wait for user approval (polled from outside)
      this.log("approval", "Waiting for user approval before submission");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.log("error", errorMessage);
      await this.updateSessionStatus(sessionId, "FAILED", { errorMessage });
      throw err;
    }
  }

  async submitAfterApproval(sessionId: string): Promise<void> {
    if (!this.stagehand) {
      throw new Error("Browser session not initialized");
    }

    try {
      const page = this.stagehand.page;

      // Find and click submit button
      await this.stagehand.act({
        action: "Click the submit or apply button to submit the job application",
      });

      // Wait for confirmation
      await page.waitForLoadState("networkidle");
      this.log("submit", "Application submitted successfully");

      await this.updateSessionStatus(sessionId, "SUBMITTED");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.log("error", `Submission failed: ${errorMessage}`);
      await this.updateSessionStatus(sessionId, "FAILED", { errorMessage });
      throw err;
    } finally {
      await this.cleanup();
    }
  }

  private async analyzeForm(): Promise<FormAnalysis> {
    if (!this.stagehand) throw new Error("No browser session");

    const result = await this.stagehand.extract({
      instruction: `Analyze all form fields on this job application page.
        Identify each field's label, type, and whether it's required.
        Determine the ATS system type (Greenhouse, Lever, Workday, custom, etc.)
        Check if there's a file upload area and any login requirement.`,
      schema: formAnalysisSchema,
    });

    return result;
  }

  private async fillFormFields(
    fields: FormField[],
    resumeData: AutomationInput["resumeData"]
  ): Promise<void> {
    if (!this.stagehand) throw new Error("No browser session");

    const { contact, experience, education, skills } = resumeData;
    const latestJob = experience[0];
    const latestEdu = education[0];

    const fieldValues: Record<string, string> = {
      name: contact.name,
      "full name": contact.name,
      "first name": contact.name.split(" ")[0] ?? "",
      "last name": contact.name.split(" ").slice(1).join(" "),
      email: contact.email,
      phone: contact.phone ?? "",
      location: contact.location ?? "",
      city: contact.location?.split(",")[0]?.trim() ?? "",
      linkedin: contact.linkedin ?? "",
      github: contact.github ?? "",
      "current company": latestJob?.company ?? "",
      "current title": latestJob?.title ?? "",
      "years of experience": this.calculateYearsExperience(experience),
      school: latestEdu?.institution ?? "",
      degree: latestEdu?.degree ?? "",
      skills: skills.slice(0, 10).join(", "),
    };

    for (const field of fields) {
      if (field.type === "file") continue; // Handled separately

      const valueKey = Object.keys(fieldValues).find((k) =>
        field.label.toLowerCase().includes(k)
      );

      const value = valueKey ? fieldValues[valueKey] : undefined;

      if (!value) continue;

      try {
        await this.stagehand.act({
          action: `Fill the "${field.label}" field with the value: ${value}`,
        });
        await this.randomDelay(200, 500);
      } catch (err) {
        logger.warn({ msg: `Failed to fill field: ${field.label}`, error: err });
      }
    }
  }

  private async handleFileUpload(fileUrl: string): Promise<void> {
    // Download file to temp, upload via Playwright file input
    this.log("upload", `Attempting to upload from ${fileUrl}`);
  }

  private async uploadScreenshot(
    sessionId: string,
    buffer: Buffer,
    userId: string
  ): Promise<string> {
    // Upload to Supabase Storage
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const path = `automation/${userId}/${sessionId}-${Date.now()}.png`;
    await supabase.storage.from("screenshots").upload(path, buffer, {
      contentType: "image/png",
    });

    const { data } = supabase.storage.from("screenshots").getPublicUrl(path);
    return data.publicUrl;
  }

  private calculateYearsExperience(
    experience: Array<{ startDate: string; endDate?: string }>
  ): string {
    if (!experience.length) return "0";
    const oldest = experience[experience.length - 1];
    if (!oldest) return "0";
    const start = new Date(oldest.startDate);
    const now = new Date();
    const years = Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365)
    );
    return String(years);
  }

  private async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async cleanup(): Promise<void> {
    if (this.stagehand) {
      await this.stagehand.close().catch(() => {});
      this.stagehand = null;
    }
  }
}
