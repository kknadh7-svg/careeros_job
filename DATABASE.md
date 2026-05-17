# DATABASE.md — Database Schema & Strategy

**Last Updated**: 2026-05-17  
**Engine**: PostgreSQL 16 via Supabase  
**ORM**: Prisma 5.x  
**Extensions**: pgvector, uuid-ossp, pg_trgm, unaccent

---

## Schema Design Principles

1. **UUIDs** for all primary keys (no sequential IDs in URLs)
2. **soft deletes** via `deleted_at` timestamp (never hard delete user data)
3. **audit columns** (`created_at`, `updated_at`) on every table
4. **RLS policies** on all user-owned tables
5. **Foreign keys** with appropriate `ON DELETE` behaviors
6. **Indexes** planned before queries, not after complaints

---

## Prisma Schema

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "fullTextSearch"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [pgvector(map: "vector"), uuidOssp(map: "uuid-ossp"), pgTrgm(map: "pg_trgm")]
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

model User {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clerkId        String    @unique @map("clerk_id")
  email          String    @unique
  firstName      String?   @map("first_name")
  lastName       String?   @map("last_name")
  avatarUrl      String?   @map("avatar_url")
  role           UserRole  @default(USER)
  plan           PlanTier  @default(FREE)
  planExpiresAt  DateTime? @map("plan_expires_at")
  stripeCustomerId String? @unique @map("stripe_customer_id")
  stripeSubscriptionId String? @unique @map("stripe_subscription_id")
  onboardingComplete Boolean @default(false) @map("onboarding_complete")
  tokenUsageMonth Int      @default(0) @map("token_usage_month")
  tokenResetAt   DateTime  @default(now()) @map("token_reset_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  resumes        Resume[]
  applications   Application[]
  interviews     Interview[]
  savedJobs      SavedJob[]
  notifications  Notification[]
  subscriptions  Subscription[]
  aiGenerations  AiGeneration[]
  browserSessions BrowserSession[]
  jobSearches    JobSearch[]
  skillProfile   SkillProfile?
  analyticsEvents AnalyticsEvent[]

  @@map("users")
  @@index([clerkId])
  @@index([email])
  @@index([stripeCustomerId])
}

enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}

enum PlanTier {
  FREE
  PRO
  ENTERPRISE
}

// ─────────────────────────────────────────────
// RESUMES
// ─────────────────────────────────────────────

model Resume {
  id              String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String        @map("user_id") @db.Uuid
  title           String
  originalFileName String?      @map("original_file_name")
  fileUrl         String?       @map("file_url")
  fileType        ResumeFileType @map("file_type")
  rawText         String?       @map("raw_text") @db.Text
  parsedData      Json?         @map("parsed_data")
  atsScore        Int?          @map("ats_score")
  atsBreakdown    Json?         @map("ats_breakdown")
  optimizedContent Json?        @map("optimized_content")
  isBase          Boolean       @default(false) @map("is_base")
  isTailored      Boolean       @default(false) @map("is_tailored")
  tailoredForJobId String?      @map("tailored_for_job_id") @db.Uuid
  parentResumeId  String?       @map("parent_resume_id") @db.Uuid
  version         Int           @default(1)
  status          ResumeStatus  @default(PROCESSING)
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  deletedAt       DateTime?     @map("deleted_at")

  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  tailoredForJob  Job?          @relation("TailoredFor", fields: [tailoredForJobId], references: [id])
  parentResume    Resume?       @relation("ResumeVersions", fields: [parentResumeId], references: [id])
  childResumes    Resume[]      @relation("ResumeVersions")
  applications    Application[]
  embeddings      ResumeEmbedding[]

  @@map("resumes")
  @@index([userId])
  @@index([userId, isBase])
  @@index([tailoredForJobId])
}

enum ResumeFileType {
  PDF
  DOCX
  TXT
}

enum ResumeStatus {
  PROCESSING
  READY
  FAILED
  ARCHIVED
}

model ResumeEmbedding {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  resumeId   String   @map("resume_id") @db.Uuid
  chunkIndex Int      @map("chunk_index")
  chunkText  String   @map("chunk_text") @db.Text
  embedding  Unsupported("vector(3072)")?
  metadata   Json?
  createdAt  DateTime @default(now()) @map("created_at")

  resume     Resume   @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  @@map("resume_embeddings")
  @@index([resumeId])
}

// ─────────────────────────────────────────────
// SKILLS
// ─────────────────────────────────────────────

model SkillProfile {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String   @unique @map("user_id") @db.Uuid
  skills          Json     // { skill: string, level: 'beginner'|'intermediate'|'expert', years: number }[]
  targetRoles     String[] @map("target_roles")
  industries      String[]
  experienceYears Int?     @map("experience_years")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("skill_profiles")
}

// ─────────────────────────────────────────────
// JOBS
// ─────────────────────────────────────────────

model Job {
  id              String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  externalId      String?     @map("external_id")
  source          JobSource
  title           String
  company         String
  companyLogo     String?     @map("company_logo")
  location        String?
  locationType    LocationType? @default(HYBRID) @map("location_type")
  salary          Json?       // { min, max, currency, period }
  description     String      @db.Text
  requirements    String?     @db.Text
  skills          String[]
  seniority       String?
  jobType         JobType?    @default(FULL_TIME) @map("job_type")
  applyUrl        String      @map("apply_url")
  isActive        Boolean     @default(true) @map("is_active")
  postedAt        DateTime?   @map("posted_at")
  expiresAt       DateTime?   @map("expires_at")
  scrapedAt       DateTime    @default(now()) @map("scraped_at")
  createdAt       DateTime    @default(now()) @map("created_at")

  savedBy         SavedJob[]
  applications    Application[]
  tailoredResumes Resume[]    @relation("TailoredFor")
  embeddings      JobEmbedding[]

  @@unique([externalId, source])
  @@map("jobs")
  @@index([source])
  @@index([isActive, postedAt(sort: Desc)])
  @@index([skills], type: Gin)
}

model JobEmbedding {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  jobId     String   @map("job_id") @db.Uuid
  embedding Unsupported("vector(1536)")?
  createdAt DateTime @default(now()) @map("created_at")

  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@map("job_embeddings")
  @@index([jobId])
}

enum JobSource {
  LINKEDIN
  INDEED
  GREENHOUSE
  LEVER
  ADZUNA
  WORKDAY
  ICIMS
  SMARTRECRUITERS
  MANUAL
}

enum LocationType {
  REMOTE
  HYBRID
  ONSITE
}

enum JobType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERNSHIP
  FREELANCE
}

model SavedJob {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  jobId     String   @map("job_id") @db.Uuid
  tags      String[]
  notes     String?  @db.Text
  matchScore Float?  @map("match_score")
  savedAt   DateTime @default(now()) @map("saved_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([userId, jobId])
  @@map("saved_jobs")
  @@index([userId])
}

// ─────────────────────────────────────────────
// APPLICATIONS
// ─────────────────────────────────────────────

model Application {
  id              String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String            @map("user_id") @db.Uuid
  jobId           String            @map("job_id") @db.Uuid
  resumeId        String?           @map("resume_id") @db.Uuid
  coverLetterId   String?           @map("cover_letter_id") @db.Uuid
  status          ApplicationStatus @default(DRAFT)
  appliedAt       DateTime?         @map("applied_at")
  responseAt      DateTime?         @map("response_at")
  interviewAt     DateTime?         @map("interview_at")
  offerAt         DateTime?         @map("offer_at")
  rejectedAt      DateTime?         @map("rejected_at")
  notes           String?           @db.Text
  automationUsed  Boolean           @default(false) @map("automation_used")
  automationSessionId String?       @map("automation_session_id") @db.Uuid
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  job             Job               @relation(fields: [jobId], references: [id])
  resume          Resume?           @relation(fields: [resumeId], references: [id])
  coverLetter     CoverLetter?      @relation(fields: [coverLetterId], references: [id])
  browserSession  BrowserSession?   @relation(fields: [automationSessionId], references: [id])
  interviews      Interview[]
  statusHistory   ApplicationStatusHistory[]

  @@map("applications")
  @@index([userId])
  @@index([userId, status])
  @@index([jobId])
}

enum ApplicationStatus {
  DRAFT
  APPLIED
  SCREENING
  INTERVIEW
  TECHNICAL
  OFFER
  ACCEPTED
  REJECTED
  WITHDRAWN
}

model ApplicationStatusHistory {
  id            String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  applicationId String            @map("application_id") @db.Uuid
  status        ApplicationStatus
  changedAt     DateTime          @default(now()) @map("changed_at")
  note          String?

  application   Application       @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@map("application_status_history")
  @@index([applicationId])
}

// ─────────────────────────────────────────────
// COVER LETTERS
// ─────────────────────────────────────────────

model CoverLetter {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  jobId       String?  @map("job_id") @db.Uuid
  title       String
  content     String   @db.Text
  tone        String   @default("professional")
  wordCount   Int?     @map("word_count")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  applications Application[]

  @@map("cover_letters")
  @@index([userId])
}

// ─────────────────────────────────────────────
// INTERVIEWS
// ─────────────────────────────────────────────

model Interview {
  id             String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String          @map("user_id") @db.Uuid
  applicationId  String?         @map("application_id") @db.Uuid
  type           InterviewType
  mode           InterviewMode   @default(TEXT)
  status         InterviewStatus @default(PENDING)
  scheduledAt    DateTime?       @map("scheduled_at")
  startedAt      DateTime?       @map("started_at")
  completedAt    DateTime?       @map("completed_at")
  duration       Int?            // seconds
  overallScore   Int?            @map("overall_score")
  feedback       Json?           // structured feedback object
  improvements   String[]
  transcript     Json?           // array of { role, content, timestamp }
  recordingUrl   String?         @map("recording_url")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  application    Application?    @relation(fields: [applicationId], references: [id])
  questions      InterviewQuestion[]

  @@map("interviews")
  @@index([userId])
  @@index([userId, status])
}

model InterviewQuestion {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interviewId String   @map("interview_id") @db.Uuid
  question    String   @db.Text
  category    String?
  difficulty  String?
  userAnswer  String?  @map("user_answer") @db.Text
  aiScore     Int?     @map("ai_score")
  aiFeedback  String?  @map("ai_feedback") @db.Text
  keywords    String[]
  orderIndex  Int      @map("order_index")
  createdAt   DateTime @default(now()) @map("created_at")

  interview   Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)

  @@map("interview_questions")
  @@index([interviewId])
}

enum InterviewType {
  HR
  TECHNICAL
  BEHAVIORAL
  CASE_STUDY
  SYSTEM_DESIGN
}

enum InterviewMode {
  TEXT
  VOICE
  VIDEO
}

enum InterviewStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

// ─────────────────────────────────────────────
// AI GENERATIONS (Usage Tracking)
// ─────────────────────────────────────────────

model AiGeneration {
  id            String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId        String       @map("user_id") @db.Uuid
  feature       AiFeature
  model         String
  promptTokens  Int          @map("prompt_tokens")
  completionTokens Int       @map("completion_tokens")
  totalTokens   Int          @map("total_tokens")
  costUsd       Float?       @map("cost_usd")
  latencyMs     Int?         @map("latency_ms")
  success       Boolean      @default(true)
  errorMessage  String?      @map("error_message")
  metadata      Json?
  createdAt     DateTime     @default(now()) @map("created_at")

  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("ai_generations")
  @@index([userId])
  @@index([userId, feature])
  @@index([createdAt])
}

enum AiFeature {
  RESUME_PARSE
  RESUME_SCORE
  RESUME_OPTIMIZE
  RESUME_TAILOR
  COVER_LETTER
  JOB_MATCH
  SKILL_GAP
  INTERVIEW_QUESTION
  INTERVIEW_FEEDBACK
  JOB_RECOMMENDATION
  FORM_AUTOFILL
}

// ─────────────────────────────────────────────
// BROWSER SESSIONS
// ─────────────────────────────────────────────

model BrowserSession {
  id              String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String          @map("user_id") @db.Uuid
  browserbaseId   String?         @unique @map("browserbase_id")
  targetUrl       String          @map("target_url")
  status          SessionStatus   @default(PENDING)
  logs            Json?           // structured automation log
  screenshotUrls  String[]        @map("screenshot_urls")
  errorMessage    String?         @map("error_message")
  retryCount      Int             @default(0) @map("retry_count")
  startedAt       DateTime?       @map("started_at")
  completedAt     DateTime?       @map("completed_at")
  createdAt       DateTime        @default(now()) @map("created_at")

  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  applications    Application[]

  @@map("browser_sessions")
  @@index([userId])
}

enum SessionStatus {
  PENDING
  RUNNING
  AWAITING_APPROVAL
  APPROVED
  SUBMITTED
  FAILED
  CANCELLED
}

// ─────────────────────────────────────────────
// JOB SEARCHES (Saved Searches)
// ─────────────────────────────────────────────

model JobSearch {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  name        String
  query       String?
  location    String?
  jobType     JobType?
  remoteOnly  Boolean  @default(false) @map("remote_only")
  salaryMin   Int?     @map("salary_min")
  seniority   String[]
  skills      String[]
  sources     JobSource[]
  isActive    Boolean  @default(true) @map("is_active")
  lastRunAt   DateTime? @map("last_run_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("job_searches")
  @@index([userId, isActive])
}

// ─────────────────────────────────────────────
// SUBSCRIPTIONS
// ─────────────────────────────────────────────

model Subscription {
  id                  String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId              String             @map("user_id") @db.Uuid
  stripeSubscriptionId String           @unique @map("stripe_subscription_id")
  stripePriceId       String            @map("stripe_price_id")
  status              SubscriptionStatus
  plan                PlanTier
  currentPeriodStart  DateTime          @map("current_period_start")
  currentPeriodEnd    DateTime          @map("current_period_end")
  cancelAtPeriodEnd   Boolean           @default(false) @map("cancel_at_period_end")
  createdAt           DateTime          @default(now()) @map("created_at")
  updatedAt           DateTime          @updatedAt @map("updated_at")

  user                User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
  @@index([userId])
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
  PAUSED
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

model Notification {
  id        String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String
  body      String
  data      Json?
  readAt    DateTime?        @map("read_at")
  createdAt DateTime         @default(now()) @map("created_at")

  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
  @@index([userId, readAt])
  @@index([userId, createdAt(sort: Desc)])
}

enum NotificationType {
  JOB_MATCH
  APPLICATION_UPDATE
  INTERVIEW_REMINDER
  RESUME_READY
  DAILY_DIGEST
  SYSTEM
  BILLING
}

// ─────────────────────────────────────────────
// ANALYTICS EVENTS
// ─────────────────────────────────────────────

model AnalyticsEvent {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId     String?  @map("user_id") @db.Uuid
  event      String
  properties Json?
  sessionId  String?  @map("session_id")
  ipHash     String?  @map("ip_hash")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")

  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("analytics_events")
  @@index([userId])
  @@index([event, createdAt])
  @@index([createdAt])
}
```

---

## Indexing Strategy

### Critical Query Patterns → Indexes

```sql
-- User's jobs feed (most common query)
CREATE INDEX CONCURRENTLY idx_jobs_active_posted 
  ON jobs(is_active, posted_at DESC) WHERE is_active = true;

-- Semantic search on jobs
CREATE INDEX CONCURRENTLY idx_job_embeddings_vector 
  ON job_embeddings USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

-- Semantic search on resumes  
CREATE INDEX CONCURRENTLY idx_resume_embeddings_vector 
  ON resume_embeddings USING ivfflat(embedding vector_cosine_ops) WITH (lists = 50);

-- Full-text search on jobs
CREATE INDEX CONCURRENTLY idx_jobs_fts 
  ON jobs USING gin(to_tsvector('english', title || ' ' || description));

-- Applications by user + status
CREATE INDEX CONCURRENTLY idx_applications_user_status 
  ON applications(user_id, status, created_at DESC);

-- Token usage aggregation
CREATE INDEX CONCURRENTLY idx_ai_generations_user_month 
  ON ai_generations(user_id, created_at) WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## RLS Policies

```sql
-- Example RLS for resumes table
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own resumes"
  ON resumes FOR SELECT
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can insert their own resumes"
  ON resumes FOR INSERT
  WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "Users can update their own resumes"
  ON resumes FOR UPDATE
  USING (user_id = auth.uid()::uuid);

-- Jobs are publicly readable (no RLS needed — use anon key)
-- SavedJobs are user-scoped
-- Applications are user-scoped
```

---

## Migrations Strategy

- Migrations in `supabase/migrations/` (timestamped SQL files)
- Prisma migrations in `packages/database/prisma/migrations/`
- Never modify existing migrations — always add new ones
- Blue-green migration pattern for zero-downtime schema changes
- All `ALTER TABLE ADD COLUMN` use `DEFAULT` values for backwards compatibility
