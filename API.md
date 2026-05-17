# API.md — API Design Reference

**Base URL**: `https://careeros.app/api/v1`  
**Auth**: `Authorization: Bearer <clerk_jwt>`  
**Format**: JSON  
**Versioning**: URL path (`/v1/`)

---

## Response Envelope

All responses follow this structure:

```typescript
// Success
{
  "data": T,
  "meta": {
    "requestId": string,
    "timestamp": string,
    "pagination"?: { page, limit, total, hasMore }
  }
}

// Error
{
  "error": {
    "code": string,        // machine-readable
    "message": string,     // human-readable
    "details"?: unknown    // validation errors, etc.
  },
  "meta": { "requestId": string, "timestamp": string }
}
```

## Standard Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | VALIDATION_ERROR | Zod schema failed |
| 401 | UNAUTHORIZED | Missing/invalid JWT |
| 403 | FORBIDDEN | Valid JWT, insufficient permissions |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate resource |
| 422 | UNPROCESSABLE | Valid format, invalid semantics |
| 429 | RATE_LIMITED | Quota exceeded |
| 500 | INTERNAL_ERROR | Server error |
| 503 | AI_UNAVAILABLE | All AI providers failed |

---

## Rate Limits

| Plan | Limit | Window |
|------|-------|--------|
| Free | 60 req | 1 min |
| Pro | 300 req | 1 min |
| Enterprise | 1000 req | 1 min |
| AI endpoints | 10 req | 1 min (Free), 60 (Pro) |

Headers on every response:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 247
X-RateLimit-Reset: 1715900460
```

---

## Endpoints

### Auth / User

```
GET    /api/v1/me                        → Current user profile
PATCH  /api/v1/me                        → Update profile
DELETE /api/v1/me                        → Delete account (GDPR)
GET    /api/v1/me/usage                  → Token/quota usage
POST   /api/v1/me/export                 → Export all data (GDPR)
```

### Resumes

```
GET    /api/v1/resumes                   → List user's resumes
POST   /api/v1/resumes/upload            → Upload PDF/DOCX (multipart)
GET    /api/v1/resumes/:id               → Get resume details
DELETE /api/v1/resumes/:id               → Soft delete
PATCH  /api/v1/resumes/:id               → Update metadata

POST   /api/v1/resumes/:id/score         → (AI) Run ATS scoring
POST   /api/v1/resumes/:id/optimize      → (AI) Optimize resume
POST   /api/v1/resumes/:id/tailor        → (AI) Tailor to job { jobId }
GET    /api/v1/resumes/:id/export        → Export as PDF/DOCX { format }
```

### Cover Letters

```
GET    /api/v1/cover-letters             → List cover letters
POST   /api/v1/cover-letters             → (AI) Generate { jobId, tone, resumeId }
GET    /api/v1/cover-letters/:id         → Get cover letter
PATCH  /api/v1/cover-letters/:id         → Update content
DELETE /api/v1/cover-letters/:id         → Delete
GET    /api/v1/cover-letters/:id/export  → Export as PDF/DOCX
```

### Jobs

```
GET    /api/v1/jobs                      → Search/browse jobs
GET    /api/v1/jobs/:id                  → Get job details
POST   /api/v1/jobs/refresh              → Trigger job refresh (rate-limited)

GET    /api/v1/jobs/recommendations      → AI-powered job recommendations
GET    /api/v1/jobs/match/:resumeId      → Match score for resume vs jobs

GET    /api/v1/saved-jobs                → List saved jobs
POST   /api/v1/saved-jobs                → Save a job { jobId }
DELETE /api/v1/saved-jobs/:jobId         → Unsave job
PATCH  /api/v1/saved-jobs/:jobId         → Update tags/notes

GET    /api/v1/job-searches              → List saved searches
POST   /api/v1/job-searches              → Create saved search
PATCH  /api/v1/job-searches/:id          → Update search
DELETE /api/v1/job-searches/:id          → Delete search
```

### Applications

```
GET    /api/v1/applications              → List applications (filterable)
POST   /api/v1/applications              → Create manual application
GET    /api/v1/applications/:id          → Get application details
PATCH  /api/v1/applications/:id          → Update status/notes
DELETE /api/v1/applications/:id          → Delete

GET    /api/v1/applications/stats        → Aggregated stats (funnel, response rates)

POST   /api/v1/applications/automate     → Start automation session
GET    /api/v1/applications/sessions/:id → Poll automation status
POST   /api/v1/applications/sessions/:id/approve → Approve final submission
POST   /api/v1/applications/sessions/:id/cancel  → Cancel session
```

### Interviews

```
GET    /api/v1/interviews                → List interviews
POST   /api/v1/interviews                → Create interview session
GET    /api/v1/interviews/:id            → Get interview details
DELETE /api/v1/interviews/:id            → Delete

POST   /api/v1/interviews/:id/start      → Start session
POST   /api/v1/interviews/:id/answer     → Submit answer to question
POST   /api/v1/interviews/:id/complete   → Complete session + trigger analysis
GET    /api/v1/interviews/:id/feedback   → Get AI feedback report

POST   /api/v1/interviews/voice/token    → Get Vapi call token
```

### Skills

```
GET    /api/v1/skills/profile            → Get skill profile
PATCH  /api/v1/skills/profile            → Update skill profile
POST   /api/v1/skills/analyze            → (AI) Analyze gaps vs target jobs
GET    /api/v1/skills/recommendations    → Learning path recommendations
```

### Analytics

```
GET    /api/v1/analytics/dashboard       → Dashboard metrics
GET    /api/v1/analytics/applications    → Application funnel data
GET    /api/v1/analytics/resumes         → Resume performance
GET    /api/v1/analytics/ai-usage        → AI token consumption
```

### Notifications

```
GET    /api/v1/notifications             → List notifications (paginated)
POST   /api/v1/notifications/read        → Mark read { ids: string[] }
DELETE /api/v1/notifications/:id         → Delete notification
```

### Billing

```
GET    /api/v1/billing/subscription      → Current subscription
POST   /api/v1/billing/checkout          → Create Stripe checkout session
POST   /api/v1/billing/portal            → Create Stripe portal session
GET    /api/v1/billing/invoices          → Invoice history

POST   /api/v1/webhooks/stripe           → Stripe webhook (no auth)
POST   /api/v1/webhooks/clerk            → Clerk user webhook (HMAC-signed)
```

### Admin (role: ADMIN | SUPER_ADMIN)

```
GET    /api/v1/admin/users               → List users (paginated)
GET    /api/v1/admin/users/:id           → User details
PATCH  /api/v1/admin/users/:id/plan      → Override user plan
DELETE /api/v1/admin/users/:id           → Force delete user

GET    /api/v1/admin/analytics           → Platform-wide analytics
GET    /api/v1/admin/ai-usage            → Total AI cost breakdown
GET    /api/v1/admin/jobs                → Job scraping status
POST   /api/v1/admin/jobs/scrape         → Trigger manual scrape

GET    /api/v1/admin/browser-sessions    → Active automation sessions
GET    /api/v1/admin/system/health       → System health check
GET    /api/v1/admin/system/logs         → Recent error logs
```

---

## AI Endpoint Contracts

### POST /api/v1/resumes/:id/tailor

**Request**:
```json
{
  "jobId": "uuid",
  "targetKeywords": ["optional", "keywords"],
  "tone": "professional | aggressive | conservative"
}
```

**Response**:
```json
{
  "data": {
    "tailoredResumeId": "uuid",
    "matchScoreBefore": 62,
    "matchScoreAfter": 87,
    "changes": [
      { "section": "summary", "type": "rewrite" },
      { "section": "experience[0].bullets", "type": "optimize" }
    ],
    "addedKeywords": ["Kubernetes", "CI/CD"],
    "generationId": "uuid"
  }
}
```

### POST /api/v1/applications/automate

**Request**:
```json
{
  "jobId": "uuid",
  "resumeId": "uuid",
  "coverLetterId": "uuid"
}
```

**Response** (immediate):
```json
{
  "data": {
    "sessionId": "uuid",
    "status": "PENDING",
    "estimatedDuration": 120
  }
}
```

Poll `GET /api/v1/applications/sessions/:id` until `status === "AWAITING_APPROVAL"`,  
then approve via `POST /api/v1/applications/sessions/:id/approve`.

---

## Pagination

All list endpoints support cursor-based pagination:

```
GET /api/v1/jobs?cursor=<cursor>&limit=20

Response meta:
{
  "pagination": {
    "limit": 20,
    "hasMore": true,
    "nextCursor": "base64encodedcursor",
    "total": 1847
  }
}
```

---

## Idempotency

Mutation endpoints accept `Idempotency-Key` header:
```
Idempotency-Key: <uuid>
```
If same key is sent within 24h, returns cached response without re-processing.
