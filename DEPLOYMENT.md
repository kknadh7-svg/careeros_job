# DEPLOYMENT.md — Deployment & Infrastructure

**Last Updated**: 2026-05-17

---

## Infrastructure Overview

| Service | Provider | Region |
|---------|----------|--------|
| Web App | Vercel | Global Edge |
| Database | Supabase | us-east-1 |
| Redis | Upstash | Global (multi-region) |
| Python Agents | Fly.io | us-east, eu-west |
| File Storage | Supabase Storage | us-east-1 |
| Email | Resend | Global |
| Monitoring | Sentry + Axiom | Cloud |

---

## Environment Files

```bash
# .env.example (committed)
# .env.local (local dev, gitignored)
# .env.production (Vercel env vars, not in repo)

# === DATABASE ===
DATABASE_URL="postgresql://..."        # Supabase pooled connection
DIRECT_URL="postgresql://..."          # Supabase direct (for migrations)

# === AUTH ===
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"

# === SUPABASE ===
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# === AI PROVIDERS ===
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_AI_API_KEY="AIza..."
GROQ_API_KEY="gsk_..."
HELICONE_API_KEY="..."
LANGSMITH_API_KEY="..."
LANGSMITH_PROJECT="careeros-prod"

# === PAYMENTS ===
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."

# === CACHE ===
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# === BROWSER AUTOMATION ===
BROWSERBASE_API_KEY="..."
BROWSERBASE_PROJECT_ID="..."

# === VOICE AI ===
VAPI_API_KEY="..."
VAPI_PHONE_NUMBER_ID="..."
ELEVENLABS_API_KEY="..."

# === JOB APIS ===
ADZUNA_APP_ID="..."
ADZUNA_API_KEY="..."

# === MONITORING ===
SENTRY_DSN="https://...@sentry.io/..."
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
AXIOM_DATASET="careeros-logs"
AXIOM_TOKEN="..."

# === APP ===
NEXT_PUBLIC_APP_URL="https://careeros.app"
CRON_SECRET="..."       # For securing cron endpoints
```

---

## Docker Configuration

```yaml
# docker/docker-compose.yml (local development)
version: "3.9"
services:
  postgres:
    image: supabase/postgres:15.1.0.117
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: careeros
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  agents:
    build:
      context: ../apps/agents
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/careeros
      - REDIS_URL=redis://redis:6379
    depends_on: [postgres, redis]
    volumes: [../apps/agents:/app]
    command: python -m careeros_agents.worker

volumes:
  postgres_data:
```

```dockerfile
# apps/agents/Dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
  libpq-dev gcc curl \
  && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen

COPY . .

CMD ["uv", "run", "python", "-m", "careeros_agents.worker"]
```

---

## Vercel Configuration

```json
// apps/web/vercel.json
{
  "framework": "nextjs",
  "functions": {
    "app/api/v1/resumes/*/tailor/route.ts": { "maxDuration": 60 },
    "app/api/v1/interviews/*/complete/route.ts": { "maxDuration": 60 },
    "app/api/v1/applications/automate/route.ts": { "maxDuration": 30 }
  },
  "crons": [
    {
      "path": "/api/v1/cron/daily-job-agent",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/v1/cron/refresh-jobs",
      "schedule": "0 */4 * * *"
    },
    {
      "path": "/api/v1/cron/token-reset",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

---

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: { POSTGRES_PASSWORD: postgres }
        options: --health-cmd pg_isready
      redis:
        image: redis:7
        options: --health-cmd "redis-cli ping"
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit
      - run: pnpm test:integration

  python-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install uv && uv sync --frozen
        working-directory: apps/agents
      - run: uv run pytest
        working-directory: apps/agents

  deploy-staging:
    needs: [lint-typecheck, test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4
      - run: vercel deploy --token ${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    needs: [lint-typecheck, test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: vercel deploy --prod --token ${{ secrets.VERCEL_TOKEN }}
      - run: flyctl deploy --remote-only
        working-directory: apps/agents
        env: { FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }} }

  db-migrate:
    needs: [deploy-production]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: pnpm db:migrate:deploy
        env: { DATABASE_URL: ${{ secrets.DATABASE_URL }} }
```

---

## Fly.io Configuration (Python Agents)

```toml
# apps/agents/fly.toml
app = "careeros-agents"
primary_region = "iad"

[build]

[env]
  PYTHONUNBUFFERED = "1"
  LOG_LEVEL = "INFO"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  memory = "2gb"
  cpu_kind = "shared"
  cpus = 2

[processes]
  worker = "python -m careeros_agents.worker"
  api = "python -m careeros_agents.api"
```

---

## Database Migrations (Zero-Downtime)

```bash
# Local development
pnpm db:migrate:dev          # Create and apply migration
pnpm db:migrate:reset        # Reset (dev only)
pnpm db:studio               # Prisma Studio

# Production (CI/CD)
pnpm db:migrate:deploy       # Apply pending migrations (no reset)

# Generate Prisma client after schema change
pnpm db:generate
```

**Zero-downtime strategy**:
1. Deploy backward-compatible schema change (add nullable column)
2. Deploy new code that writes to both old + new column
3. Backfill data migration (async, off-peak)
4. Deploy code that only reads new column
5. Drop old column in separate migration

---

## Monitoring & Alerts

```typescript
// Error alert thresholds (PagerDuty)
const ALERT_THRESHOLDS = {
  errorRate: 0.05,          // >5% error rate → alert
  p95Latency: 2000,         // >2s P95 → alert
  aiFailureRate: 0.1,       // >10% AI failures → alert
  queueDepth: 500,          // >500 queued jobs → alert
  dbConnections: 80,        // >80% pool used → alert
};
```

**Dashboards**:
- Vercel Analytics: web vitals, edge function stats
- Supabase Dashboard: query performance, DB health
- Upstash Console: Redis usage, cache hit rate
- LangSmith: per-agent traces, token usage
- Helicone: LLM cost by model/feature
- PostHog: user behavior, funnel analysis
- Better Uptime: public status page (status.careeros.app)
