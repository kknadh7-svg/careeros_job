import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { ok, internalError } from "@/lib/api/response";
import { withCache, cacheKey, TTL } from "@/lib/cache/redis";
import { generateEmbedding } from "@/lib/ai/openai";
import { logger } from "@/lib/logger";

// GET /api/v1/jobs/recommendations
export const GET = withAuth(async (req, ctx) => {
  try {
    const cKey = cacheKey("recommendations", ctx.userId);

    const recommendations = await withCache(
      cKey,
      async () => {
        // Get user's base resume text for embedding
        const baseResume = await db.resume.findFirst({
          where: { userId: ctx.userId, isBase: true, deletedAt: null, status: "READY" },
          select: { rawText: true },
        });

        if (!baseResume?.rawText) {
          // Fallback: return recent jobs sorted by recency
          return db.job.findMany({
            where: { isActive: true },
            orderBy: { postedAt: "desc" },
            take: 20,
            select: {
              id: true,
              title: true,
              company: true,
              companyLogo: true,
              location: true,
              locationType: true,
              jobType: true,
              salary: true,
              skills: true,
              applyUrl: true,
              postedAt: true,
            },
          });
        }

        // Generate embedding for resume
        const resumeEmbedding = await generateEmbedding(baseResume.rawText.slice(0, 8000));

        // Vector similarity search using pgvector raw query
        const similarJobs = await db.$queryRaw<Array<{
          id: string;
          title: string;
          company: string;
          company_logo: string | null;
          location: string | null;
          location_type: string | null;
          job_type: string | null;
          salary: unknown;
          skills: string[];
          apply_url: string;
          posted_at: Date | null;
          similarity: number;
        }>>`
          SELECT
            j.id, j.title, j.company, j.company_logo, j.location,
            j.location_type, j.job_type, j.salary, j.skills, j.apply_url, j.posted_at,
            1 - (je.embedding <=> ${resumeEmbedding}::vector) as similarity
          FROM job_embeddings je
          JOIN jobs j ON je.job_id = j.id
          WHERE j.is_active = true
          ORDER BY je.embedding <=> ${resumeEmbedding}::vector
          LIMIT 20
        `;

        return similarJobs.map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company,
          companyLogo: job.company_logo,
          location: job.location,
          locationType: job.location_type,
          jobType: job.job_type,
          salary: job.salary,
          skills: job.skills,
          applyUrl: job.apply_url,
          postedAt: job.posted_at,
          matchScore: Math.round(job.similarity * 100),
        }));
      },
      TTL.JOB_RECOMMENDATIONS
    );

    return ok(recommendations);
  } catch (err) {
    logger.error({ msg: "Failed to get recommendations", userId: ctx.userId, error: err });
    return internalError(err);
  }
});
