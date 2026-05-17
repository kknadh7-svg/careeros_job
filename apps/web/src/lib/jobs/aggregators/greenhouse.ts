import { z } from "zod";
import { db } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { generateEmbedding } from "@/lib/ai/openai";

const greenhouseJobSchema = z.object({
  id: z.number(),
  title: z.string(),
  location: z.object({ name: z.string() }).nullable(),
  content: z.string(),
  absolute_url: z.string().url(),
  updated_at: z.string(),
  departments: z.array(z.object({ name: z.string() })).optional(),
});

const greenhouseResponseSchema = z.object({
  jobs: z.array(greenhouseJobSchema),
  meta: z.object({ total: z.number() }).optional(),
});

// Well-known companies using Greenhouse (public job boards)
const GREENHOUSE_COMPANIES = [
  "stripe",
  "notion",
  "figma",
  "vercel",
  "linear",
  "databricks",
  "openai",
  "anthropic",
  "huggingface",
  "replit",
  "supabase",
] as const;

export class GreenhouseAggregator {
  async scrapeCompany(companySlug: string): Promise<number> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs?content=true`;

    let data: unknown;
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "CareerOS/1.0 (+https://careeros.app)" },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status === 404) return 0; // Company not on Greenhouse
        logger.warn({ msg: "Greenhouse API error", company: companySlug, status: response.status });
        return 0;
      }

      data = await response.json();
    } catch (err) {
      logger.error({ msg: "Greenhouse fetch failed", company: companySlug, error: err });
      return 0;
    }

    const parsed = greenhouseResponseSchema.safeParse(data);
    if (!parsed.success) return 0;

    let upserted = 0;

    for (const job of parsed.data.jobs) {
      try {
        const externalId = `greenhouse-${companySlug}-${job.id}`;
        const exists = await db.job.findUnique({
          where: { externalId_source: { externalId, source: "GREENHOUSE" } },
          select: { id: true },
        });

        if (exists) continue;

        const cleanDescription = job.content
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const created = await db.job.create({
          data: {
            externalId,
            source: "GREENHOUSE",
            title: job.title,
            company: this.slugToName(companySlug),
            location: job.location?.name ?? "Remote",
            locationType: job.location?.name?.toLowerCase().includes("remote")
              ? "REMOTE"
              : "HYBRID",
            description: cleanDescription,
            applyUrl: job.absolute_url,
            isActive: true,
            postedAt: new Date(job.updated_at),
            jobType: "FULL_TIME",
            skills: [],
          },
        });

        await this.embedJob(created.id, job.title, cleanDescription);
        upserted++;
      } catch (err) {
        logger.error({ msg: "Failed to upsert Greenhouse job", jobId: job.id, error: err });
      }
    }

    return upserted;
  }

  async scrapeAll(): Promise<number> {
    let total = 0;
    for (const company of GREENHOUSE_COMPANIES) {
      const count = await this.scrapeCompany(company);
      total += count;
      await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limit
    }
    logger.info({ msg: "Greenhouse scrape complete", total });
    return total;
  }

  private async embedJob(jobId: string, title: string, description: string): Promise<void> {
    try {
      const text = `${title}\n\n${description.slice(0, 2000)}`;
      const embedding = await generateEmbedding(text, "text-embedding-3-small");
      await db.$executeRaw`
        INSERT INTO job_embeddings (id, job_id, embedding, created_at)
        VALUES (gen_random_uuid(), ${jobId}::uuid, ${embedding}::vector, NOW())
        ON CONFLICT (job_id) DO UPDATE SET embedding = ${embedding}::vector
      `;
    } catch (err) {
      logger.warn({ msg: "Job embedding failed", jobId, error: err });
    }
  }

  private slugToName(slug: string): string {
    return slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
}

export const greenhouseAggregator = new GreenhouseAggregator();
