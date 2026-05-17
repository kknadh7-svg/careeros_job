# AGENTS.md — AI Agent Architecture

**Framework**: LangGraph (Python) + PydanticAI  
**Monitoring**: LangSmith  
**Deployment**: Fly.io (Python service) + Supabase Edge Functions (Deno)

---

## Agent Inventory

| Agent | Framework | Trigger | Purpose |
|-------|-----------|---------|---------|
| ResumeParserAgent | PydanticAI | Queue: resume:parse | Extract structured data from PDF/DOCX |
| ATSScorerAgent | LangGraph | Queue: resume:score | Score resume against ATS criteria |
| ResumeOptimizeAgent | LangGraph | API request | Rewrite/optimize resume content |
| ResumeTailorAgent | LangGraph | API request | Tailor resume for specific job |
| CoverLetterAgent | PydanticAI | API request | Generate personalized cover letter |
| JobMatchAgent | Supabase Edge | Queue: jobs:match | Semantic matching resume↔jobs |
| SkillGapAgent | LangGraph | API request | Analyze skill gaps + learning paths |
| InterviewCoachAgent | LangGraph | WebSocket | Real-time interview Q&A + feedback |
| ApplicationFormAgent | Stagehand | Queue: application:automate | Browser-based form filling |
| DailyJobAgent | LangGraph | Cron: 6am UTC | Daily job discovery + tailoring queue |
| NotificationAgent | n8n | Event-driven | Email/push notifications |

---

## Agent Definitions

### 1. ResumeParserAgent (PydanticAI)

**Purpose**: Extract structured resume data from raw PDF/DOCX text.

```python
# apps/agents/careeros_agents/resume/parser_agent.py

from pydantic import BaseModel, Field
from pydantic_ai import Agent
from typing import Optional
import anthropic

class ContactInfo(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None

class WorkExperience(BaseModel):
    company: str
    title: str
    start_date: str
    end_date: Optional[str] = None  # None = current
    location: Optional[str] = None
    bullets: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)

class Education(BaseModel):
    institution: str
    degree: str
    field: Optional[str] = None
    graduation_date: Optional[str] = None
    gpa: Optional[float] = None
    honors: list[str] = Field(default_factory=list)

class ParsedResume(BaseModel):
    contact: ContactInfo
    summary: Optional[str] = None
    experience: list[WorkExperience] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    projects: list[dict] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    total_years_experience: Optional[float] = None
    seniority_level: Optional[str] = None  # junior/mid/senior/lead/executive

resume_parser_agent = Agent(
    model="claude-claude-sonnet-4-6-20251001",
    result_type=ParsedResume,
    system_prompt="""You are an expert resume parser. Extract all information 
    accurately from the resume text. Infer total years of experience from dates.
    Normalize dates to YYYY-MM format. Extract ALL technologies mentioned in bullets.
    For seniority: <2yr=junior, 2-5yr=mid, 5-10yr=senior, 10yr+=lead/executive.""",
)
```

---

### 2. ATSScorerAgent (LangGraph)

**Purpose**: Score resume against ATS criteria, return actionable feedback.

```python
# apps/agents/careeros_agents/resume/ats_scorer_agent.py

from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

class ATSState(TypedDict):
    resume_text: str
    job_description: str | None
    parsed_resume: dict
    keyword_analysis: dict | None
    format_score: int | None
    content_score: int | None
    keyword_score: int | None
    overall_score: int | None
    recommendations: list[str]
    breakdown: dict

def analyze_format(state: ATSState) -> ATSState:
    """Check formatting: single column, standard fonts, no tables/graphics."""
    ...

def analyze_keywords(state: ATSState) -> ATSState:
    """Extract and score keywords vs job description or industry standards."""
    ...

def analyze_content(state: ATSState) -> ATSState:
    """Check: quantified achievements, action verbs, bullet quality."""
    ...

def calculate_overall(state: ATSState) -> ATSState:
    """Weighted average: keywords 40%, content 35%, format 25%."""
    ...

def generate_recommendations(state: ATSState) -> ATSState:
    """Generate prioritized improvement list."""
    ...

# Build graph
ats_graph = StateGraph(ATSState)
ats_graph.add_node("format", analyze_format)
ats_graph.add_node("keywords", analyze_keywords)
ats_graph.add_node("content", analyze_content)
ats_graph.add_node("calculate", calculate_overall)
ats_graph.add_node("recommend", generate_recommendations)

ats_graph.set_entry_point("format")
ats_graph.add_edge("format", "keywords")
ats_graph.add_edge("keywords", "content")
ats_graph.add_edge("content", "calculate")
ats_graph.add_edge("calculate", "recommend")
ats_graph.add_edge("recommend", END)

ats_scorer = ats_graph.compile()
```

---

### 3. ResumeTailorAgent (LangGraph — Multi-step)

**Purpose**: Tailor resume for a specific job posting using RAG.

**Graph Flow**:
```
fetch_job → fetch_resume → semantic_gap_analysis → 
  ↓
rewrite_summary → optimize_bullets → inject_keywords → 
  ↓
validate_ats_score → [score < threshold → revise] → finalize
```

**Key behaviors**:
- RAG: retrieves similar successful bullet points from internal dataset
- Structured output: returns diff of changes, not full document replacement
- Validation loop: if ATS score didn't improve by ≥10 points, revise once more
- Max iterations: 3 (prevents infinite loops)

---

### 4. DailyJobAgent (LangGraph — Autonomous)

**Purpose**: Every morning, discover new matching jobs for each active user and queue tailored resumes.

```
Graph Nodes:
  load_users           → Fetch all users with active job searches
  fan_out_searches     → Parallel: one subgraph per user
    ┣━ scrape_sources  → Run enabled job sources
    ┣━ embed_new_jobs  → Vectorize new job descriptions
    ┣━ match_jobs      → Cosine similarity vs user resume embeddings
    ┣━ rank_jobs       → Rerank top matches with GPT-4o
    ┣━ filter_seen     → Remove already-seen or applied jobs
    ┣━ queue_tailoring → Push top 5 to resume:tailor queue
    ┗━ notify_user     → Create notification + queue email
  aggregate_results    → Log stats, update last_run_at
```

**Schedule**: 6:00 AM UTC daily via Fly.io Cron

---

### 5. InterviewCoachAgent (LangGraph — Conversational)

**Purpose**: Conduct mock interviews with follow-up questions and real-time scoring.

**State Machine**:
```
INTRO → QUESTION_1 → FOLLOW_UP? → ... → QUESTION_N → SCORING → FEEDBACK → END
```

**Memory**:
- Short-term: full conversation history in state (trimmed to last 10 exchanges)
- Long-term: user's weak areas stored in DB, injected into system prompt next session

**Scoring Dimensions**:
- Technical accuracy (if technical round)
- Communication clarity
- STAR method usage (behavioral)
- Keyword density (ATS-relevant)
- Confidence markers

---

### 6. ApplicationFormAgent (Stagehand)

**Purpose**: AI-guided browser automation for job applications.

```typescript
// apps/web/lib/agents/application-form-agent.ts

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

const FormField = z.object({
  selector: z.string(),
  label: z.string(),
  type: z.enum(["text", "select", "radio", "checkbox", "file", "textarea"]),
  value: z.string().optional(),
  required: z.boolean(),
});

export class ApplicationFormAgent {
  private stagehand: Stagehand;
  private sessionId: string;
  private logs: ApplicationLog[] = [];

  async navigateToApplication(url: string): Promise<void> { ... }
  
  async analyzeForm(): Promise<FormField[]> {
    // Stagehand AI vision to detect all form fields
    const fields = await this.stagehand.extract({
      instruction: "Extract all form fields with their labels, types, and selectors",
      schema: z.array(FormField),
    });
    return fields;
  }

  async fillForm(fields: FormField[], resumeData: ParsedResume): Promise<void> {
    for (const field of fields) {
      await this.fillField(field, resumeData);
      await this.randomDelay(500, 1500); // anti-detection
    }
  }

  async capturePreviewScreenshot(): Promise<string> { ... }
  
  async submitForm(): Promise<SubmitResult> { ... }
  
  // NEVER call without user approval
  async awaitUserApproval(): Promise<"approved" | "cancelled"> { ... }
}
```

---

## Agent Communication Protocol

### TypeScript → Python Bridge

Agent jobs are dispatched via BullMQ (Redis) queue:

```typescript
// TypeScript side: dispatch job to Python agent
await resumeQueue.add('parse', {
  resumeId: resume.id,
  fileUrl: resume.fileUrl,
  userId: user.id,
  priority: 1,
});

// Python side: consume from BullMQ-compatible Redis queue
import asyncio
from bullmq import Worker

async def process_resume_parse(job):
    data = job.data
    result = await resume_parser_agent.run(
        user_prompt=f"Parse this resume text: {data['text']}"
    )
    # Update DB
    await db.resumes.update(data['resumeId'], {
        'parsed_data': result.data.model_dump(),
        'status': 'READY'
    })

worker = Worker('resume:parse', process_resume_parse)
```

### Structured Output Validation

Every AI output is validated with Zod (TS) or Pydantic (Python):

```typescript
const resumeOptimizationSchema = z.object({
  summary: z.string().max(500),
  experience: z.array(z.object({
    index: z.number(),
    originalBullets: z.array(z.string()),
    optimizedBullets: z.array(z.string()),
    reasoning: z.string(),
  })),
  addedKeywords: z.array(z.string()),
  removedContent: z.array(z.string()),
  estimatedAtsImprovement: z.number().min(0).max(100),
});
```

---

## Error Handling & Retry Policy

```python
# All LangGraph nodes use this retry decorator
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import openai, anthropic

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    retry=retry_if_exception_type((openai.RateLimitError, anthropic.RateLimitError)),
)
async def call_ai_with_fallback(prompt: str, model_cascade: list[str]) -> str:
    for model in model_cascade:
        try:
            return await call_model(model, prompt)
        except Exception as e:
            logger.warning(f"Model {model} failed: {e}, trying next")
    raise AIUnavailableError("All models failed")
```

---

## LangSmith Tracing

```python
from langsmith import traceable

@traceable(name="resume-tailor", tags=["resume", "ai"])
async def tailor_resume(resume_text: str, job_description: str, user_id: str):
    # All LLM calls within this function are traced
    ...
```
