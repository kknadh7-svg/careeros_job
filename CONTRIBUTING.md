# CONTRIBUTING.md — Development Guide

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Python 3.12+
- Docker + Docker Compose
- Git

### Local Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/careeros.git
cd careeros

# 2. Install Node dependencies
pnpm install

# 3. Install Python dependencies
cd apps/agents && pip install uv && uv sync && cd ../..

# 4. Copy environment files
cp .env.example apps/web/.env.local
cp apps/agents/.env.example apps/agents/.env

# 5. Start local services (Postgres + Redis)
docker compose -f docker/docker-compose.yml up -d

# 6. Run database migrations
pnpm db:migrate:dev
pnpm db:generate

# 7. Seed development data
pnpm db:seed

# 8. Start development servers
pnpm dev          # Next.js on :3000
pnpm agents:dev   # Python agents on :8080
```

### Available Scripts

```bash
# Development
pnpm dev              # Start Next.js dev server
pnpm agents:dev       # Start Python agent service

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate:dev   # Create + apply migration
pnpm db:migrate:deploy # Apply migrations (production)
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed dev data
pnpm db:reset         # Reset DB (dev only)

# Testing
pnpm test             # Run all tests
pnpm test:unit        # Unit tests (Vitest)
pnpm test:e2e         # E2E tests (Playwright)
pnpm test:watch       # Watch mode

# Code quality
pnpm lint             # ESLint
pnpm typecheck        # TypeScript type check
pnpm format           # Prettier
pnpm check            # lint + typecheck + format
```

---

## Branch Strategy

```
main        → Production (protected, requires PR + 2 reviews)
develop     → Staging (protected, requires PR + 1 review)
feature/*   → Feature branches (off develop)
fix/*       → Bug fixes (off develop or main for hotfixes)
chore/*     → Maintenance tasks
```

### Commit Convention (Conventional Commits)
```
feat(resumes): add ATS score breakdown chart
fix(auth): resolve clerk webhook signature validation
chore(deps): update Next.js to 15.2.0
docs(api): document new resume tailor endpoint
refactor(queue): extract worker factory pattern
test(interviews): add integration tests for scoring
```

---

## Code Review Standards

### PR Requirements
- [ ] TypeScript types complete (no implicit any)
- [ ] Zod validation on new API endpoints
- [ ] Loading states on new async components
- [ ] Error boundaries on new feature sections
- [ ] Tests for new business logic
- [ ] Documentation updated (API.md, DATABASE.md, etc.)
- [ ] No console.log in committed code
- [ ] No hardcoded secrets

### PR Size
- Aim for PRs that can be reviewed in <30 minutes
- Large features: split into data layer PR + UI PR
- DB migrations: always separate PR, reviewed by tech lead

---

## Adding a New Feature

### 1. Backend First
```
packages/database/prisma/schema.prisma  → Add model
supabase/migrations/                    → Add SQL migration
apps/web/app/api/v1/{feature}/          → Add route handlers
apps/web/lib/                           → Add service layer
```

### 2. AI Agent (if needed)
```
apps/agents/careeros_agents/{feature}/  → Add agent
apps/web/lib/queue/workers/             → Add BullMQ worker
apps/web/lib/queue/queues.ts            → Register queue
```

### 3. Frontend
```
apps/web/app/(dashboard)/{feature}/     → Add page
apps/web/components/features/{feature}/ → Add components
apps/web/hooks/use-{feature}.ts         → Add data hook
apps/web/stores/{feature}-store.ts      → Add Zustand store (if needed)
```

### 4. Update Docs
```
API.md     → Document new endpoints
AGENTS.md  → Document new agents (if any)
DATABASE.md → Document new schema changes
```

---

## Testing Standards

### Unit Tests (Vitest)
```typescript
// apps/web/lib/resumes/__tests__/ats-scorer.test.ts
import { describe, it, expect, vi } from "vitest";
import { calculateAtsScore } from "../ats-scorer";

describe("calculateAtsScore", () => {
  it("returns 0 for empty resume", () => {
    expect(calculateAtsScore("", null)).toBe(0);
  });

  it("correctly scores keyword density", () => {
    const resume = "Software Engineer with React and TypeScript experience";
    const job = { skills: ["React", "TypeScript", "Node.js"] };
    const score = calculateAtsScore(resume, job);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThan(100);
  });
});
```

### Integration Tests (API Routes)
```typescript
// Test against real test database
import { testClient } from "../test-utils";

describe("POST /api/v1/resumes/upload", () => {
  it("rejects non-PDF files", async () => {
    const response = await testClient.post("/api/v1/resumes/upload", {
      file: new Blob(["invalid"], { type: "text/plain" }),
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
```

### E2E Tests (Playwright)
```typescript
// apps/web/e2e/resume-upload.spec.ts
test("user can upload and score a resume", async ({ page }) => {
  await page.goto("/resumes");
  await page.getByTestId("upload-zone").setInputFiles("fixtures/resume.pdf");
  await expect(page.getByTestId("ats-score")).toBeVisible({ timeout: 15000 });
  const score = await page.getByTestId("ats-score").textContent();
  expect(parseInt(score!)).toBeGreaterThan(0);
});
```

---

## Performance Guidelines

- No component renders without measuring first (React DevTools Profiler)
- DB queries: always check EXPLAIN ANALYZE before merging
- Bundle: run `pnpm analyze` before adding large dependencies
- Image: always use `next/image` with width/height or fill
- Fonts: subset fonts, preload in `<head>`

---

## Troubleshooting

### Common Issues

**Prisma client out of sync**
```bash
pnpm db:generate
```

**Redis connection refused**
```bash
docker compose -f docker/docker-compose.yml up -d redis
```

**Clerk webhook failing locally**
```bash
# Use Clerk dashboard → Webhooks → Add endpoint pointing to ngrok URL
ngrok http 3000
```

**Python agent imports failing**
```bash
cd apps/agents && uv sync && uv run python -c "import careeros_agents"
```
