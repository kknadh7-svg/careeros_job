import { db } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { adzunaAggregator } from "@/lib/jobs/aggregators/adzuna";
import { greenhouseAggregator } from "@/lib/jobs/aggregators/greenhouse";

export const runtime = "nodejs";
export const maxDuration = 300;

// GET /api/v1/cron/daily-job-agent
// Called by Vercel Cron at 6:00 AM UTC daily
export async function GET(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.warn({ msg: "Unauthorized cron attempt" });
    return new Response("Unauthorized", { status: 401 });
  }

  const startTime = Date.now();
  logger.info({ msg: "Daily job agent cron started" });

  try {
    // 1. Scrape jobs from all sources in parallel
    const [adzunaCount, greenhouseCount] = await Promise.allSettled([
      adzunaAggregator.scrape({ query: "software engineer", location: "remote" }),
      adzunaAggregator.scrape({ query: "product manager", location: "remote" }),
      adzunaAggregator.scrape({ query: "data scientist", location: "remote" }),
      greenhouseAggregator.scrapeAll(),
    ]).then((results) =>
      results.map((r) => (r.status === "fulfilled" ? r.value : 0))
    );

    const totalNewJobs = (adzunaCount ?? 0) + (greenhouseCount ?? 0);

    // 2. Trigger Python agent service for user matching
    const agentsUrl = process.env.AGENTS_API_URL;
    if (agentsUrl) {
      await fetch(`${agentsUrl}/v1/agents/daily-run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AGENTS_API_SECRET}`,
        },
        signal: AbortSignal.timeout(30000),
      }).catch((err) => {
        logger.warn({ msg: "Failed to trigger agent service", error: String(err) });
      });
    }

    const duration = Date.now() - startTime;
    logger.info({ msg: "Daily job agent cron complete", totalNewJobs, duration });

    return Response.json({
      ok: true,
      totalNewJobs,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ msg: "Daily job agent cron failed", error: err });
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
