import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Auth (Clerk)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  CLERK_SECRET_KEY: z.string().startsWith("sk_"),
  CLERK_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/dashboard"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/onboarding"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // AI Providers (OpenAI required; others are fallback cascade — optional for local dev)
  OPENAI_API_KEY: z.string().startsWith("sk-"),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-").optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().startsWith("gsk_").optional(),

  // AI Monitoring (optional for local dev)
  LANGSMITH_API_KEY: z.string().optional(),
  LANGSMITH_PROJECT: z.string().default("careeros-dev"),
  HELICONE_API_KEY: z.string().optional(),

  // Payments — Razorpay (optional for local dev)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),

  // Cache — Upstash Redis (optional; app works without it, just no caching)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Browser Automation (optional for local dev)
  BROWSERBASE_API_KEY: z.string().optional(),
  BROWSERBASE_PROJECT_ID: z.string().optional(),

  // Voice AI (optional for local dev)
  VAPI_API_KEY: z.string().optional(),

  // Job APIs (optional for local dev)
  ADZUNA_APP_ID: z.string().optional(),
  ADZUNA_API_KEY: z.string().optional(),

  // Monitoring (optional)
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  AXIOM_DATASET: z.string().optional(),
  AXIOM_TOKEN: z.string().optional(),

  // Email (optional for local dev)
  RESEND_API_KEY: z.string().startsWith("re_").optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().min(8).default("dev-cron-secret-not-for-production"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

// Validate at module load time — fail fast if config is broken
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:\n",
    parsed.error.flatten().fieldErrors
  );
  throw new Error("Invalid environment variables — check .env.local");
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
