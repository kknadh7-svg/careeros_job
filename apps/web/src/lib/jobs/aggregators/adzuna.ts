import { z } from "zod";
import { db } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { generateEmbedding } from "@/lib/ai/openai";

const adzunaJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.object({ display_name: z.string() }),
  location: z.object({ display_name: z.string() }),
  description: z.string(),
  redirect_url: z.string().url(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  contract_type: z.string().optional(),
  created: z.string(),
  category: z.object({ tag: z.string() }).optional(),
});

const adzunaResponseSchema = z.object({
  results: z.array(adzunaJobSchema),
  count: z.number(),
});

interface ScrapeOptions {
  query: string;
  location?: string;
  page?: number;
  resultsPerPage?: number;
  country?: string;
}

export class AdzunaAggregator {
  private readonly baseUrl = "https://api.adzuna.com/v1/api/jobs";
  private readonly appId = process.env.ADZUNA_APP_ID!;
  private readonly apiKey = process.env.ADZUNA_API_KEY!;

  async scrape(options: ScrapeOptions): Promise<number> {
    const {
      query,
      location = "",
      page = 1,
      resultsPerPage = 50,
      country = "us",
    } = options;

    const url = new URL(`${this.baseUrl}/${country}/search/${page}`);
    url.searchParams.set("app_id", this.appId);
    url.searchParams.set("app_key", this.apiKey);
    url.searchParams.set("results_per_page", String(resultsPerPage));
    url.searchParams.set("what", query);
    if (location) url.searchParams.set("where", location);
    url.searchParams.set("content-type", "application/json");

    let response: Response;
    let data: unknown;

    try {
      response = await fetch(url.toString(), {
        headers: { "User-Agent": "CareerOS/1.0 (+https://careeros.app)" },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        logger.warn({
          msg: "Adzuna API error",
          status: response.status,
          query,
        });
        return 0;
      }

      data = await response.json();
    } catch (err) {
      logger.error({ msg: "Adzuna fetch failed", query, error: err });
      return 0;
    }

    const parsed = adzunaResponseSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn({ msg: "Adzuna response parse failed", error: parsed.error });
      return 0;
    }

    let upserted = 0;

    for (const job of parsed.data.results) {
      try {
        const existingJob = await db.job.findUnique({
          where: {
            externalId_source: { externalId: job.id, source: "ADZUNA" },
          },
          select: { id: true },
        });

        if (existingJob) continue;

        const jobType = this.mapContractType(job.contract_type);

        const created = await db.job.create({
          data: {
            externalId: job.id,
            source: "ADZUNA",
            title: job.title,
            company: job.company.display_name,
            location: job.location.display_name,
            description: job.description,
            applyUrl: job.redirect_url,
            isActive: true,
            postedAt: new Date(job.created),
            jobType,
            salary: (job.salary_min || job.salary_max
                ? {
                    min: job.salary_min,
                    max: job.salary_max,
                    currency: "USD",
                    period: "yearly",
                  }
                : null) as Parameters<typeof db.job.upsert>[0]["create"]["salary"],
            skills: [],
          },
        });

        // Generate embedding for semantic search
        await this.embedJob(created.id, job.title, job.description);
        upserted++;
      } catch (err) {
        logger.error({ msg: "Failed to upsert Adzuna job", jobId: job.id, error: err });
      }
    }

    logger.info({ msg: "Adzuna scrape complete", query, upserted, total: parsed.data.count });
    return upserted;
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

  private mapContractType(contractType?: string): "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE" {
    if (!contractType) return "FULL_TIME";
    const lower = contractType.toLowerCase();
    if (lower.includes("part")) return "PART_TIME";
    if (lower.includes("contract") || lower.includes("temporary")) return "CONTRACT";
    if (lower.includes("intern")) return "INTERNSHIP";
    if (lower.includes("freelance")) return "FREELANCE";
    return "FULL_TIME";
  }
}

export const adzunaAggregator = new AdzunaAggregator();
