# ARCHITECTURE.md — System Architecture

**Last Updated**: 2026-05-17

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│  Next.js 15 App Router (Vercel Edge Network)                         │
│  React Server Components + Client Islands                            │
│  TanStack Query + Zustand + React Hook Form                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS / WebSocket
┌────────────────────────────▼────────────────────────────────────────┐
│                         API GATEWAY LAYER                            │
│  Next.js API Routes /api/v1/*                                        │
│  Clerk JWT Middleware → Rate Limiter (Upstash) → Handler             │
│  Zod Validation → Business Logic → Response                          │
└──────┬──────────────┬────────────────┬──────────────┬───────────────┘
       │              │                │              │
       ▼              ▼                ▼              ▼
┌──────────┐  ┌───────────────┐ ┌──────────┐ ┌──────────────────────┐
│ Supabase │  │ Supabase Edge │ │  BullMQ  │ │   Python Agent       │
│   (DB)   │  │  Functions    │ │  Queue   │ │   Service (Fly.io)   │
│PostgreSQL│  │(embed, score) │ │(Upstash) │ │  LangGraph + Vapi    │
│ pgvector │  └───────────────┘ └────┬─────┘ └──────────────────────┘
│  RLS     │                         │
└──────────┘          ┌──────────────▼──────────────────┐
                      │      Worker Processes            │
                      │  - Resume Embedder               │
                      │  - Job Scraper                   │
                      │  - Application Automator         │
                      │  - Daily Job Agent               │
                      └─────────────────────────────────┘
```

---

## Component Architecture

### Frontend (Next.js 15)

```
App Router Architecture:
- (marketing)/ → Static ISR pages, edge-cached
- (auth)/      → Clerk-managed, no DB calls
- (dashboard)/ → Server Components + Client Islands
  - RSC: fetch data server-side (no loading flash)
  - Islands: interactive widgets (resume editor, job board)
  - Streaming: Suspense boundaries for progressive loading
- admin/        → Role-gated, admin-only RSC pages
- api/v1/       → Edge Runtime API routes
```

### Data Flow (Dashboard Example)

```
User visits /dashboard
      │
      ▼
Next.js RSC (server)
      │── Clerk auth check (middleware)
      │── Prisma query (server-side, no waterfall)
      │── Parallel: fetch resumes + jobs + analytics
      │
      ▼
Streamed HTML → Client hydration
      │
      ▼
TanStack Query (client)
      │── Real-time updates via polling/websocket
      │── Optimistic updates for user actions
      └── Background prefetch for adjacent routes
```

---

## Database Architecture

**Primary**: Supabase PostgreSQL (managed)
- Read replicas for analytics queries
- Connection pooling via PgBouncer (Supabase built-in)
- Row Level Security (RLS) for all user tables

**Vector Store**: pgvector extension (same DB)
- Resume embeddings: `text-embedding-3-large` (3072 dims)
- Job embeddings: `text-embedding-3-small` (1536 dims)
- Similarity search: IVFFlat index for speed

**Cache Layer (2-tier)**:
- L1: In-memory (Next.js unstable_cache, 60s)
- L2: Upstash Redis (global edge, TTL varies)

```
Cache TTLs:
- User profile: 5 min
- Job listings: 15 min
- ATS scores: 1 hour
- AI-generated content: 24 hours
- Job recommendations: 1 hour
```

---

## AI Architecture

### Model Cascade (Fallback Chain)
```
Primary:   OpenAI GPT-4o
         ↓ (timeout >8s or error)
Fallback:  Anthropic Claude claude-sonnet-4-6
         ↓ (timeout >8s or error)
Fallback:  Google Gemini 1.5 Pro
         ↓ (timeout >5s or error)
Fallback:  Groq Llama3-70b (fastest, lowest cost)
```

### AI Features Map

| Feature | Primary Model | Technique |
|---------|--------------|-----------|
| Resume parsing | GPT-4o | Structured outputs |
| ATS scoring | Claude claude-sonnet-4-6 | Chain-of-thought |
| Resume optimization | GPT-4o | Few-shot + RAG |
| Cover letter gen | GPT-4o | Template + personalization |
| Job matching | text-embedding-3-large | Cosine similarity |
| Skill gap analysis | Claude claude-sonnet-4-6 | ReAct agent |
| Interview Q&A | GPT-4o | Conversational RAG |
| Voice interview | Vapi + GPT-4o realtime | WebRTC + function calls |
| Daily job agent | LangGraph | Multi-agent orchestration |
| Form auto-fill | GPT-4o + Stagehand | Browser AI agent |

### RAG Pipeline (Resume ↔ Job Matching)

```
Resume Upload
      │
      ▼
PDF/DOCX Parser (PyMuPDF + python-docx)
      │
      ▼
Chunk → Embed (text-embedding-3-large)
      │
      ▼
Store in pgvector (resume_embeddings table)
      │
Job Description Input
      │
      ▼
Embed job (text-embedding-3-small)
      │
      ▼
Cosine similarity search → Top-K resume chunks
      │
      ▼
Rerank with GPT-4o → Match score + analysis
```

---

## Queue Architecture (BullMQ + Upstash Redis)

### Queue Definitions

```typescript
Queues:
- resume:parse        // Parse uploaded resumes (priority: high)
- resume:embed        // Generate embeddings after parse
- resume:score        // ATS scoring
- jobs:scrape         // Daily job scraping per source
- jobs:embed          // Embed new job descriptions
- jobs:match          // Match jobs to users (fan-out)
- application:automate // Browser automation sessions
- interview:analyze   // Post-interview analysis
- notifications:send  // Email/push notifications
- agents:daily        // Daily AI agent per user
```

### Job Lifecycle

```
User uploads resume
      │
      ▼
resume:parse (immediate)
      │ ✓
      ▼
resume:embed (5s delay)
      │ ✓
      ▼
resume:score (10s delay)
      │ ✓
      ▼
jobs:match (fan-out to all saved searches)
      │ ✓
      ▼
notifications:send (if new matches >5)
```

---

## Browser Automation Architecture

### Session Management

```
User requests auto-apply
      │
      ▼
Check Browserbase quota (per plan)
      │
      ▼
Create Browserbase session (cloud browser)
      │
      ▼
Stagehand initializes with AI vision
      │
      ▼
Navigate to job application URL
      │
      ▼
AI analyzes form fields (Stagehand.act)
      │
      ▼
Fill fields with tailored resume data
      │
      ▼
Upload resume/cover letter
      │
      ▼
Screenshot preview sent to user
      │
      ▼
WAIT FOR USER APPROVAL (required)
      │
      ▼ (approved)
Submit application
      │
      ▼
Log result + update application record
      │
      ▼
Close session + store logs
```

### Anti-Detection Strategy
- Randomized delays between actions (500-2000ms)
- Realistic mouse movement simulation
- Browser fingerprint randomization via Browserbase
- Rotating residential proxies for scraping
- Session persistence (avoid repeated logins)

---

## Security Architecture

### Authentication Flow
```
Request → Clerk middleware → JWT verification
       → Extract userId + orgId + role
       → Attach to request context
       → API handler checks permissions
       → Supabase RLS enforces data isolation
```

### Data Isolation
- Every user table has `user_id` FK with RLS policy
- Service role key ONLY used in server-side background jobs
- Anon key used for public endpoints only
- All PII encrypted at rest (Supabase AES-256)

---

## Scaling Strategy

### Horizontal Scaling Bottlenecks & Solutions

| Bottleneck | Scale Point | Solution |
|------------|-------------|----------|
| DB connections | >1000 concurrent | PgBouncer pooling |
| AI API calls | >100 req/min | Redis rate limiting + queue |
| Browser sessions | >50 concurrent | Browserbase elastic scaling |
| Job scraping | >10k jobs/day | Distributed worker pool |
| Embeddings | >10k docs/day | Batch API + async queue |

### Cost Optimization
- Batch embedding generation (OpenAI Batch API: 50% cost reduction)
- Cache AI responses (Redis): avoid regenerating same output
- Use Groq for non-quality-critical tasks (10x cheaper)
- Implement token budgets per user tier
- Compress embeddings in transit (binary format)

---

## Monitoring Stack

```
Application Errors:    Sentry (web + agents)
LLM Traces:           LangSmith (per-agent, per-call)
LLM Costs:            Helicone (usage dashboard)
Infrastructure:        Vercel Analytics + Supabase Dashboard
Custom Metrics:        PostHog (product analytics)
Uptime:               Better Uptime (public status page)
Logs:                 Vercel Log Drains → Axiom
```

---

## Deployment Architecture

```
DNS (Cloudflare) → Vercel Edge Network
                       │
              ┌────────┴────────┐
              │                 │
         Web App           API Routes
      (RSC + Static)      (Edge Runtime)
              │                 │
              └────────┬────────┘
                       │
                 Supabase (managed)
                 ├── PostgreSQL + pgvector
                 ├── Edge Functions
                 ├── Storage (files)
                 └── Auth (backup)
                       │
                  Upstash Redis
                  (global, multi-region)
                       │
                   Fly.io
                 (Python agents)
                 └── LangGraph workers
```
