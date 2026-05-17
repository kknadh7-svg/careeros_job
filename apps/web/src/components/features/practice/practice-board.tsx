"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Plus, X, Wand2, ChevronDown, ChevronUp,
  Sparkles, Crown, ArrowRight, Loader2, Lock,
  Lightbulb, Target, MessageSquare, Code2, Users,
  RotateCcw, BookOpen, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "CONCEPTUAL" | "SCENARIO" | "BEHAVIORAL" | "CODING";
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Level = "JUNIOR" | "MID" | "SENIOR";

interface Question {
  question: string;
  type: QuestionType;
  skill: string;
  difficulty: Difficulty;
  keyPoints: string[];
  followUp: string;
  whyAsked: string;
}

interface PracticeBoardProps {
  plan: "FREE" | "PRO";
  dailyLimit: number;
  usedToday: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<QuestionType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  CONCEPTUAL: { label: "Conceptual",  icon: BookOpen,      color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  SCENARIO:   { label: "Scenario",    icon: Target,        color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  BEHAVIORAL: { label: "Behavioral",  icon: Users,         color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  CODING:     { label: "Coding",      icon: Code2,         color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
};

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  EASY:   "text-green-400 bg-green-500/10 border-green-500/20",
  MEDIUM: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  HARD:   "text-red-400 bg-red-500/10 border-red-500/20",
};

const POPULAR_SKILLS = [
  "Python","Java","JavaScript","React","Node.js","SQL","AWS","Azure",
  "Snowflake","Docker","Kubernetes","TypeScript","Spring Boot","MongoDB",
  "Machine Learning","System Design","Data Structures","GraphQL",
];

const LEVEL_OPTIONS: { value: Level; label: string; desc: string }[] = [
  { value: "JUNIOR",  label: "Junior",  desc: "0–2 years" },
  { value: "MID",     label: "Mid",     desc: "2–5 years" },
  { value: "SENIOR",  label: "Senior",  desc: "5+ years" },
];

// ─── Credit Bar ───────────────────────────────────────────────────────────────

function CreditBar({ plan, dailyLimit, usedToday, remaining }: { plan: string; dailyLimit: number; usedToday: number; remaining: number }) {
  const pct = Math.round((usedToday / dailyLimit) * 100);
  const isLow = remaining <= 1;

  return (
    <div className="flex items-center gap-4 p-3.5 rounded-xl bg-card border border-border/40">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Daily Credits — {plan === "PRO" ? "Pro Plan" : "Free Plan"}
          </span>
          <span className={cn("text-xs font-bold", isLow ? "text-red-400" : "text-foreground")}>
            {remaining} / {dailyLimit} left
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", pct >= 80 ? "bg-red-400" : pct >= 50 ? "bg-yellow-400" : "bg-brand-400")}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 opacity-70">Resets at midnight · {usedToday} used today</p>
      </div>
      {plan === "FREE" && (
        <a
          href="/pricing/upgrade"
          className="flex items-center gap-1.5 text-xs text-brand-400 font-medium hover:underline flex-shrink-0"
        >
          <Crown className="w-3 h-3" />
          Get 25/day
        </a>
      )}
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({ q, index }: { q: Question; index: number }) {
  const [open, setOpen] = useState(false);
  const cfg = TYPE_CONFIG[q.type] ?? TYPE_CONFIG.CONCEPTUAL;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-card border border-border/40 rounded-2xl overflow-hidden hover:border-border/70 transition-colors"
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5 flex items-start gap-4"
      >
        {/* Number */}
        <span className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>
              <Icon className="w-2.5 h-2.5" />
              {cfg.label}
            </span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", DIFFICULTY_COLOR[q.difficulty])}>
              {q.difficulty}
            </span>
            <span className="text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5 border border-border/40">
              {q.skill}
            </span>
          </div>

          {/* Question */}
          <p className="text-sm font-medium leading-relaxed text-foreground pr-2">{q.question}</p>
        </div>

        {/* Toggle */}
        <div className="flex-shrink-0 mt-1">
          {open
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expandable answer hints */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-border/40 pt-4">

              {/* Key points */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What to cover in your answer</span>
                </div>
                <ul className="space-y-1.5">
                  {q.keyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Why asked */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/30">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Why interviewers ask this: </span>
                  {q.whyAsked}
                </p>
              </div>

              {/* Follow-up */}
              {q.followUp && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-brand-500/5 border border-brand-500/20">
                  <ArrowRight className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-medium text-brand-400">Likely follow-up: </span>
                    {q.followUp}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function PracticeBoard({ plan, dailyLimit, usedToday: initialUsed }: PracticeBoardProps) {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [level, setLevel] = useState<Level>("MID");
  const [role, setRole] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedToday, setUsedToday] = useState(initialUsed);
  const [filterType, setFilterType] = useState<QuestionType | "ALL">("ALL");

  const remaining = Math.max(0, dailyLimit - usedToday);
  const isLimited = remaining === 0;

  const addSkill = (skill: string) => {
    const s = skill.trim();
    if (!s || skills.includes(s) || skills.length >= 10) return;
    setSkills((prev) => [...prev, s]);
    setSkillInput("");
  };

  const removeSkill = (s: string) => setSkills((prev) => prev.filter((x) => x !== s));

  const handleGenerate = async () => {
    if (skills.length === 0) {
      toast({ title: "Add at least one skill", description: "Type a skill and press Enter.", variant: "destructive" });
      return;
    }
    if (isLimited) {
      toast({ title: "Daily limit reached", description: plan === "FREE" ? "Upgrade to Pro for 25 generations/day." : "Resets at midnight.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setQuestions([]);
    try {
      const res = await fetch("/api/v1/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, level, role: role.trim() || undefined }),
      });

      const json = await res.json() as {
        data?: { questions: Question[]; remaining: number };
        error?: { message: string; code?: string };
      };

      if (!res.ok) {
        if (json.error?.code === "LIMIT_REACHED") {
          setUsedToday(dailyLimit);
          toast({ title: "Daily limit reached", description: json.error.message, variant: "destructive" });
          return;
        }
        throw new Error(json.error?.message ?? "Failed to generate");
      }

      setQuestions(json.data?.questions ?? []);
      setUsedToday((prev) => prev + 1);
      setFilterType("ALL");
      toast({ title: `${json.data?.questions.length ?? 0} questions generated!`, description: `${json.data?.remaining ?? 0} credits remaining today.` });
    } catch (err) {
      toast({ title: "Generation failed", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtered = filterType === "ALL" ? questions : questions.filter((q) => q.type === filterType);

  const typeCounts = questions.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-brand-400" />
            Interview Practice
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-generated questions for your skills — conceptual, scenario, behavioral & coding
          </p>
        </div>
        {plan === "FREE" && (
          <a href="/pricing/upgrade" className="flex items-center gap-1.5 text-xs text-brand-400 border border-brand-500/30 rounded-lg px-3 py-1.5 hover:bg-brand-500/10 transition-colors">
            <Crown className="w-3 h-3" />
            Upgrade for 25/day
          </a>
        )}
      </div>

      {/* Credit bar */}
      <CreditBar plan={plan} dailyLimit={dailyLimit} usedToday={usedToday} remaining={remaining} />

      {/* Input panel */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">

        {/* Skills input */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
            Your Skills <span className="text-muted-foreground/50 font-normal normal-case">(up to 10)</span>
          </label>

          {/* Tag chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map((s) => (
              <span key={s} className="flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/25 text-brand-400 text-xs font-medium px-2.5 py-1 rounded-full">
                {s}
                <button onClick={() => removeSkill(s)} className="hover:text-brand-300 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Text input */}
          <div className="flex gap-2">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(skillInput); }
              }}
              placeholder="Type a skill and press Enter — e.g. Snowflake, Azure, Python…"
              className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
              disabled={skills.length >= 10}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSkill(skillInput)}
              disabled={!skillInput.trim() || skills.length >= 10}
              className="px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Popular skills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {POPULAR_SKILLS.filter((s) => !skills.includes(s)).slice(0, 12).map((s) => (
              <button
                key={s}
                onClick={() => addSkill(s)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border/40 text-muted-foreground hover:border-brand-500/40 hover:text-brand-400 hover:bg-brand-500/5 transition-all"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        {/* Level + Role row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Experience Level</label>
            <div className="flex gap-2">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLevel(opt.value)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-medium border transition-all",
                    level === opt.value
                      ? "bg-brand-500/15 border-brand-500/50 text-brand-400"
                      : "bg-background border-border/50 text-muted-foreground hover:border-brand-500/30 hover:text-foreground"
                  )}
                >
                  <div>{opt.label}</div>
                  <div className="text-[10px] opacity-60">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Target Role <span className="font-normal normal-case opacity-60">(optional)</span>
            </label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Data Engineer, Backend Developer…"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
            />
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={() => void handleGenerate()}
          disabled={loading || isLimited || skills.length === 0}
          className={cn(
            "w-full py-3 font-semibold text-sm transition-all",
            isLimited
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-brand-500 hover:bg-brand-600"
          )}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating with Claude AI…</>
          ) : isLimited ? (
            <><Lock className="w-4 h-4 mr-2" />Daily limit reached — <a href="/pricing/upgrade" className="underline ml-1">Upgrade for more</a></>
          ) : (
            <><Wand2 className="w-4 h-4 mr-2" />Generate {plan === "FREE" ? "5" : "15"} Interview Questions<Sparkles className="w-4 h-4 ml-2 opacity-70" /></>
          )}
        </Button>

        {plan === "FREE" && !isLimited && (
          <p className="text-center text-xs text-muted-foreground">
            Free plan: 5 questions per generation · {remaining} of {dailyLimit} daily credits left ·{" "}
            <a href="/pricing/upgrade" className="text-brand-400 hover:underline">Upgrade for 15 questions &amp; 25/day</a>
          </p>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-card rounded-2xl border border-border/40">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center">
              <Brain className="w-7 h-7 text-brand-400" />
            </div>
            <div className="absolute -inset-1 rounded-2xl border-2 border-brand-500/30 animate-ping" />
          </div>
          <div className="text-center">
            <p className="font-medium">Claude is crafting your questions…</p>
            <p className="text-sm text-muted-foreground mt-1">Tailored for {skills.join(", ")} · {level.toLowerCase()} level · 2026 standards</p>
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map((i) => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-brand-400"
                animate={{ opacity: [0.3,1,0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && questions.length > 0 && (
        <div className="space-y-4">
          {/* Results header + type filters */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold">{questions.length} Questions Generated</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                For: {skills.join(", ")} · {level.toLowerCase()} level{role ? ` · ${role}` : ""}
              </p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterType("ALL")}
                className={cn("text-xs px-3 py-1.5 rounded-lg border transition-all font-medium",
                  filterType === "ALL" ? "bg-brand-500/15 border-brand-500/40 text-brand-400" : "border-border/40 text-muted-foreground hover:border-border"
                )}
              >
                All ({questions.length})
              </button>
              {(Object.keys(TYPE_CONFIG) as QuestionType[]).map((t) => {
                const cfg = TYPE_CONFIG[t];
                const count = typeCounts[t] ?? 0;
                if (!count) return null;
                return (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={cn("text-xs px-3 py-1.5 rounded-lg border transition-all font-medium flex items-center gap-1",
                      filterType === t ? `${cfg.bg} ${cfg.color}` : "border-border/40 text-muted-foreground hover:border-border"
                    )}
                  >
                    <cfg.icon className="w-3 h-3" />
                    {cfg.label} ({count})
                  </button>
                );
              })}
              <button
                onClick={() => void handleGenerate()}
                className="text-xs px-3 py-1.5 rounded-lg border border-border/40 text-muted-foreground hover:border-brand-500/30 hover:text-brand-400 transition-all flex items-center gap-1"
                disabled={isLimited}
              >
                <RotateCcw className="w-3 h-3" />
                Regenerate
              </button>
            </div>
          </div>

          {/* Tip banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-amber-400">Pro tip:</span> Click any question to reveal what interviewers want to hear, follow-up questions, and why they ask it. Practice answering out loud before your interview.
            </p>
          </div>

          {/* Question cards */}
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((q, i) => (
                <QuestionCard key={`${q.question.slice(0, 20)}-${i}`} q={q} index={i} />
              ))}
            </AnimatePresence>
          </div>

          {/* Upgrade CTA for free users */}
          {plan === "FREE" && (
            <a
              href="/pricing/upgrade"
              className="flex items-center justify-center gap-3 p-5 rounded-2xl border border-dashed border-brand-500/30 hover:border-brand-500/60 hover:bg-brand-500/5 transition-all group"
            >
              <Crown className="w-5 h-5 text-brand-400" />
              <div className="text-center">
                <p className="text-sm font-semibold">Upgrade to Pro for 15 questions &amp; 25 daily generations</p>
                <p className="text-xs text-muted-foreground mt-0.5">Plus behavioral deep-dives, system design scenarios, and more</p>
              </div>
              <ArrowRight className="w-4 h-4 text-brand-400 group-hover:translate-x-0.5 transition-transform" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
