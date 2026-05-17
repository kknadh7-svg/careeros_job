import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { notFound } from "@/lib/api/response";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from "docx";

function parseSections(text: string): { heading: string; lines: string[] }[] {
  const SECTION_HEADERS = [
    "PROFESSIONAL SUMMARY", "SUMMARY", "OBJECTIVE",
    "EXPERIENCE", "WORK EXPERIENCE", "EMPLOYMENT",
    "TECHNICAL SKILLS", "SKILLS", "CORE COMPETENCIES",
    "EDUCATION", "CERTIFICATIONS", "ACHIEVEMENTS",
    "PROJECTS", "PUBLICATIONS", "LANGUAGES",
  ];

  const sections: { heading: string; lines: string[] }[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    const upper = line.trim().toUpperCase();
    const isHeader = SECTION_HEADERS.some((h) => upper === h || upper.startsWith(h + ":"));

    if (isHeader) {
      if (current) sections.push(current);
      current = { heading: line.trim(), lines: [] };
    } else {
      if (!current) current = { heading: "", lines: [] };
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections.filter((s) => s.heading || s.lines.some((l) => l.trim()));
}

function buildDocx(resumeTitle: string, rawText: string): Document {
  const children: Paragraph[] = [];

  // Extract name (first non-empty line before any section header)
  const lines = rawText.split("\n");
  let nameIdx = 0;
  let name = "";
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const l = lines[i]?.trim() ?? "";
    if (l && !l.toUpperCase().match(/^(PROFESSIONAL|SUMMARY|EXPERIENCE|SKILLS|EDUCATION)/)) {
      name = l;
      nameIdx = i;
      break;
    }
  }

  // Contact line (second non-empty line after name)
  let contact = "";
  for (let i = nameIdx + 1; i < Math.min(nameIdx + 5, lines.length); i++) {
    const l = lines[i]?.trim() ?? "";
    if (l && l.includes("@") || l.includes("|") || l.match(/\+?\d[\d\s\-]{7,}/)) {
      contact = l;
      break;
    }
  }

  // Name heading
  if (name) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: name, bold: true, size: 36, color: "1a1a2e" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: contact ? 60 : 200 },
      })
    );
  }

  // Contact info
  if (contact) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contact, size: 18, color: "555555" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Horizontal rule after header
  if (name) {
    children.push(
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "6366f1" } },
        spacing: { after: 160 },
        children: [],
      })
    );
  }

  // Parse sections
  const sections = parseSections(rawText);

  for (const section of sections) {
    // Skip the name/contact block we already handled
    if (!section.heading && sections.indexOf(section) === 0) continue;

    // Section heading
    if (section.heading) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: section.heading.toUpperCase(),
              bold: true,
              size: 22,
              color: "6366f1",
            }),
          ],
          spacing: { before: 240, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: "e0e0e0" } },
        })
      );
    }

    // Section lines
    for (const line of section.lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
        continue;
      }

      // Bullet point
      if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const bulletText = trimmed.replace(/^[•\-\*]\s*/, "");
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: bulletText, size: 20, color: "333333" })],
            spacing: { after: 60 },
          })
        );
      } else if (
        // Job title / company lines (bold if they look like a header)
        trimmed.match(/^[A-Z][^a-z]{2,}/) ||
        trimmed.match(/\|\s/) ||
        (trimmed.length < 80 && !trimmed.includes(".") && trimmed === trimmed)
      ) {
        // Check if it has a date pattern — treat as experience header
        const hasDate = trimmed.match(/\d{4}|\bpresent\b|\bcurrent\b/i);
        if (hasDate || trimmed.includes("|")) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: trimmed, bold: true, size: 21, color: "1a1a2e" })],
              spacing: { before: 120, after: 60 },
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: trimmed, size: 20, color: "444444" })],
              spacing: { after: 80 },
            })
          );
        }
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: trimmed, size: 20, color: "333333" })],
            spacing: { after: 80 },
          })
        );
      }
    }
  }

  return new Document({
    creator: "CareerOS",
    title: resumeTitle,
    description: "AI-enhanced resume generated by CareerOS",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20, color: "222222" },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 900, right: 900 },
        },
      },
      children,
    }],
  });
}

// GET /api/v1/resumes/:id/download
export const GET = withAuth(async (_req, ctx, params) => {
  const resumeId = params?.id;
  if (!resumeId) return notFound("Resume");

  const resume = await db.resume.findFirst({
    where: { id: resumeId, userId: ctx.userId, deletedAt: null },
    select: { id: true, title: true, rawText: true },
  });

  if (!resume) return notFound("Resume");
  if (!resume.rawText?.trim()) {
    return new Response(
      JSON.stringify({ error: { message: "No content to download" } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const doc = buildDocx(resume.title, resume.rawText);
  const nodeBuffer = await Packer.toBuffer(doc);
  const uint8 = new Uint8Array(nodeBuffer);

  const safeTitle = resume.title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "resume";
  const filename = `${safeTitle}.docx`;

  return new Response(uint8, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(uint8.byteLength),
    },
  });
});
