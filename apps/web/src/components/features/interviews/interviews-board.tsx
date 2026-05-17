"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mic, Brain, Target, Trophy, Lock, Crown, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const INTERVIEW_TYPES = [
  {
    title: "Behavioral Interview",
    description: "Practice STAR method answers for common behavioral questions",
    icon: Brain,
    difficulty: "Beginner",
    duration: "20–30 min",
    free: true,
    sessionType: "BEHAVIORAL",
  },
  {
    title: "Technical Coding",
    description: "Solve algorithmic problems with AI feedback on your approach",
    icon: Target,
    difficulty: "Intermediate",
    duration: "45–60 min",
    free: false,
    sessionType: "TECHNICAL",
  },
  {
    title: "System Design",
    description: "Design scalable systems and get expert-level feedback",
    icon: Trophy,
    difficulty: "Advanced",
    duration: "45–60 min",
    free: false,
    sessionType: "SYSTEM_DESIGN",
  },
];

interface InterviewsBoardProps {
  plan: "FREE" | "PRO";
  sessionsUsedToday: number;
  dailyLimit: number;
}

export function InterviewsBoard({ plan, sessionsUsedToday, dailyLimit }: InterviewsBoardProps) {
  const router = useRouter();

  // Local state so we can optimistically update on click and refresh on mount
  const [usedToday, setUsedToday] = React.useState(sessionsUsedToday);
  const isPro = plan === "PRO";

  // Fetch live count when the component mounts (covers the "returning from session" case)
  React.useEffect(() => {
    fetch("/api/v1/interviews/sessions")
      .then((r) => r.json())
      .then((json: { data?: { sessionsUsedToday?: number; dailyLimit?: number } }) => {
        if (typeof json.data?.sessionsUsedToday === "number") {
          setUsedToday(json.data.sessionsUsedToday);
        }
      })
      .catch(() => { /* silently fall back to server-rendered prop */ });
  }, []);

  const remaining = Math.max(0, dailyLimit - usedToday);
  const limitReached = remaining === 0;

  const handleStart = (sessionType: string, canStart: boolean) => {
    if (!canStart) return;
    // Optimistic decrement — instantly reflects the session being consumed
    if (!isPro) {
      setUsedToday((prev) => Math.min(dailyLimit, prev + 1));
    }
    router.push(`/interviews/session?type=${sessionType}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Mock Interviews</h1>
          <p className="text-muted-foreground">
            Practice with AI and get real-time coaching on your answers
          </p>
        </div>

        {/* Daily tries pill */}
        {!isPro && (
          <div className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm",
            limitReached
              ? "border-red-500/30 bg-red-500/5"
              : remaining === 1
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-border/60 bg-card"
          )}>
            <div className="flex flex-col items-end">
              <span className={cn(
                "text-xl font-bold tabular-nums leading-none",
                limitReached ? "text-red-400" : remaining === 1 ? "text-amber-400" : "text-foreground"
              )}>
                {remaining}
                <span className="text-sm font-normal text-muted-foreground"> / {dailyLimit}</span>
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">sessions left today</span>
            </div>
            {limitReached && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground border-l border-border/50 pl-3">
                <RefreshCw className="w-3 h-3" />
                Resets at midnight
              </div>
            )}
          </div>
        )}
      </div>

      {/* Limit reached banner */}
      {limitReached && !isPro && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-red-500/25 bg-red-500/5">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-red-400">Daily limit reached</p>
            <p className="text-xs text-muted-foreground">
              You&apos;ve used all {dailyLimit} free sessions for today. Come back tomorrow or upgrade to Pro for unlimited sessions.
            </p>
          </div>
          <a
            href="/pricing/upgrade"
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors"
          >
            <Crown className="w-3.5 h-3.5" />
            Upgrade
          </a>
        </div>
      )}

      {/* Interview type cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {INTERVIEW_TYPES.map((type) => {
          const canStart = type.free && (isPro || !limitReached);
          const showProLock = !type.free;
          const showDailyLock = type.free && limitReached && !isPro;

          return (
            <Card
              key={type.title}
              className={cn(
                "border-border/50 transition-colors",
                canStart ? "hover:border-border" : "opacity-75"
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    canStart ? "bg-brand-500/10" : "bg-muted/50"
                  )}>
                    <type.icon className={cn("w-5 h-5", canStart ? "text-brand-400" : "text-muted-foreground")} />
                  </div>
                  {showProLock && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Lock className="w-2.5 h-2.5 mr-1" />
                      Pro
                    </Badge>
                  )}
                  {showDailyLock && (
                    <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
                      <Lock className="w-2.5 h-2.5 mr-1" />
                      Limit reached
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-3">{type.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{type.description}</p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">{type.difficulty}</Badge>
                  <Badge variant="outline" className="text-xs">{type.duration}</Badge>
                </div>

                <Button
                  className={cn("w-full", canStart ? "bg-brand-500 hover:bg-brand-600" : "")}
                  variant={canStart ? "default" : "outline"}
                  disabled={!canStart}
                  onClick={() => handleStart(type.sessionType, canStart)}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  {showProLock
                    ? "Upgrade to Unlock"
                    : showDailyLock
                    ? "No Sessions Left Today"
                    : "Start Interview"}
                </Button>

                {/* Remaining count under the free card */}
                {type.free && !isPro && !limitReached && (
                  <p className="text-[11px] text-center text-muted-foreground">
                    <span className={cn("font-semibold", remaining === 1 ? "text-amber-400" : "text-foreground")}>
                      {remaining}
                    </span>{" "}
                    free session{remaining !== 1 ? "s" : ""} remaining today
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Sessions placeholder */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Mic className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No interview sessions yet.</p>
            <p className="text-xs mt-1">Start a session above to begin practicing.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
