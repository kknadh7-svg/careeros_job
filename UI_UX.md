# UI_UX.md — Design System & UX Standards

**Stack**: Next.js 15, Tailwind CSS, shadcn/ui, Framer Motion, Magic UI  
**Design Philosophy**: Apple-level minimalism meets AI-first power tools

---

## Design Principles

1. **Clarity over cleverness** — every UI element has one obvious purpose
2. **Progressive disclosure** — show simple first, reveal power on interaction
3. **AI feels magical, not mechanical** — loading states, streaming text, smooth transitions
4. **Data-dense but not overwhelming** — dashboard shows what matters, hides noise
5. **Dark mode first** — premium feel, reduce eye strain for power users

---

## Color System

```typescript
// tailwind.config.ts — extend theme

const colors = {
  // Brand
  brand: {
    50:  "#f0f4ff",
    100: "#e0e9ff",
    500: "#6366f1",  // Indigo-500 (primary)
    600: "#4f46e5",  // Hover
    700: "#4338ca",
    900: "#1e1b4b",
  },
  // Semantic
  success: "#22c55e",
  warning: "#f59e0b",
  error:   "#ef4444",
  info:    "#3b82f6",
  // Neutral (dark mode base)
  surface: {
    DEFAULT: "#0f0f0f",  // Page background (dark)
    card:    "#141414",  // Card background
    overlay: "#1a1a1a",  // Modal, drawer
    border:  "#262626",  // Borders
    muted:   "#404040",  // Secondary text bg
  },
};
```

---

## Typography

```typescript
// Google Fonts: Inter (body) + Cal Sans (headings)
// Mono: JetBrains Mono (code, ATS scores, metrics)

const typography = {
  display:  "text-5xl font-bold tracking-tight",   // Hero headline
  h1:       "text-4xl font-bold tracking-tight",
  h2:       "text-3xl font-semibold tracking-tight",
  h3:       "text-2xl font-semibold",
  h4:       "text-xl font-medium",
  body:     "text-base leading-relaxed",
  small:    "text-sm text-muted-foreground",
  mono:     "font-mono text-sm",
  label:    "text-xs font-medium uppercase tracking-wider text-muted-foreground",
};
```

---

## Component Library

### Base Components (shadcn/ui — customized)
- Button, Badge, Card, Dialog, Drawer, DropdownMenu
- Form, Input, Select, Textarea, Checkbox, RadioGroup
- Tabs, Accordion, Collapsible
- Table, Pagination
- Toast, Alert, Progress
- Avatar, Skeleton, Separator
- Sheet, Popover, Tooltip

### Custom Components

#### ATSScoreRing
```tsx
// Visual circular progress showing ATS score (0-100)
// Color: red (<50), yellow (50-75), green (>75)
<ATSScoreRing score={82} size="lg" animated />
```

#### JobMatchBadge
```tsx
// Shows match % with color-coded background
<JobMatchBadge score={94} />  // Green: 80+, Yellow: 60-79, Gray: <60
```

#### AIStreamText
```tsx
// Streams AI-generated text with typewriter effect
<AIStreamText streamUrl="/api/v1/resumes/123/optimize" />
```

#### ResumeEditor
```tsx
// Rich text editor for resume editing
// Sections: Summary, Experience, Education, Skills, Projects
// AI button on each section for AI rewrite
<ResumeEditor resumeId="uuid" onSave={handleSave} />
```

#### JobCard
```tsx
// Job listing card with save, match score, quick apply
<JobCard
  job={job}
  matchScore={87}
  onSave={handleSave}
  onApply={handleApply}
/>
```

#### InterviewRoom
```tsx
// Full-screen interview interface
// Shows question, answer input/voice, timer, progress
<InterviewRoom interviewId="uuid" mode="voice" />
```

#### ApplicationKanban
```tsx
// Drag-and-drop Kanban for application tracking
// Columns: Applied → Screening → Interview → Offer → Accepted/Rejected
<ApplicationKanban applications={applications} />
```

#### SkillGapChart
```tsx
// Radar/bar chart showing skills vs target job requirements
<SkillGapChart userSkills={skills} targetJobSkills={jobSkills} />
```

---

## Page Layouts

### Landing Page Structure
```
<LandingLayout>
  <HeroSection />           // Headline + CTA + dashboard preview
  <SocialProof />           // Logos + user count + testimonials
  <FeaturesGrid />          // 6 key features with icons + descriptions
  <DemoSection />           // Interactive demo / video
  <AIShowcase />            // Resume before/after comparison
  <PricingSection />        // 3-tier pricing cards
  <FAQSection />            // Accordion FAQ
  <TestimonialsCarousel />  // Scrolling testimonials
  <CTASection />            // Final conversion section
  <Footer />
</LandingLayout>
```

### Dashboard Layout
```
<DashboardLayout>
  <Sidebar />               // Collapsible nav + user info + plan badge
  <TopBar />                // Search, notifications, profile
  <main>
    {children}              // Page content
  </main>
</DashboardLayout>
```

### Sidebar Navigation Items
```
Dashboard        /dashboard
Resumes          /resumes
  ├─ My Resumes
  ├─ Upload
  └─ Templates
Jobs             /jobs
  ├─ Browse
  ├─ Saved
  └─ Recommendations
Applications     /applications
  ├─ Tracker
  └─ Analytics
Interviews       /interviews
  ├─ Practice
  └─ History
Skills           /skills
Analytics        /analytics
Settings         /settings
  ├─ Profile
  ├─ Billing
  └─ Notifications
```

---

## Animation System (Framer Motion)

```typescript
// Shared animation variants
export const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};

export const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// AI content streaming animation
export const streamingText = {
  animate: { opacity: [0.5, 1] },
  transition: { duration: 0.5, repeat: Infinity, repeatType: "reverse" },
};
```

### Key Animation Moments
- Page transitions: fade + slide (100ms)
- Card hover: subtle lift + shadow (transform: translateY(-2px))
- ATS score reveal: animated ring fill (1.5s ease-out)
- AI generation: shimmer skeleton → streaming text → complete
- Kanban drag: Framer Motion drag constraints
- Number counters: spring animation for metrics
- Resume tailoring: diff highlight animation (added = green glow, removed = strikethrough)

---

## Responsive Breakpoints

```
Mobile:   375px - 639px  (sm)
Tablet:   640px - 1023px (md)
Desktop:  1024px - 1279px (lg)
Wide:     1280px+ (xl)
```

**Mobile-first rules**:
- Sidebar collapses to bottom nav on mobile
- Job cards stack vertically on mobile
- Resume editor is full-screen on mobile
- Interview room is full-screen on mobile

---

## Loading States

Every data-dependent section must have a skeleton:

```tsx
// Resume card skeleton
function ResumeCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-surface-border bg-surface-card p-6">
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
```

**Loading patterns by feature**:
- Job board: skeleton grid of 6 cards
- Dashboard metrics: skeleton numbers with labels
- AI generation: progress bar + "Analyzing your resume..." text
- Interview Q&A: spinner until first question streams in

---

## Key UX Flows

### Resume Upload (3 steps)
```
1. Drop zone → upload file
2. Parsing animation (3-5s) → "Extracting your career story..."
3. Results: parsed sections + ATS score reveal
```

### AI Job Match
```
1. User views job → "Check Match" button
2. Modal opens: loading ring + "Comparing your resume..."
3. Results: match %, missing keywords, matching strengths
4. CTA: "Tailor Resume for This Job"
```

### Auto-Apply Flow
```
1. User clicks "Auto Apply" → confirmation dialog
2. Browser session starts → live status indicator
3. Screenshot preview shown → "Review before submitting"
4. User approves → submitting animation
5. Success state → application logged in tracker
```

### Mock Interview Flow
```
1. Select interview type + target job
2. Briefing screen (what to expect)
3. Full-screen interview room → AI asks first question
4. User answers (text or voice)
5. After all questions → "Analyzing your performance..."
6. Detailed feedback report with scores + improvements
```

---

## Accessibility (WCAG 2.1 AA)

- Focus rings on all interactive elements
- ARIA labels on icon-only buttons
- Skip-to-content link
- Color contrast ≥ 4.5:1 for body text
- Keyboard navigation for all features
- Screen reader tested with VoiceOver + NVDA
- Reduced motion support (`prefers-reduced-motion`)
