# PRD.md — Product Requirements Document

**Product**: CareerOS  
**Version**: 1.0.0  
**Status**: Active Development  
**Last Updated**: 2026-05-17

---

## Executive Summary

CareerOS is an AI-powered Career Operating System that transforms the job search from a painful manual process into an intelligent, automated career management platform. It combines the best of LinkedIn (networking/jobs), Simplify (applications), Teal (tracking), Rezi (resume AI), and FinalRound AI (interview prep) into a single unified product — supercharged by autonomous AI agents.

---

## Problem Statement

Job seekers face a fragmented, inefficient, and demoralizing process:
- Manually tailoring resumes for each job (2-3 hours each)
- Tracking applications across spreadsheets
- Preparing for interviews without personalized feedback
- Missing relevant jobs due to platform fragmentation
- Writing generic cover letters that get ignored
- No data on what's working and what's failing

**Result**: Average job search takes 5 months. 73% of applications never get a response.

---

## Solution

An AI-powered operating system that:
1. **Knows your profile** — parses and understands your entire career history
2. **Finds the right jobs** — aggregates and semantically matches across all platforms
3. **Applies intelligently** — tailors documents and auto-fills applications
4. **Prepares you** — conducts AI mock interviews with real feedback
5. **Tracks everything** — analytics dashboard for your entire job search
6. **Runs autonomously** — daily AI agents that work while you sleep

---

## Target Users

### Primary: Active Job Seekers (25-40)
- Software engineers, PMs, designers, data scientists
- 0-10 years experience
- Applying to 10-50+ jobs per month
- Value: time savings, higher interview rates

### Secondary: Career Changers
- Transitioning industries
- Value: skill gap analysis, targeted upskilling paths

### Tertiary: Passive Job Seekers
- Employed but open to opportunities
- Value: daily AI recommendations, low-effort exploration

---

## Features & Prioritization

### P0 — MVP (Launch Blockers)

| Feature | Description |
|---------|-------------|
| Auth | Clerk sign-up/sign-in, Google OAuth |
| Resume Upload | PDF/DOCX upload, parsing, storage |
| ATS Scoring | Real-time ATS score with improvement tips |
| Resume AI Rewrite | GPT-4o powered bullet point optimization |
| Job Search | Aggregate from Adzuna API + LinkedIn (scrape) |
| Job Saving | Save/unsave jobs, tags |
| Application Tracking | Manual status updates (Applied, Interview, Offer, Rejected) |
| Dashboard | Unified overview of all career data |
| Billing | Stripe Free/Pro/Enterprise tiers |

### P1 — Growth Features (Month 1-2)

| Feature | Description |
|---------|-------------|
| Tailored Resume Gen | AI-generates job-specific resume variants |
| Cover Letter Gen | Personalized cover letters per job |
| AI Job Matching | Semantic match score resume↔job |
| Skill Gap Analyzer | Missing skills + learning path |
| AI Mock Interview | Text-based Q&A with AI feedback |
| Browser Auto-Apply | Playwright auto-fill + user approval |
| Application Analytics | Response rates, ATS performance |

### P2 — Differentiation (Month 3-4)

| Feature | Description |
|---------|-------------|
| Voice AI Interview | Vapi/ElevenLabs real-time voice coaching |
| Daily AI Agent | Autonomous job discovery + tailored resume queue |
| n8n Workflow Engine | Email digests, reminders, smart notifications |
| Admin Panel | Full system monitoring + revenue analytics |
| Enterprise SSO | SAML/OIDC for corporate teams |
| API Access | Public API for power users |

### P3 — Scale (Month 5+)

| Feature | Description |
|---------|-------------|
| Browser Extension | One-click apply from any job board |
| Mobile App | React Native companion app |
| Referral Network | LinkedIn-style warm introductions |
| Salary Intelligence | Market rate analysis per role/location |
| Recruiter Inbound | Companies post roles directly to CareerOS |

---

## Success Metrics

### Activation
- Resume uploaded within 5 minutes of signup: >60%
- ATS score viewed within session: >80%
- First job saved within 10 minutes: >50%

### Engagement
- DAU/MAU ratio: >35%
- Applications submitted per active user per week: >5
- Interview rate from CareerOS applications: >12% (vs 3% industry average)

### Revenue
- Free → Pro conversion: >8%
- Monthly churn: <5%
- MRR Month 6: $50k

### AI Quality
- Resume ATS score improvement: avg +25 points
- User satisfaction with AI cover letters: >4.2/5
- Mock interview feedback accuracy: >4.0/5

---

## Pricing Tiers

### Free
- 1 resume upload
- 5 job saves
- 3 ATS analyses/month
- 3 AI rewrites/month
- No auto-apply
- No voice interview

### Pro — $29/month
- Unlimited resumes
- Unlimited job saves
- 50 ATS analyses/month
- 50 AI-tailored resumes/month
- 50 cover letters/month
- 10 auto-apply sessions/month
- 5 voice interview sessions/month
- Daily AI job agent
- Priority AI (GPT-4o)

### Enterprise — $99/month
- Everything in Pro
- Unlimited everything
- Team seats (up to 5)
- API access
- White-glove onboarding
- Dedicated Slack support

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Page load time | <1.5s (P95) |
| API response time | <500ms (P95) |
| AI generation time | <8s (P95) |
| System uptime | 99.9% SLA |
| Auto-apply accuracy | >95% correct form fills |
| Resume parse accuracy | >98% field extraction |
| Data retention | User data: until deletion. Logs: 90 days |
| GDPR | Full compliance — data export + deletion |
| CCPA | Full compliance |

---

## Constraints

- No storing plaintext passwords (Clerk handles auth)
- No submitting applications without explicit user approval
- No scraping at rates that violate ToS (rate-limit scrapers)
- No storing raw browser automation credentials in DB
- AI token costs must stay under $0.05/user/day on Free tier
