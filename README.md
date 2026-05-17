# CareerOS — AI-Powered Career Operating System

> The intelligent career platform that finds jobs, tailors your resume, auto-applies, and coaches you through interviews — all autonomously.

[![CI](https://github.com/your-org/careeros/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/careeros/actions)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

---

## What is CareerOS?

CareerOS is a production-grade SaaS platform that transforms job searching from a painful manual process into an intelligent, automated career management system.

**Core capabilities:**
- 🤖 **AI Resume Engine** — Parse, score, optimize, and tailor resumes with GPT-4o
- 🔍 **Job Aggregation** — Real-time jobs from LinkedIn, Indeed, Greenhouse, Lever, Adzuna
- ⚡ **Auto-Apply** — Browser automation fills and submits applications (with your approval)
- 🎯 **AI Job Matching** — Semantic matching between your resume and thousands of jobs
- 📊 **Skill Gap Analysis** — Know exactly what skills to learn for your target roles
- 🎙️ **Mock Interviews** — AI voice and text interviews with scoring and feedback
- 📈 **Analytics Dashboard** — Track every metric of your job search performance
- 🤖 **Daily AI Agent** — Autonomous agent that works overnight to find and prep applications

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes, Supabase Edge Functions |
| Database | PostgreSQL (Supabase), Prisma ORM, pgvector |
| AI | OpenAI GPT-4o, Claude claude-sonnet-4-6, Gemini 1.5 Pro, Groq |
| Agents | LangGraph, PydanticAI |
| RAG | LangChain, LlamaIndex, OpenAI Embeddings |
| Browser | Playwright, Stagehand, Browserbase |
| Auth | Clerk + Google OAuth |
| Payments | Stripe |
| Cache | Upstash Redis |
| Voice | Vapi, ElevenLabs |
| Queue | BullMQ |
| Monitoring | LangSmith, Helicone, Sentry |
| Deploy | Vercel, Supabase, Fly.io |

---

## Project Structure

```
careeros/
├── apps/
│   ├── web/          # Next.js 15 app (frontend + API)
│   └── agents/       # Python LangGraph agent service
├── packages/
│   ├── database/     # Prisma schema + client
│   └── types/        # Shared TypeScript types
├── supabase/         # Edge Functions + SQL migrations
├── n8n/              # Workflow automation JSON
└── docker/           # Local development containers
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system design.

---

## Quick Start

```bash
# Prerequisites: Node 20+, pnpm 9+, Python 3.12+, Docker

git clone https://github.com/your-org/careeros.git
cd careeros
pnpm install
cp .env.example apps/web/.env.local
docker compose -f docker/docker-compose.yml up -d
pnpm db:migrate:dev
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

Full setup guide: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [CLAUDE.md](./CLAUDE.md) | Engineering standards for Claude Code |
| [PRD.md](./PRD.md) | Product requirements & feature specs |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture & design decisions |
| [DATABASE.md](./DATABASE.md) | Database schema & indexing strategy |
| [API.md](./API.md) | API reference & contracts |
| [AGENTS.md](./AGENTS.md) | AI agent architecture & implementations |
| [WORKFLOWS.md](./WORKFLOWS.md) | Automation workflows & pipelines |
| [SECURITY.md](./SECURITY.md) | Security architecture & standards |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment & infrastructure guide |
| [UI_UX.md](./UI_UX.md) | Design system & UX standards |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Development guide & standards |

---

## Pricing

| Plan | Price | Key Limits |
|------|-------|-----------|
| Free | $0 | 3 ATS analyses/mo, 3 AI rewrites/mo |
| Pro | $29/mo | 50 analyses/mo, auto-apply, voice interviews |
| Enterprise | $99/mo | Unlimited, team seats, API access |

---

## Roadmap

- [x] Resume parsing + ATS scoring
- [x] Job aggregation (Adzuna, Greenhouse, Lever)
- [x] AI resume tailoring
- [x] Cover letter generation
- [x] Application tracking (Kanban)
- [x] Text mock interviews
- [ ] Browser auto-apply (Beta)
- [ ] Voice AI interviews
- [ ] Daily AI job agent
- [ ] Browser extension
- [ ] Mobile app (React Native)

---

## License

AGPL-3.0 — see [LICENSE](LICENSE)

---

## Support

- Issues: [GitHub Issues](https://github.com/your-org/careeros/issues)
- Docs: [docs.careeros.app](https://docs.careeros.app)
- Community: [Discord](https://discord.gg/careeros)
