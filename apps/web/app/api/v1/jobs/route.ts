import { db } from "@/lib/db/client";
import { withAuth } from "@/lib/api/middleware";
import { logger } from "@/lib/logger";

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs/in/search";

// Free plan gets 10 real results per search, Pro gets 50
const PLAN_LIMITS: Record<string, number> = { FREE: 10, PRO: 50 };

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  redirect_url: string;
  created: string;
  description: string;
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
}

// Extract skills by scanning description for known tech keywords
const KNOWN_SKILLS = [
  "Python","Java","JavaScript","TypeScript","React","Next.js","Vue","Angular",
  "Node.js","Express","Django","FastAPI","Flask","Spring Boot","AWS","Azure","GCP",
  "Docker","Kubernetes","Terraform","Ansible","CI/CD","Git","Linux","SQL","PostgreSQL",
  "MySQL","MongoDB","Redis","Kafka","Spark","Hadoop","TensorFlow","PyTorch",
  "Machine Learning","Deep Learning","NLP","Computer Vision","DevOps","GraphQL",
  "REST","Microservices","Go","Rust","C++","C#",".NET","Scala","R","Tableau",
  "Power BI","Excel","Salesforce","Figma","Swift","Kotlin","Android","iOS",
];

function extractSkills(description: string): string[] {
  return KNOWN_SKILLS.filter((s) =>
    new RegExp(`\\b${s.replace(/[.+]/g, "\\$&")}\\b`, "i").test(description)
  ).slice(0, 8);
}

function mapJob(j: AdzunaJob) {
  const title = j.title ?? "";
  const loc = j.location?.display_name ?? "";
  const isRemote = /remote/i.test(title) || /remote/i.test(loc);
  const isHybrid = /hybrid/i.test(title) || /hybrid/i.test(loc);

  return {
    id: `adzuna_${j.id}`,
    title,
    company: j.company?.display_name ?? "Unknown Company",
    companyLogo: null as string | null,
    location: loc,
    locationType: isRemote ? "REMOTE" : isHybrid ? "HYBRID" : "ONSITE",
    jobType: j.contract_time === "part_time" ? "PART_TIME" : "FULL_TIME",
    seniority: null as string | null,
    salary: (j.salary_min || j.salary_max)
      ? { min: j.salary_min ?? null, max: j.salary_max ?? null, currency: "INR" }
      : null,
    skills: extractSkills(j.description ?? ""),
    source: "ADZUNA",
    sourceUrl: "https://www.adzuna.in",
    applyUrl: j.redirect_url,
    postedAt: new Date(j.created),
    description: (j.description ?? "").slice(0, 600),
    isSaved: false,
  };
}

// GET /api/v1/jobs
export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim() || "software engineer";
  const location = (url.searchParams.get("location") ?? "").trim() || "India";
  const jobType = url.searchParams.get("jobType") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));

  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { plan: true },
  });
  const plan = (user?.plan as string) ?? "FREE";
  const limit = PLAN_LIMITS[plan] ?? 10;

  // No API key — return clear state, not fake data
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    return new Response(
      JSON.stringify({
        data: [],
        meta: { total: 0, plan, limit, configured: false, source: null },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const params = new URLSearchParams({
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      results_per_page: String(limit),
      what: q,
      where: location,
    });

    if (jobType === "FULL_TIME") params.set("full_time", "1");
    if (jobType === "PART_TIME") params.set("part_time", "1");
    if (jobType === "CONTRACT") params.set("contract", "1");

    const apiRes = await fetch(`${ADZUNA_BASE}/${page}?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!apiRes.ok) {
      throw new Error(`Adzuna error ${apiRes.status}: ${await apiRes.text()}`);
    }

    const body = await apiRes.json() as AdzunaResponse;
    const jobs = (body.results ?? []).map(mapJob);

    return new Response(
      JSON.stringify({
        data: jobs,
        meta: {
          total: body.count ?? jobs.length,
          plan,
          limit,
          configured: true,
          source: "Adzuna",
          sourceUrl: "https://www.adzuna.in",
          query: q,
          location,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error({ msg: "Adzuna job search failed", error: err });
    return new Response(
      JSON.stringify({
        data: [],
        meta: { total: 0, plan, limit, configured: true },
        error: { message: "Job search temporarily unavailable. Please try again." },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
