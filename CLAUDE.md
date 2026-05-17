# CLAUDE.md — CareerOS Engineering Bible

> This file is the single source of truth for Claude Code working on the CareerOS platform.
> Read this ENTIRELY before generating any code. Update it whenever architecture evolves.

---

## Project Overview

**CareerOS** is a production-grade AI-powered Career Operating System SaaS.
It combines resume intelligence, job aggregation, browser-automated applications,
AI mock interviews, and autonomous daily job agents into one unified platform.

Target: Scale to 1M+ users. Architecture must support it from day 1.

---

## Architecture Standards

- **Monorepo**: `apps/web` (Next.js 15), `apps/agents` (Python LangGraph), `packages/*` (shared)
- **Frontend**: Next.js 15 App Router, React Server Components, TypeScript strict
- **Backend**: Next.js API Routes + Supabase Edge Functions (Deno)
- **Database**: PostgreSQL via Supabase, accessed through Prisma ORM
- **AI**: OpenAI GPT-4o, Claude claude-sonnet-4-6, Gemini 1.5 Pro, Groq (fallback)
- **Agent Framework**: LangGraph (Python), PydanticAI for structured outputs
- **RAG**: LangChain + LlamaIndex + pgvector (Supabase)
- **Browser Automation**: Playwright + Stagehand + Browserbase
- **Queue**: BullMQ on Upstash Redis
- **Caching**: Upstash Redis (tiered: L1 in-memory, L2 Redis)
- **Monitoring**: LangSmith (AI traces), Helicone (LLM costs), Sentry (errors)
- **Auth**: Clerk (primary) with Supabase RLS sync
- **Payments**: Stripe (subscriptions + usage-based billing)
- **Deployment**: Vercel (web), Supabase (DB + Edge), Fly.io (Python agents)

---

## Folder Structure Rules

```
careeros/
├── apps/
│   ├── web/                          # Next.js 15 frontend + API
│   │   ├── app/                      # App Router pages
│   │   │   ├── (marketing)/          # Landing, pricing, blog
│   │   │   ├── (auth)/               # Sign-in, sign-up, SSO
│   │   │   ├── (dashboard)/          # Protected app routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── resumes/
│   │   │   │   ├── jobs/
│   │   │   │   ├── applications/
│   │   │   │   ├── interviews/
│   │   │   │   ├── analytics/
│   │   │   │   └── settings/
│   │   │   ├── admin/                # Admin panel (role-gated)
│   │   │   └── api/                  # API route handlers
│   │   │       ├── v1/
│   │   │       │   ├── resumes/
│   │   │       │   ├── jobs/
│   │   │       │   ├── applications/
│   │   │       │   ├── interviews/
│   │   │       │   ├── agents/
│   │   │       │   ├── webhooks/
│   │   │       │   └── admin/
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui primitives (auto-generated)
│   │   │   ├── layout/               # Shell, sidebar, nav, header
│   │   │   ├── features/             # Feature-specific components
│   │   │   │   ├── resume/
│   │   │   │   ├── jobs/
│   │   │   │   ├── applications/
│   │   │   │   ├── interviews/
│   │   │   │   └── analytics/
│   │   │   └── shared/               # Truly reusable across features
│   │   ├── lib/
│   │   │   ├── ai/                   # AI provider clients
│   │   │   │   ├── openai.ts
│   │   │   │   ├── anthropic.ts
│   │   │   │   ├── gemini.ts
│   │   │   │   └── groq.ts
│   │   │   ├── db/                   # Prisma client + query helpers
│   │   │   ├── queue/                # BullMQ job definitions
│   │   │   ├── cache/                # Redis cache layer
│   │   │   ├── auth/                 # Clerk helpers + RLS sync
│   │   │   ├── stripe/               # Stripe helpers
│   │   │   ├── storage/              # Supabase Storage
│   │   │   ├── monitoring/           # Sentry + LangSmith + Helicone
│   │   │   └── utils/
│   │   ├── hooks/                    # React hooks
│   │   ├── stores/                   # Zustand stores
│   │   ├── types/                    # Global TypeScript types
│   │   └── middleware.ts             # Clerk auth + rate limiting
│   └── agents/                       # Python LangGraph agent services
│       ├── careeros_agents/
│       │   ├── resume/               # Resume AI agents
│       │   ├── jobs/                 # Job discovery agents
│       │   ├── applications/         # Application automation agents
│       │   ├── interviews/           # Interview coach agents
│       │   └── orchestrator/         # Multi-agent coordinator
│       ├── pyproject.toml
│       └── Dockerfile
├── packages/
│   ├── database/                     # Prisma schema + migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       └── client.ts
│   ├── types/                        # Shared TypeScript types
│   │   └── src/
│   │       └── index.ts
│   ├── config/                       # Shared config (ESLint, TSConfig)
│   └── ui/                           # Internal design system (if needed)
├── supabase/
│   ├── functions/                    # Edge Functions (Deno)
│   │   ├── embed-resume/
│   │   ├── score-ats/
│   │   └── daily-job-agent/
│   └── migrations/                   # SQL migrations
├── n8n/
│   └── workflows/                    # Importable n8n JSON workflows
├── docker/
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── .github/
│   └── workflows/                    # CI/CD pipelines
├── CLAUDE.md
├── PRD.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── AGENTS.md
├── WORKFLOWS.md
├── SECURITY.md
├── DEPLOYMENT.md
├── UI_UX.md
├── CONTRIBUTING.md
└── README.md
```

---

## Coding Standards

### TypeScript Rules
- `strict: true` always — no `any`, use `unknown` with type guards
- Explicit return types on all exported functions
- Zod for ALL runtime validation (API inputs, env vars, AI outputs)
- No implicit `undefined` — use `Option<T>` pattern or explicit null checks
- Barrel exports from `index.ts` in every module directory
- Use `satisfies` operator for config objects

### Naming Conventions
- **Files**: `kebab-case.ts` (all files), `PascalCase.tsx` (React components)
- **Components**: `PascalCase` (e.g., `ResumeCard.tsx`)
- **Hooks**: `useXxx` (e.g., `useResumeScore.ts`)
- **API routes**: `route.ts` per segment (App Router convention)
- **Types**: `PascalCase` interfaces, `TXxx` for generics
- **Env vars**: `SCREAMING_SNAKE_CASE`
- **DB tables**: `snake_case` (Prisma maps to camelCase)
- **Zod schemas**: `xyzSchema` (e.g., `resumeUploadSchema`)

### API Standards
- All endpoints under `/api/v1/`
- RESTful + JSON:API-inspired structure
- Always return `{ data, error, meta }` envelope
- HTTP status codes must be semantically correct
- Zod validation on every request body and query param
- Rate limit headers on every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- API keys in `Authorization: Bearer <token>` header
- Idempotency keys for mutation endpoints

### Error Handling Rules
- Never throw raw errors — always wrap in typed `AppError` class
- Use `Result<T, E>` pattern for fallible operations
- Log all errors to Sentry with context (user ID, request ID, stack)
- AI failures must fall back gracefully (model cascade: GPT-4o → Claude → Gemini → Groq)
- Browser automation failures retry 3x with exponential backoff

### AI Orchestration Standards
- Every AI call wrapped in Helicone for cost tracking
- Every agent trace sent to LangSmith
- Structured outputs via Zod schemas (OpenAI structured outputs / Claude tool use)
- Prompt versions stored in DB — never hardcode prompts in source
- Token budgets enforced per user tier (Free: 50k/mo, Pro: 500k/mo, Enterprise: unlimited)
- AI responses cached in Redis (TTL: 1h for job matches, 24h for resume analysis)

### Browser Automation Standards
- Use Stagehand for AI-guided automation, raw Playwright for structured sites
- Sessions managed via Browserbase (cloud) in production, local Playwright in dev
- Anti-detection: randomized delays, realistic user-agent rotation
- NEVER submit applications without explicit user approval
- Store full automation logs + screenshots per session
- Retry failed selectors with AI-powered re-detection

### Security Standards
- All secrets in environment variables, validated via Zod at startup
- Clerk JWT validated on every protected API route
- Supabase RLS policies enforced — never bypass with service role in user-facing APIs
- File uploads: type validation, size limits (10MB resumes), virus scanning header check
- SQL: Prisma parameterized queries only — no raw string interpolation
- CORS: whitelist only known origins
- Content-Security-Policy headers on all pages

### Logging Standards
- Structured JSON logs everywhere (no `console.log` in production)
- Log levels: `debug` | `info` | `warn` | `error` | `fatal`
- Every log includes: `requestId`, `userId`, `service`, `timestamp`, `duration`
- Use `pino` in Next.js, `structlog` in Python agents

### State Management Strategy
- **Server state**: TanStack Query v5 (fetch, cache, sync)
- **UI state**: Zustand (lightweight, modular stores per feature)
- **Form state**: React Hook Form + Zod resolvers
- **URL state**: `nuqs` (Next.js URL search params)
- No Redux — too heavy for this architecture

### Testing Standards
- Unit tests: Vitest
- Integration tests: Vitest + Supertest (API routes)
- E2E tests: Playwright
- AI agent tests: pytest + VCR cassettes (record/replay LLM calls)
- Coverage target: 80%+ on business logic, 60%+ overall
- CI blocks on failing tests

---

## Reusable Component Strategy
- Use shadcn/ui as base — copy into `components/ui/`, never import from node_modules directly
- Build feature components by composing ui primitives
- Every component: typed props interface, no inline styles, use `cn()` utility
- Loading states: always implement Suspense boundaries + skeleton fallbacks
- Error states: always implement error boundaries per feature section

---

## Performance Rules
- All DB queries must have EXPLAIN ANALYZE run — no N+1 queries
- Implement cursor-based pagination (never offset pagination at scale)
- Images: Next.js `<Image>` with blur placeholder always
- Bundle: dynamic imports for heavy features (PDF viewer, interview room)
- Cache aggressively: static pages ISR, dynamic data Redis TTL

---

## Documentation Drift Prevention
- When any API changes, update `API.md` in the same PR
- When any DB schema changes, update `DATABASE.md` and generate migration
- When any new agent is added, update `AGENTS.md`
- CI lint step checks that markdown docs were updated with code changes
