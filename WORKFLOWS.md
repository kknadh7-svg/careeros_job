# WORKFLOWS.md — Automated Workflow Documentation

**Automation Engine**: n8n (self-hosted or cloud)  
**Agent Orchestration**: LangGraph  
**Queue**: BullMQ on Upstash Redis

---

## Workflow Inventory

| Workflow | Trigger | Frequency | Purpose |
|----------|---------|-----------|---------|
| Daily Job Discovery | Cron 6am UTC | Daily | Find + match new jobs per user |
| Job Scrape Pipeline | Cron 4x/day | Every 6h | Refresh job listings from all sources |
| Resume Processing | Queue event | Real-time | Parse → Embed → Score pipeline |
| Application Auto-Apply | User request | On-demand | Browser automation + approval flow |
| Interview Reminder | Scheduled | Per user | Remind about upcoming interviews |
| Weekly Digest | Cron Monday 8am | Weekly | AI-curated job digest email |
| Skill Gap Update | User activity | Weekly | Recalculate skill gaps after new jobs |
| Token Reset | Cron 1st of month | Monthly | Reset monthly AI token quotas |
| Subscription Sync | Stripe webhook | Real-time | Sync plan tier from Stripe |
| User Onboarding | Signup event | One-time | Welcome email + setup guidance |

---

## n8n Workflow: Daily Job Discovery

```json
{
  "name": "Daily Job Discovery Agent",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": { "interval": [{ "field": "cronExpression", "expression": "0 6 * * *" }] }
      }
    },
    {
      "name": "Fetch Active Users",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "SELECT id, email FROM users WHERE deleted_at IS NULL AND plan != 'FREE' OR (plan = 'FREE' AND created_at > NOW() - INTERVAL '7 days')"
      }
    },
    {
      "name": "Split By User",
      "type": "n8n-nodes-base.splitInBatches",
      "parameters": { "batchSize": 10 }
    },
    {
      "name": "Trigger LangGraph Agent",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $env.AGENTS_API_URL }}/v1/agents/daily-job-discovery",
        "method": "POST",
        "body": { "userId": "={{ $json.id }}" }
      }
    },
    {
      "name": "Log Results",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "INSERT INTO workflow_logs (workflow, user_id, result) VALUES ('daily-job-discovery', $1, $2)",
        "parameters": ["={{ $json.userId }}", "={{ JSON.stringify($json.result) }}"]
      }
    }
  ]
}
```

---

## n8n Workflow: Application Notification

```json
{
  "name": "Application Status Notification",
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "application-status-changed",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Get User Details",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "SELECT u.email, u.first_name, j.title, j.company FROM applications a JOIN users u ON a.user_id = u.id JOIN jobs j ON a.job_id = j.id WHERE a.id = $1",
        "parameters": ["={{ $json.applicationId }}"]
      }
    },
    {
      "name": "Switch on Status",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "dataType": "string",
        "value1": "={{ $json.newStatus }}",
        "rules": {
          "rules": [
            { "value2": "INTERVIEW", "output": 0 },
            { "value2": "OFFER", "output": 1 },
            { "value2": "REJECTED", "output": 2 }
          ]
        }
      }
    },
    {
      "name": "Send Interview Email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "to": "={{ $('Get User Details').item.json.email }}",
        "subject": "🎉 Interview Invitation: {{ $json.company }}",
        "html": "<h1>Congratulations!</h1><p>You've been invited to interview at {{ $json.company }} for {{ $json.title }}.</p>"
      }
    }
  ]
}
```

---

## Resume Processing Pipeline (BullMQ)

```typescript
// apps/web/lib/queue/workers/resume-worker.ts

import { Worker, Queue, QueueEvents } from "bullmq";
import { connection } from "@/lib/queue/connection";

// Queue chain: parse → embed → score → match
const parseQueue = new Queue("resume:parse", { connection });
const embedQueue = new Queue("resume:embed", { connection });
const scoreQueue = new Queue("resume:score", { connection });
const matchQueue = new Queue("jobs:match", { connection });

// Parse worker (calls Python agent)
new Worker(
  "resume:parse",
  async (job) => {
    const { resumeId, fileUrl, userId } = job.data;
    
    // Call Python parsing service
    const parsed = await fetch(`${process.env.AGENTS_URL}/parse`, {
      method: "POST",
      body: JSON.stringify({ fileUrl }),
    }).then((r) => r.json());

    // Update DB
    await db.resume.update({
      where: { id: resumeId },
      data: { parsedData: parsed, status: "PROCESSING" },
    });

    // Chain to embedding
    await embedQueue.add("embed", { resumeId, text: parsed.rawText, userId }, {
      delay: 2000,
    });
  },
  { connection, concurrency: 5 }
);

// Embed worker
new Worker(
  "resume:embed",
  async (job) => {
    const { resumeId, text } = job.data;
    const chunks = chunkText(text, 512, 50); // 512 tokens, 50 overlap
    
    const embeddings = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: chunks,
    });

    await db.resumeEmbedding.createMany({
      data: chunks.map((chunk, i) => ({
        resumeId,
        chunkIndex: i,
        chunkText: chunk,
        // embedding stored via raw SQL for pgvector
      })),
    });

    // Chain to scoring
    await scoreQueue.add("score", { resumeId }, { delay: 1000 });
  },
  { connection, concurrency: 10 }
);
```

---

## Application Automation Workflow

```typescript
// Full state machine for browser automation

type SessionState =
  | "INITIALIZING"
  | "NAVIGATING"
  | "ANALYZING_FORM"
  | "FILLING_FORM"
  | "UPLOADING_DOCUMENTS"
  | "AWAITING_APPROVAL"   // ← user must explicitly approve here
  | "SUBMITTING"
  | "COMPLETED"
  | "FAILED";

// Polling-based status check
// Client polls GET /api/v1/applications/sessions/:id every 3s
// Until status === "AWAITING_APPROVAL" → show preview to user
// User clicks "Submit" → POST /api/v1/applications/sessions/:id/approve
// Session transitions to "SUBMITTING" → "COMPLETED"
```

---

## Cron Endpoints (Vercel)

```typescript
// apps/web/app/api/v1/cron/daily-job-agent/route.ts
export const runtime = "edge";
export const maxDuration = 300; // 5 min

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Trigger n8n webhook
  await fetch(process.env.N8N_DAILY_JOB_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ triggeredAt: new Date().toISOString() }),
  });

  return Response.json({ ok: true });
}
```

---

## Event System

All significant events are published to Redis Pub/Sub for real-time updates:

```typescript
// Event types
type CareerOSEvent =
  | { type: "resume.parsed"; resumeId: string; userId: string }
  | { type: "resume.scored"; resumeId: string; score: number }
  | { type: "job.matched"; jobId: string; userId: string; score: number }
  | { type: "application.status_changed"; applicationId: string; status: string }
  | { type: "interview.completed"; interviewId: string; score: number }
  | { type: "session.awaiting_approval"; sessionId: string; screenshotUrl: string };

// Publisher
await redis.publish(`user:${userId}:events`, JSON.stringify(event));

// Subscriber (SSE endpoint for real-time dashboard updates)
// GET /api/v1/events → Server-Sent Events stream
```
