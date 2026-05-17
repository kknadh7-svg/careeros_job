# SECURITY.md — Security Architecture

**Standard**: OWASP Top 10, SOC2 Type II ready  
**Last Updated**: 2026-05-17

---

## Authentication & Authorization

### Clerk JWT Flow
```
Client → Clerk SDK (sign in) → JWT issued (RS256)
Client → API request with Bearer token
Next.js middleware → clerkMiddleware() → verifies JWT
Route handler → auth() → gets userId, orgId, role
Supabase → RLS uses auth.uid() from JWT
```

### Protected Route Configuration
```typescript
// apps/web/middleware.ts
export default clerkMiddleware((auth, req) => {
  const isPublic = publicRoutes.includes(req.nextUrl.pathname);
  if (!isPublic) auth().protect();
});

const publicRoutes = ["/", "/pricing", "/blog", "/api/v1/webhooks/stripe", "/api/v1/webhooks/clerk"];
```

### Role-Based Access Control
```typescript
type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

// Guard for admin routes
export function requireRole(role: UserRole) {
  return (handler: RouteHandler) => async (req: Request) => {
    const { userId } = auth();
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user || !hasRole(user.role, role)) {
      return unauthorized("Insufficient permissions");
    }
    return handler(req);
  };
}
```

---

## Data Security

### Encryption at Rest
- Database: Supabase AES-256 at rest (managed)
- File storage: Supabase Storage AES-256
- Redis: Upstash TLS in transit, encrypted at rest
- Sensitive fields (SSN, salary expectations): client-side encrypted before storage

### Encryption in Transit
- TLS 1.3 minimum on all connections
- HSTS with preload
- Certificate pinning for mobile app (future)

### PII Data Handling
```typescript
// PII fields that get special treatment
const PII_FIELDS = ['email', 'phone', 'address', 'ssn'] as const;

// Mask PII in logs
function maskPII(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      PII_FIELDS.includes(k as any) ? '[REDACTED]' : v,
    ])
  );
}
```

---

## API Security

### Input Validation
```typescript
// Every API route MUST start with schema validation
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = resumeUploadSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  // proceed with parsed.data
}
```

### Rate Limiting (Upstash Ratelimit)
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  analytics: true,
});

export async function withRateLimit(userId: string, endpoint: string) {
  const { success, limit, remaining, reset } = await ratelimit.limit(
    `${userId}:${endpoint}`
  );
  return { success, headers: rateLimitHeaders(limit, remaining, reset) };
}
```

### SQL Injection Prevention
- Prisma ORM with parameterized queries ONLY
- No `$queryRaw` with string interpolation
- Supabase RLS as defense-in-depth

### XSS Prevention
- React auto-escapes JSX — never use `dangerouslySetInnerHTML`
- CSP headers: `script-src 'self' 'nonce-{nonce}'`
- DOMPurify for any user-generated HTML (cover letters preview)

### CSRF Protection
- Next.js App Router CSRF tokens built-in for Server Actions
- API routes: SameSite=Strict cookies + double-submit token

---

## File Upload Security

```typescript
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
] as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const resumeUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size <= MAX_FILE_SIZE_BYTES, "File must be under 10MB")
    .refine((f) => ALLOWED_MIME_TYPES.includes(f.type as any), "Only PDF/DOCX allowed"),
});

// Server-side: verify magic bytes (not just Content-Type header)
async function verifyFileMagicBytes(buffer: ArrayBuffer): Promise<boolean> {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  const pdfMagic = [0x25, 0x50, 0x44, 0x46]; // %PDF
  const docxMagic = [0x50, 0x4b, 0x03, 0x04]; // ZIP (DOCX)
  return arraysEqual(bytes, pdfMagic) || arraysEqual(bytes, docxMagic);
}
```

---

## Browser Automation Security

```typescript
// Never store raw credentials for automation
// Use ephemeral session tokens only

interface AutomationSession {
  sessionId: string;           // Browserbase session ID
  userId: string;              // Who owns this session
  expiresAt: Date;             // Max 30 min sessions
  approvalRequired: true;      // ALWAYS true — no auto-submit
  screenshotsEnabled: true;    // For audit trail
}

// Audit log every automated action
interface AutomationLog {
  action: "navigate" | "fill" | "click" | "upload" | "submit";
  timestamp: Date;
  details: string;
  screenshotUrl?: string;
}
```

---

## Secrets Management

### Environment Variable Validation (startup check)
```typescript
// apps/web/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  CLERK_SECRET_KEY: z.string().startsWith("sk_"),
  OPENAI_API_KEY: z.string().startsWith("sk-"),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
  GOOGLE_AI_API_KEY: z.string(),
  GROQ_API_KEY: z.string().startsWith("gsk_"),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  BROWSERBASE_API_KEY: z.string(),
  VAPI_API_KEY: z.string(),
  LANGSMITH_API_KEY: z.string(),
  HELICONE_API_KEY: z.string(),
});

export const env = envSchema.parse(process.env);
```

### Secret Rotation
- API keys: rotate every 90 days (automated via GitHub Actions)
- Stripe webhook secrets: rotate on security incidents only
- Database passwords: managed by Supabase (auto-rotate available)

---

## GDPR / CCPA Compliance

```typescript
// Data export endpoint
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const [user, resumes, applications, interviews, aiGenerations] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.resume.findMany({ where: { userId } }),
    db.application.findMany({ where: { userId } }),
    db.interview.findMany({ where: { userId } }),
    db.aiGeneration.findMany({ where: { userId } }),
  ]);
  return { user, resumes, applications, interviews, aiGenerations };
}

// Account deletion (cascade via DB FK + Clerk user delete)
export async function deleteUserAccount(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), email: `deleted-${userId}@careeros.app` },
  });
  await clerkClient.users.deleteUser(user.clerkId);
  await stripe.customers.del(user.stripeCustomerId);
}
```

---

## Security Headers (Next.js)

```typescript
// next.config.ts
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'nonce-{nonce}' https://js.stripe.com https://clerk.careeros.app",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      "frame-src https://js.stripe.com",
    ].join("; "),
  },
];
```

---

## Incident Response

1. **Detection**: Sentry alert → PagerDuty on-call
2. **Containment**: Rate limit endpoint, invalidate affected JWTs via Clerk
3. **Investigation**: Pull logs from Axiom, check LangSmith traces
4. **Remediation**: Hot-patch via Vercel instant rollback
5. **Post-mortem**: 48hr report, update runbooks
